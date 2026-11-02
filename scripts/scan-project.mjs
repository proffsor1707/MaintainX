import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { scanProject } from "../frontend/src/features/scanning/scanProject.mjs";

const excludedDirectories = new Set([
  ".git", ".next", ".pytest_cache", ".ruff_cache", ".venv", "__pycache__", "artifacts", "build",
  "coverage", "dist", "node_modules", "vendor", "venv",
]);

async function collectFiles(root, current = root) {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES" || error?.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name.toLowerCase())) files.push(...await collectFiles(root, absolutePath));
    } else if (entry.isFile()) {
      const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
      const fileStat = await stat(absolutePath);
      files.push({
        name: entry.name,
        webkitRelativePath: relativePath,
        size: fileStat.size,
        async text() { return await readFile(absolutePath, "utf8"); },
      });
    }
  }
  return files;
}

async function main() {
  const requestedRoot = process.argv[2];
  if (!requestedRoot) throw new Error("Usage: node scripts/scan-project.mjs <authorized-project-directory>");
  const root = await realpath(path.resolve(requestedRoot));
  if (!(await stat(root)).isDirectory()) throw new Error("The scan target must be a directory.");

  const files = await collectFiles(root);
  const result = await scanProject(files);
  const summary = {
    target: root,
    scannedAt: result.scannedAt,
    scannedFileCount: result.scannedFileCount,
    skippedFileCount: result.skippedFileCount,
    confirmedUnsafePatterns: result.findings.filter((finding) => finding.severity === "confirmed").length,
    warnings: result.findings.filter((finding) => finding.severity === "warning").length,
    findings: result.findings.map(({ path: findingPath, line, severity, title, detail }) => ({
      path: findingPath, line, severity, title, detail,
    })),
    limits: result.limits,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
