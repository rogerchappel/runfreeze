import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("../src/cli.js", import.meta.url));

type CliResult = { code: number; stdout: string; stderr: string };

async function runCli(args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, ...args]);
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number | string; stdout?: string; stderr?: string };
    const code = typeof failure.code === "number" ? failure.code : 1;
    return { code, stdout: failure.stdout ?? "", stderr: failure.stderr ?? "" };
  }
}

function assertSingleLineError(result: CliResult, expected: RegExp): void {
  assert.equal(result.code, 1, `expected exit code 1, stderr was: ${result.stderr}`);
  assert.match(result.stderr, expected);
  assert.equal(result.stderr.trim().split("\n").length, 1, `expected one stderr line, got: ${result.stderr}`);
  assert.doesNotMatch(result.stderr, /node:internal/, `stack frame leaked for: ${result.stderr}`);
  assert.doesNotMatch(result.stderr, /^\s+at\s/m, `stack trace leaked for: ${result.stderr}`);
}

describe("runfreeze CLI error handling", () => {
  it("prints a single-line ENOENT error when the report file is missing", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "runfreeze-cli-missing-"));
    const missing = path.join(dir, "missing.json");

    const result = await runCli(["summarize", missing]);

    assertSingleLineError(result, /ENOENT/);
  });

  it("prints a single-line error for a malformed report instead of a SyntaxError stack", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "runfreeze-cli-bad-json-"));
    const bad = path.join(dir, "bad.json");
    await writeFile(bad, "not json\n");

    const result = await runCli(["verify", bad]);

    assertSingleLineError(result, /is not valid JSON/);
  });

  it("prints a single-line error for an invalid config instead of a RunfreezeError stack", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "runfreeze-cli-bad-config-"));
    const config = path.join(dir, "runfreeze.yaml");
    const output = path.join(dir, "runfreeze.json");
    await writeFile(config, "root: .\ncommands:\n  - id: version\n    run: node --version\n");

    const result = await runCli(["record", "--config", config, "--output", output]);

    assertSingleLineError(result, /allow list must include at least one command/);
  });

  it("prints a single-line EEXIST error when init targets an existing file", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "runfreeze-cli-init-"));
    const existing = path.join(dir, "runfreeze.yaml");
    await writeFile(existing, "# already here\n");

    const result = await runCli(["init", "--output", existing]);

    assertSingleLineError(result, /EEXIST/);
  });

  it("keeps the success and verification flow intact", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "runfreeze-cli-ok-"));
    const config = path.join(dir, "runfreeze.yaml");
    const report = path.join(dir, "runfreeze.json");

    const init = await runCli(["init", "--output", config]);
    assert.equal(init.code, 0);
    assert.equal(init.stdout.trim(), `Created ${config}`);

    const recordResult = await runCli(["record", "--config", config, "--output", report]);
    assert.equal(recordResult.code, 0);

    const verify = await runCli(["verify", report]);
    assert.equal(verify.code, 0);
    assert.equal(verify.stdout.trim(), "runfreeze report verified");
  });
});