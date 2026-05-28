import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { loadConfig } from "../src/config.js";
import { renderMarkdown } from "../src/markdown.js";
import { record } from "../src/runner.js";
import { verifyReport } from "../src/verify.js";

describe("runfreeze", () => {
  it("records stdout, stderr, failures, truncation, and redactions", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const configPath = path.join(root, "runfreeze.yaml");
    await mkdir(path.join(root, "scripts"));
    await writeFile(
      path.join(root, "scripts", "fixture.mjs"),
      "console.log('token=supersecret'); console.error('warn'); process.exit(3);\n",
    );
    await writeFile(
      configPath,
      `root: .
allow: [node]
maxOutputBytes: 12
timeoutMs: 10000
commands:
  - id: failing
    run: node scripts/fixture.mjs
    allowFailure: true
`,
    );

    const report = await record(await loadConfig(configPath), "test");

    assert.equal(report.summary.total, 1);
    assert.equal(report.summary.failed, 0);
    assert.equal(report.summary.truncated, 1);
    assert.equal(report.commands[0]?.stderr.text, "warn\n");
    assert.equal(report.commands[0]?.stdout.text.includes("supersecret"), false);
    assert.equal(renderMarkdown(report).includes("# Runfreeze Evidence"), true);
    assert.equal(verifyReport(report).ok, true);
  });

  it("records spawn errors as failed command evidence", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const configPath = path.join(root, "runfreeze.yaml");
    await writeFile(
      configPath,
      `root: .
allow: [missing-runfreeze-fixture]
commands:
  - id: missing
    run: missing-runfreeze-fixture --version
`,
    );

    const report = await record(await loadConfig(configPath), "test");

    assert.equal(report.summary.failed, 1);
    assert.notEqual(report.commands[0]?.exitCode, 0);
    assert.equal(report.commands[0]?.stderr.text.includes("ENOENT"), true);
    assert.equal(verifyReport(report).ok, false);
  });

  it("reports malformed evidence instead of throwing", () => {
    assert.deepEqual(verifyReport(null), {
      ok: false,
      errors: ["report must be an object"],
    });

    const result = verifyReport({ schemaVersion: 1, commands: [null] });
    assert.equal(result.ok, false);
    assert.equal(result.errors.includes("command must be an object"), true);
  });
});
