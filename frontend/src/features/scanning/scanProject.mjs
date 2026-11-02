export const SCAN_LIMITS = Object.freeze({
  maxFiles: 5000,
  maxFileBytes: 1_000_000,
  maxTotalBytes: 50_000_000,
  maxFindings: 1000,
});
const SOURCE_EXTENSIONS = new Set([
  ".c", ".cc", ".cfg", ".conf", ".cpp", ".cs", ".css", ".env", ".go", ".gradle",
  ".h", ".hpp", ".html", ".ini", ".java", ".js", ".json", ".jsx", ".kt", ".php",
  ".properties", ".py", ".rb", ".rs", ".sh", ".sql", ".svelte", ".tf", ".toml",
  ".ts", ".tsx", ".vue", ".xml", ".yaml", ".yml",
]);
export const SCAN_EXCLUDED_DIRECTORIES = Object.freeze([
  ".git", ".next", ".pytest_cache", ".ruff_cache", ".venv", "artifacts", "build", "coverage",
  "dist", "node_modules", "vendor", "venv", "__pycache__",
]);
const EXCLUDED_DIRECTORIES = new Set(SCAN_EXCLUDED_DIRECTORIES);

const RULES = [
  {
    id: "tls-verification-disabled",
    title: "TLS certificate verification disabled",
    severity: "confirmed",
    expression: /(?:\bverify\s*=\s*False\b|\brejectUnauthorized\s*:\s*false\b|\bNODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0\b)/i,
    detail: "This source line explicitly disables TLS certificate verification. Check whether this is limited to a test fixture.",
  },
  {
    id: "hardcoded-secret-value",
    title: "Possible hard-coded credential",
    severity: "warning",
    expression: /\b(password|passwd|secret|api[_-]?key|access[_-]?token)\b\s*[:=]\s*["'`]([^"'`\s]{8,})["'`]/i,
    detail: "A credential-like variable is assigned a string literal. It may be a placeholder or test value; verify its source and rotate it if real.",
  },
  {
    id: "private-key-marker",
    title: "Private key marker in source",
    severity: "warning",
    expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    detail: "A private-key header appears in a selected file. The scanner does not validate whether the key is real or active.",
  },
  {
    id: "aws-access-key-pattern",
    title: "Possible cloud access key identifier",
    severity: "warning",
    expression: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
    detail: "This matches a common AWS access-key identifier shape. The scanner cannot validate the key or its permissions.",
  },
  {
    id: "dynamic-evaluation",
    title: "Dynamic code evaluation",
    severity: "warning",
    expression: /\beval\s*\(|\bnew\s+Function\s*\(/,
    detail: "Dynamic evaluation is present. Review whether untrusted input can reach it; this pattern alone does not prove exploitability.",
  },
  {
    id: "shell-enabled-subprocess",
    title: "Subprocess shell mode enabled",
    severity: "warning",
    expression: /\b(?:subprocess\.)?(?:run|Popen|call|check_output)\s*\([^\n]*\bshell\s*=\s*True\b/i,
    detail: "A subprocess call enables shell parsing. Review how command arguments are constructed and whether they include untrusted input.",
  },
  {
    id: "unsafe-deserialization",
    title: "Potentially unsafe deserialization",
    severity: "warning",
    expression: /\bpickle\.(?:loads?|Unpickler)\s*\(|\byaml\.unsafe_load\s*\(/,
    detail: "A potentially unsafe deserialization API is present. Only load data from trusted sources.",
  },
  {
    id: "unsafe-html-rendering",
    title: "Raw HTML rendering",
    severity: "warning",
    expression: /\bdangerouslySetInnerHTML\s*=/,
    detail: "Raw HTML is rendered. Confirm the content is sanitized before it reaches this component.",
  },
];

const SECRET_VALUE_PATTERN = /(\b(?:password|passwd|secret|api[_-]?key|access[_-]?token)\b\s*[:=]\s*["'`])([^"'`\s]{8,})(["'`])/i;

function isScannable(path) {
  const parts = path.split(/[\\/]/).filter(Boolean);
  if (parts.some((part) => EXCLUDED_DIRECTORIES.has(part.toLowerCase()))) return false;
  const basename = parts.at(-1) ?? "";
  if (/^dockerfile(?:\..+)?$/i.test(basename)) return true;
  const extension = basename.includes(".") ? `.${basename.split(".").at(-1).toLowerCase()}` : "";
  return SOURCE_EXTENSIONS.has(extension);
}

function redactEvidence(line) {
  return line.replace(SECRET_VALUE_PATTERN, "$1[redacted]$3").trim().slice(0, 240);
}

/** Analyze only the files explicitly selected by the user. No file content is sent over the network. */
export async function scanProject(files) {
  const findings = [];
  let scannedFileCount = 0;
  let skippedFileCount = Math.max(0, files.length - SCAN_LIMITS.maxFiles);
  let totalBytes = 0;
  const selectedFiles = files.slice(0, SCAN_LIMITS.maxFiles);

  for (const file of selectedFiles) {
    const path = file.webkitRelativePath || file.name;
    if (!isScannable(path) || file.size > SCAN_LIMITS.maxFileBytes || totalBytes + file.size > SCAN_LIMITS.maxTotalBytes) {
      skippedFileCount += 1;
      continue;
    }

    let content;
    try {
      content = await file.text();
    } catch {
      skippedFileCount += 1;
      continue;
    }
    if (content.includes("\0")) {
      skippedFileCount += 1;
      continue;
    }

    totalBytes += file.size;
    scannedFileCount += 1;
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length && findings.length < SCAN_LIMITS.maxFindings; index += 1) {
      for (const rule of RULES) {
        if (!rule.expression.test(lines[index])) continue;
        findings.push({
          id: `${path}:${index + 1}:${rule.id}`,
          path,
          line: index + 1,
          rule: rule.id,
          title: rule.title,
          severity: rule.severity,
          detail: rule.detail,
          evidence: redactEvidence(lines[index]),
        });
      }
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    scannedFileCount,
    skippedFileCount,
    findings,
    limits: SCAN_LIMITS,
  };
}
