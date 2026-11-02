import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@clerk/react";
import { ExternalLink, FolderSearch, Globe2, ShieldAlert, ShieldCheck } from "lucide-react";

import { apiRequest } from "@/services/api/client";
import { scanProject, type ScanResult } from "./scanProject.mjs";

export type ProjectScannerHandle = { startScan: () => void };

type ProjectScannerProps = {
  onScanningChange: (scanning: boolean) => void;
};

const ProjectScanner = forwardRef<ProjectScannerHandle, ProjectScannerProps>(function ProjectScanner(
  { onScanningChange },
  ref,
) {
  const { getToken, isSignedIn } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [status, setStatus] = useState("Select authorized project files. Chromium browsers can choose a folder.");
  const [isScanning, setIsScanning] = useState(false);
  const confirmedCount = result?.findings.filter((finding) => finding.severity === "confirmed").length ?? 0;
  const warningCount = result?.findings.filter((finding) => finding.severity === "warning").length ?? 0;

  useEffect(() => {
    inputRef.current?.setAttribute("webkitdirectory", "");
    inputRef.current?.setAttribute("directory", "");
  }, []);

  const startScan = () => {
    if (isScanning) return;
    setResult(null);
    setStatus("Choose the project folder to scan. Previous results have been cleared.");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const scanUrl = async () => {
    if (isScanning) return;
    let target: URL;
    try {
      target = new URL(url.trim());
      if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error();
      if (target.username || target.password) throw new Error();
    } catch {
      setResult(null);
      setStatus("Enter a valid public http:// or https:// website URL.");
      return;
    }

    setResult(null);
    setIsScanning(true);
    onScanningChange(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setStatus("Fetching the public page through the API…");
    try {
      if (!isSignedIn) throw new Error("Sign in with Clerk to scan a website URL.");
      const token = await getToken();
      if (!token) throw new Error("Your Clerk session token is unavailable. Sign in again and retry.");
      const page = await apiRequest<{ html: string; url: string; status: number }>("/scan-url", {
        method: "POST",
        body: JSON.stringify({ url: target.href }),
        signal: controller.signal,
      }, token);
      const html = page.html;
      const freshResult = await scanProject([{ name: "website.html", size: new Blob([html]).size, text: async () => html }]);
      setResult(freshResult);
      setStatus(`Page scan completed (HTTP ${page.status}) for ${page.url || target.href}.`);
    } catch (error) {
      setResult(null);
      const message = error instanceof Error ? error.message : "Could not fetch that website.";
      setStatus(controller.signal.aborted ? "Page request timed out after 15 seconds." : `Page scan failed: ${message}`);
    } finally {
      window.clearTimeout(timeout);
      setIsScanning(false);
      onScanningChange(false);
    }
  };

  useImperativeHandle(ref, () => ({ startScan }), [isScanning]);

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      setStatus("No files selected; no scan was run.");
      return;
    }

    setIsScanning(true);
    onScanningChange(true);
    setStatus("Reading selected files locally and checking source patterns…");
    try {
      const freshResult = await scanProject(files);
      setResult(freshResult);
      setStatus(`Scan completed from this folder selection at ${new Date(freshResult.scannedAt).toLocaleString()}.`);
    } catch (error) {
      setResult(null);
      setStatus(error instanceof Error ? `Scan failed: ${error.message}` : "Scan failed while reading the selected files.");
    } finally {
      setIsScanning(false);
      onScanningChange(false);
      input.value = "";
    }
  };

  return (
    <section className="panel project-scanner" aria-labelledby="project-scan-title" aria-live="polite">
      <div className="project-scanner-heading">
        <div>
          <div className="panel-kicker"><span className="signal-bar" />Local source scan</div>
          <h2 id="project-scan-title">Analyze an authorized project</h2>
          <p>Choose a folder or source files on this device. Files are read and analyzed in your browser; contents are not uploaded.</p>
        </div>
        <button className="primary-button" type="button" onClick={startScan} disabled={isScanning}>
          <FolderSearch size={16} />{isScanning ? "Scanning…" : "Choose folder and scan"}
        </button>
      </div>
      <form className="scanner-url-form" onSubmit={(event) => { event.preventDefault(); void scanUrl(); }}>
        <label htmlFor="scanner-url"><Globe2 size={15} /> Scan a public website URL</label>
        <div className="scanner-url-controls">
          <input
            id="scanner-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={isScanning}
          />
          <button className="primary-button" type="submit" disabled={isScanning || !url.trim()}>
            <ExternalLink size={15} />{isScanning ? "Scanning…" : "Scan URL"}
          </button>
        </div>
        <p>Checks the publicly served HTML through the API, so the site does not need browser CORS access. Sign in to use this feature. It does not inspect private pages, server code, or the full JavaScript app.</p>
      </form>
      <p className="scanner-status" role="status">{status}</p>

      {result && (
        <>
          <div className="scanner-summary">
            <span><ShieldCheck size={15} />{confirmedCount} confirmed unsafe pattern{confirmedCount === 1 ? "" : "s"}</span>
            <span><ShieldAlert size={15} />{warningCount} warning{warningCount === 1 ? "" : "s"}</span>
            <span>{result.scannedFileCount} files analyzed</span>
            {result.skippedFileCount > 0 && <span>{result.skippedFileCount} files skipped</span>}
          </div>
          <p className="scanner-disclaimer">“Confirmed” means the exact insecure setting was present in the selected source. Warnings are heuristic matches and need review. This is a lightweight source-pattern scan, not a dependency audit or proof of exploitability. Limits: {result.limits.maxFiles} files, {Math.round(result.limits.maxFileBytes / 1000)} KB per file, {Math.round(result.limits.maxTotalBytes / 1_000_000)} MB total, {result.limits.maxFindings} findings.</p>
          {result.findings.length > 0 ? (
            <ul className="scanner-findings">
              {result.findings.map((finding) => (
                <li key={finding.id}>
                  <div className="scanner-finding-title">
                    <strong>{finding.title}</strong>
                    <span className={finding.severity === "confirmed" ? "scanner-tag confirmed" : "scanner-tag warning"}>
                      {finding.severity === "confirmed" ? "Confirmed pattern" : "Review warning"}
                    </span>
                  </div>
                  <code>{finding.path}:{finding.line}</code>
                  {finding.evidence && <pre>{finding.evidence}</pre>}
                  <p>{finding.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="scanner-empty">No configured patterns matched the analyzed files. This does not establish that the project is free of security issues.</div>
          )}
        </>
      )}

      <input
        ref={inputRef}
        className="scanner-file-input"
        type="file"
        multiple
        onChange={handleFilesSelected}
        aria-label="Choose authorized project folder"
      />
    </section>
  );
});

export default ProjectScanner;
