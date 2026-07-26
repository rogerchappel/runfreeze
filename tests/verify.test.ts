import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { readReport } from "../src/io.js";
import type { RunfreezeReport } from "../src/types.js";
import { validateReport, verifyReport } from "../src/verify.js";

describe("report validation", () => {
  it("accepts a complete, consistent schema-1 report", () => {
    assert.deepEqual(verifyReport(validReport()), { ok: true, errors: [] });
  });

  it("reports missing top-level metadata without throwing", () => {
    const result = verifyReport({ schemaVersion: 1, commands: [] });

    assert.equal(result.ok, false);
    assert.ok(result.errors.includes("tool must be an object"));
    assert.ok(result.errors.includes("root must be a string"));
    assert.ok(result.errors.includes("createdAt must be a valid date string"));
    assert.ok(result.errors.includes("summary must be an object"));
  });

  it("rejects null and wrong-typed nested fields with paths", () => {
    const report = validReport() as unknown as Record<string, unknown>;
    report.tool = null;
    const commands = report.commands as Array<Record<string, unknown>>;
    commands[0]!.stdout = "captured output";

    const result = validateReport(report);

    assert.equal(result.ok, false);
    assert.ok(result.errors.includes("tool must be an object"));
    assert.ok(result.errors.includes("commands[0].stdout must be an object"));
  });

  it("rejects summaries inconsistent with command results", () => {
    const report = validReport();
    report.summary.passed = 0;
    report.summary.failed = 1;
    report.summary.redactions = 2;
    report.summary.truncated = 1;

    const result = validateReport(report);

    assert.deepEqual(result.errors, [
      "summary.passed must be 1 for the recorded commands",
      "summary.failed must be 0 for the recorded commands",
      "summary.redactions must be 0 for the recorded commands",
      "summary.truncated must be 0 for the recorded commands",
    ]);
  });

  it("distinguishes structurally valid failed and timed-out reports", () => {
    const failed = validReport();
    failed.commands[0]!.exitCode = 7;
    failed.summary.passed = 0;
    failed.summary.failed = 1;
    assert.deepEqual(verifyReport(failed).errors, ["test: command failed with exit 7"]);

    const timedOut = validReport();
    timedOut.commands[0]!.exitCode = null;
    timedOut.commands[0]!.signal = "SIGKILL";
    timedOut.commands[0]!.timedOut = true;
    timedOut.summary.passed = 0;
    timedOut.summary.failed = 1;
    assert.deepEqual(verifyReport(timedOut).errors, [
      "test: command failed with exit SIGKILL",
      "test: command timed out",
    ]);
  });

  it("makes readReport reject malformed external JSON with actionable errors", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-invalid-report-"));
    const reportPath = path.join(root, "report.json");
    await writeFile(reportPath, JSON.stringify({ schemaVersion: 1, commands: [] }));

    await assert.rejects(
      readReport(reportPath),
      /Invalid runfreeze report:\n- tool must be an object[\s\S]*- summary must be an object/,
    );
  });
});

function validReport(): RunfreezeReport {
  return {
    schemaVersion: 1,
    tool: { name: "runfreeze", version: "test" },
    root: "/tmp/example",
    createdAt: "2026-07-26T00:00:00.000Z",
    commands: [
      {
        id: "test",
        command: ["node", "--version"],
        cwd: "/tmp/example",
        startedAt: "2026-07-26T00:00:00.000Z",
        endedAt: "2026-07-26T00:00:00.010Z",
        durationMs: 10,
        exitCode: 0,
        signal: null,
        timedOut: false,
        stdout: { text: "v24.0.0\n", bytes: 9, truncated: false },
        stderr: { text: "", bytes: 0, truncated: false },
        redactions: { total: 0, byPattern: {} },
        allowedFailure: false,
      },
    ],
    summary: { total: 1, passed: 1, failed: 0, redactions: 0, truncated: 0 },
  };
}
