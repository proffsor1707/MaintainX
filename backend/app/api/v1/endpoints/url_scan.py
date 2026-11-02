import ipaddress
import socket
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

router = APIRouter()
MAX_PAGE_BYTES = 2_000_000


class UrlScanRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


def _validate_public_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Enter a valid public http:// or https:// URL.")

    hostname = parsed.hostname.rstrip(".").lower()
    if hostname == "localhost" or hostname.endswith((".localhost", ".local")):
        raise ValueError("Local and private network addresses cannot be scanned.")

    try:
        addresses = {ipaddress.ip_address(hostname)}
    except ValueError:
        try:
            addresses = {
                ipaddress.ip_address(item[4][0])
                for item in socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
            }
        except (OSError, ValueError) as error:
            raise ValueError("The website hostname could not be resolved.") from error
    if not addresses or any(not address.is_global for address in addresses):
        raise ValueError("Local and private network addresses cannot be scanned.")
    return value


def _download_page(url: str) -> dict[str, str | int]:
    class SafeRedirectHandler(HTTPRedirectHandler):
        redirects = 0

        def redirect_request(self, req, fp, code, msg, headers, newurl):
            self.redirects += 1
            if self.redirects > 4:
                raise ValueError("The page redirected too many times.")
            safe_url = _validate_public_url(urljoin(req.full_url, newurl))
            return super().redirect_request(req, fp, code, msg, headers, safe_url)

    safe_url = _validate_public_url(url)
    opener = build_opener(ProxyHandler({}), SafeRedirectHandler())
    request = Request(safe_url, headers={"User-Agent": "MaintainX-Page-Scanner/1.0", "Accept": "text/html,application/xhtml+xml"})
    with opener.open(request, timeout=12) as response:
        content_type = response.headers.get("Content-Type", "")
        if content_type and "html" not in content_type.lower():
            raise ValueError("That URL did not return an HTML page.")
        declared_length = response.headers.get("Content-Length")
        if declared_length:
            try:
                content_length = int(declared_length)
            except ValueError:
                content_length = 0
            if content_length > MAX_PAGE_BYTES:
                raise ValueError("The page exceeds the 2 MB scan limit.")
        body = response.read(MAX_PAGE_BYTES + 1)
        if len(body) > MAX_PAGE_BYTES:
            raise ValueError("The page exceeds the 2 MB scan limit.")
        html = body.decode(response.headers.get_content_charset() or "utf-8", errors="replace")
        return {"html": html, "url": response.geturl(), "status": response.status}


@router.post("/scan-url")
async def scan_url(request: UrlScanRequest) -> dict[str, str | int]:
    try:
        return await run_in_threadpool(_download_page, request.url)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except HTTPError as error:
        raise HTTPException(status_code=502, detail=f"The website returned HTTP {error.code}.") from error
    except (URLError, TimeoutError, socket.timeout) as error:
        raise HTTPException(status_code=502, detail="Could not fetch the website. Check its address and try again.") from error
