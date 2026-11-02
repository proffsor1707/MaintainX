export type ScanSeverity = "confirmed" | "warning";

export type ScanFinding = {
  id: string;
  path: string;
  line: number;
  rule: string;
  title: string;
  severity: ScanSeverity;
  detail: string;
  evidence: string;
};

export type ScanResult = {
  scannedAt: string;
  scannedFileCount: number;
  skippedFileCount: number;
  findings: ScanFinding[];
  limits: { maxFiles: number; maxFileBytes: number; maxTotalBytes: number; maxFindings: number };
};

export type ScanFile = Pick<File, "name" | "size" | "text"> & { webkitRelativePath?: string };

export const SCAN_LIMITS: Readonly<{
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  maxFindings: number;
}>;
export const SCAN_EXCLUDED_DIRECTORIES: readonly string[];

export function scanProject(files: readonly ScanFile[]): Promise<ScanResult>;
