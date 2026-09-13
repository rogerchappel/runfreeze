import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { loadConfig } from "../src/config.js";
import { RunfreezeError } from "../src/errors.js";
import { DEFAULT_MAX_OUTPUT_BYTES, DEFAULT_REDACTION_PATTERNS, DEFAULT_TIMEOUT_MS } from "../src/defaults.js";

describe("loadConfig", () => {
  it("throws when config file does not exist", async () => {
    await assert.rejects(loadConfig("/nonexistent/path/runfreeze.yaml"));
  });

  it("throws on non-YAML content that parses as a scalar string", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(cfgPath, '"just a plain string"');

    await assert.rejects(
      loadConfig(cfgPath),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("must be a YAML object");
      },
    );
  });

  it("throws when YAML parses to null (empty document)", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(cfgPath, ""); // empty → null

    await assert.rejects(
      loadConfig(cfgPath),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("must be a YAML object");
      },
    );
  });

  it("throws when commands list is missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(cfgPath, `root: /tmp\nallow: [node]\n`);

    await assert.rejects(
      loadConfig(cfgPath),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("at least one command");
      },
    );
  });

  it("throws when commands list is empty", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(cfgPath, `root: /tmp\ncommands: []\n`);

    await assert.rejects(
      loadConfig(cfgPath),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("at least one command");
      },
    );
  });

  it("throws when a command entry is not an object", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(cfgPath, `root: /tmp\ncommands:\n  - "just a string"\n`);

    await assert.rejects(
      loadConfig(cfgPath),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("commands[0] must be an object");
      },
    );
  });

  it("throws when run is missing from a command", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(cfgPath, `root: /tmp\ncommands:\n  - id: cmd1\n`);

    await assert.rejects(
      loadConfig(cfgPath),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("must be a non-empty string");
      },
    );
  });

  it("throws when allow contains non-string entries", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(
      cfgPath,
      `root: /tmp\nallow:\n  - node\n  - null\ncommands:\n  - id: cmd1\n    run: echo hi\n`,
    );

    await assert.rejects(
      loadConfig(cfgPath),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("allow must be a list");
      },
    );
  });

  it("uses defaults for maxOutputBytes and timeoutMs when omitted", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    // No explicit root → defaults to "." which resolves to configDir
    await writeFile(cfgPath, `commands:\n  - id: cmd1\n    run: echo hi\n`);

    const cfg = await loadConfig(cfgPath);
    assert.equal(cfg.maxOutputBytes, DEFAULT_MAX_OUTPUT_BYTES);
    assert.equal(cfg.timeoutMs, DEFAULT_TIMEOUT_MS);
    // root defaults to "." → resolves to config directory
    assert.equal(cfg.root, path.resolve(root));
  });

  it("accepts custom maxOutputBytes and timeoutMs", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(
      cfgPath,
      `root: /tmp\nmaxOutputBytes: 512\ntimeoutMs: 30000\ncommands:\n  - id: cmd1\n    run: echo hi\n`,
    );

    const cfg = await loadConfig(cfgPath);
    assert.equal(cfg.maxOutputBytes, 512);
    assert.equal(cfg.timeoutMs, 30000);
  });

  it("combines default redaction patterns with user-specified ones", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(
      cfgPath,
      `root: /tmp\nredact:\n  - custom_secret\ncommands:\n  - id: cmd1\n    run: echo hi\n`,
    );

    const cfg = await loadConfig(cfgPath);
    assert.ok(cfg.redact?.includes("custom_secret"));
    // Defaults are prepended; user patterns come after
    assert.ok((cfg.redact ?? []).length > DEFAULT_REDACTION_PATTERNS.length);
  });

  it("throws when maxOutputBytes is negative", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(cfgPath, `root: /tmp\nmaxOutputBytes: -100\ncommands:\n  - id: cmd1\n    run: echo hi\n`);

    await assert.rejects(
      loadConfig(cfgPath),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("must be a positive integer");
      },
    );
  });

  it("throws when timeoutMs is zero", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(cfgPath, `root: /tmp\ntimeoutMs: 0\ncommands:\n  - id: cmd1\n    run: echo hi\n`);

    await assert.rejects(
      loadConfig(cfgPath),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("must be a positive integer");
      },
    );
  });

  it("accepts per-command overrides for timeoutMs and maxOutputBytes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(
      cfgPath,
      `root: /tmp
commands:
  - id: fast
    run: echo hi
    timeoutMs: 5000
    maxOutputBytes: 64
`,
    );

    const cfg = await loadConfig(cfgPath);
    const cmd = cfg.commands.at(0)!;
    assert.equal(cmd.timeoutMs, 5000);
    assert.equal(cmd.maxOutputBytes, 64);
  });

  it("validates allowFailure must be boolean", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "runfreeze-"));
    const cfgPath = path.join(root, "runfreeze.yaml");
    await writeFile(
      cfgPath,
      `root: /tmp\ncommands:\n  - id: cmd1\n    run: echo hi\n    allowFailure: maybe\n`,
    );

    await assert.rejects(
      loadConfig(cfgPath),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("must be a boolean");
      },
    );
  });
});
