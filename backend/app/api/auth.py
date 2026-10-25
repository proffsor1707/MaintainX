from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient, PyJWKClientConnectionError, PyJWKClientError

from app.core.config import get_settings

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    subject: str


@lru_cache(maxsize=4)
def _get_jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url, cache_keys=True, timeout=5)


def require_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    if not settings.clerk_jwks_url.strip() or not settings.clerk_issuer.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication verification is not configured.",
        )

    token = credentials.credentials
    try:
        signing_key = _get_jwks_client(settings.clerk_jwks_url.strip()).get_signing_key_from_jwt(token)
    except PyJWKClientConnectionError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication verification is temporarily unavailable.",
        ) from error
    except PyJWKClientError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    try:
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer.strip(),
            options={"require": ["exp", "iat", "iss", "sub"], "verify_aud": False},
        )
    except jwt.InvalidTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid bearer token.")
    return AuthenticatedUser(subject=subject)