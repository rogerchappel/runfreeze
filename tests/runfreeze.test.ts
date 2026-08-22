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

  it("renders collision-safe Markdown for captured text and metadata", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-markdown-"));
    const configPath = path.join(root, "runfreeze.yaml");
    await writeFile(
      configPath,
      `root: .
allow: [node]
commands:
  - id: safe
    run: node --version
`,
    );
    const report = await record(await loadConfig(configPath), "test");
    const command = report.commands[0]!;
    report.root = "root `with` markers";
    command.id = "# heading | table";
    command.command = ["tool", "arg|value", "has```ticks"];
    command.cwd = "cwd `quoted`";
    command.stdout.text = "before\n```\nafter\n````";
    command.stderr.text = "# not a heading\n| not | a table |";

    const markdown = renderMarkdown(report);

    assert.match(markdown, /Root: ``root `with` markers``/);
    assert.match(markdown, /\| # heading &#124; table \| ````tool arg&#124;value has```ticks```` \|/);
    assert.match(markdown, /^## `# heading \| table`$/m);
    assert.match(markdown, /^- CWD: `` cwd `quoted` ``$/m);
    assert.match(markdown, /`````text\nbefore\n```\nafter\n````\n`````/);
    assert.match(markdown, /```text\n# not a heading\n\| not \| a table \|\n```/);
  });

  it("records executable launch errors and continues with later commands", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-spawn-error-"));
    const configPath = path.join(root, "runfreeze.yaml");
    const missingExecutable = "runfreeze-definitely-not-installed";
    await writeFile(
      configPath,
      `root: .
allow: [${missingExecutable}, node]
maxOutputBytes: 65536
timeoutMs: 10000
commands:
  - id: missing
    run: ${missingExecutable}
  - id: subsequent
    run: node --version
`,
    );

    const report = await record(await loadConfig(configPath), "test");
    const missing = report.commands[0];
    const subsequent = report.commands[1];

    assert.equal(report.summary.total, 2);
    assert.equal(report.summary.failed, 1);
    assert.equal(missing?.exitCode, 1);
    assert.equal(missing?.signal, null);
    assert.equal(missing?.timedOut, false);
    assert.match(missing?.stderr.text ?? "", /Failed to start command: .*ENOENT/);
    assert.equal(subsequent?.exitCode, 0);
    assert.match(subsequent?.stdout.text ?? "", /^v\d+/);
    assert.equal(verifyReport(report).ok, false);
  });

  it("force-terminates a command that ignores SIGTERM after the timeout grace period", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-timeout-"));
    const configPath = path.join(root, "runfreeze.yaml");
    await writeFile(
      path.join(root, "ignore-term.mjs"),
      [
        "process.on('SIGTERM', () => {});",
        // Emitting READY after handler registration makes fixture startup observable. The
        // timeout deliberately leaves enough room for READY on supported CI platforms;
        // shortening it can race Node startup and test SIGTERM instead of escalation.
        "console.log('READY');",
        // Keep the suite bounded even if timeout escalation regresses.
        "setTimeout(() => process.exit(99), 5000);",
      ].join("\n"),
    );
    await writeFile(
      configPath,
      `root: .
allow: [node]
timeoutMs: 1000
commands:
  - id: ignores-term
    run: node ignore-term.mjs
`,
    );

    const report = await record(await loadConfig(configPath), "test");
    const command = report.commands[0];

    assert.equal(command?.timedOut, true);
    assert.equal(command?.stdout.text, "READY\n");
    assert.equal(command?.signal, "SIGKILL");
    assert.equal(command?.exitCode, null);
    assert.ok(command.durationMs < 3_000, `command took ${command.durationMs}ms`);
    assert.deepEqual(verifyReport(report).errors, [
      "ignores-term: command failed with exit SIGKILL",
      "ignores-term: command timed out",
    ]);
  });
});
