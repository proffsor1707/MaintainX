import assert from "node:assert/strict";
import test from "node:test";

import { scanProject } from "./scanProject.mjs";

function file(path, content) {
  return {
    name: path.split(/[\\/]/).at(-1),
    webkitRelativePath: path,
    size: Buffer.byteLength(content),
    async text() { return content; },
  };
}

test("detects explicit TLS verification disablement as a confirmed pattern", async () => {
  const result = await scanProject([file("project/client.py", "requests.get(url, verify=False)\n")]);
  assert.equal(result.scannedFileCount, 1);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].severity, "confirmed");
  assert.equal(result.findings[0].line, 1);
});

test("reports credential-like literals as warnings and redacts the value", async () => {
  const result = await scanProject([file("project/config.ts", 'const api_key = "local-secret-value-123";\n')]);
  assert.equal(result.findings[0].severity, "warning");
  assert.match(result.findings[0].evidence, /\[redacted\]/);
  assert.doesNotMatch(JSON.stringify(result), /local-secret-value-123/);
});

test("skips dependency folders and unsupported files", async () => {
  const result = await scanProject([
    file("project/node_modules/pkg/index.js", "eval(input)"),
    file("project/image.png", "binary"),
    file("project/src/app.js", "const ok = true;"),
  ]);
  assert.equal(result.scannedFileCount, 1);
  assert.equal(result.skippedFileCount, 2);
  assert.deepEqual(result.findings, []);
});

test("reads the selected files afresh on every invocation", async () => {
  let currentContents = "const safe = true;";
  let reads = 0;
  const selectedFile = {
    name: "current.js",
    webkitRelativePath: "project/current.js",
    get size() { return Buffer.byteLength(currentContents); },
    async text() { reads += 1; return currentContents; },
  };

  const first = await scanProject([selectedFile]);
  currentContents = "eval(userInput);";
  const second = await scanProject([selectedFile]);

  assert.equal(reads, 2);
  assert.equal(first.findings.length, 0);
  assert.equal(second.findings[0].rule, "dynamic-evaluation");
});
