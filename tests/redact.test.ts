import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redactStreams } from "../src/redact.js";
import { RunfreezeError } from "../src/errors.js";
import type { StreamCapture } from "../src/types.js";

const capture = (text: string): StreamCapture => ({
  text,
  bytes: Buffer.byteLength(text),
  truncated: false,
});

describe("redactStreams", () => {
  it("redacts matching patterns in stdout", () => {
    const result = redactStreams(capture("token=abc123 secret=xyz"), capture(""), ["abc123"]);

    assert.equal(result.stdout.text, "token=[REDACTED] secret=xyz");
    assert.equal(result.stderr.text, "");
    assert.equal(result.summary.total, 1);
    assert.equal(result.summary.byPattern["abc123"], 1);
  });

  it("redacts matching patterns in stderr too", () => {
    const result = redactStreams(
      capture("clean output"),
      capture("password=s3cret leaked"),
      ["s3cret"],
    );

    assert.equal(result.stdout.text, "clean output");
    assert.equal(result.stderr.text, "password=[REDACTED] leaked");
    assert.equal(result.summary.total, 1);
  });

  it("handles multiple distinct patterns", () => {
    const result = redactStreams(capture("key=k1 val=v1"), capture(""), ["k1", "v1"]);

    assert.equal(result.stdout.text, "key=[REDACTED] val=[REDACTED]");
    assert.equal(result.summary.total, 2);
    assert.equal(result.summary.byPattern["k1"], 1);
    assert.equal(result.summary.byPattern["v1"], 1);
  });

  it("handles repeated occurrences of the same pattern", () => {
    const result = redactStreams(capture("a=a a=a a=a"), capture(""), ["a"]);

    assert.equal(result.stdout.text, "[REDACTED]=[REDACTED] [REDACTED]=[REDACTED] [REDACTED]=[REDACTED]");
    assert.equal(result.summary.total, 6);
    assert.equal(result.summary.byPattern["a"], 6);
  });

  it("returns unmodified text when no patterns match", () => {
    const orig = "completely normal log line\nno secrets here";
    const result = redactStreams(capture(orig), capture(""), ["nonexistent"]);

    assert.equal(result.stdout.text, orig);
    assert.equal(result.stderr.text, "");
    assert.equal(result.summary.total, 0);
  });

  it("preserves bytes and truncated fields in returned captures", () => {
    const before = capture("hello world"); // 11 bytes
    const result = redactStreams(before, before, []);

    assert.equal(result.stdout.bytes, 11);
    assert.equal(result.stdout.truncated, false);
    assert.equal(result.stderr.bytes, 11);
    assert.equal(result.stderr.truncated, false);
  });
});

describe("compilePattern — (?i) flag handling", () => {
  it("strips (?i) prefix and performs case-insensitive match", () => {
    const result = redactStreams(
      capture("TOKEN=mysecret SECRET=MYSECRET SUPER=MYSecRet"),
      capture(""),
      ["(?i)mysecret"],
    );

    // (?i) makes the pattern "mysecret" match in any case.
    assert.equal(result.stdout.text, "TOKEN=[REDACTED] SECRET=[REDACTED] SUPER=[REDACTED]");
    assert.equal(result.summary.total, 3);
  });

  it("(?i) does not affect surrounding literals beyond the pattern", () => {
    const result = redactStreams(
      capture("theMixup was mixed up byMIXUP"),
      capture(""),
      ["(?i)mixup"],
    );

    // Only exact substrings matching 'mixup' (case-insensitive) are redacted.
    // "theMixup" and "byMIXUP" match; "mixed" does not contain "mixup".
    assert.equal(result.stdout.text, "the[REDACTED] was mixed up by[REDACTED]");
    assert.equal(result.summary.total, 2);
  });
});

describe("compilePattern — invalid regex errors", () => {
  it("throws RunfreezeError on unterminated bracket", () => {
    assert.throws(
      () => redactStreams(capture(""), capture(""), ["[invalid"]),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("Invalid redaction regex") && err.message.includes("[invalid");
      },
    );
  });

  it("throws RunfreezeError on mismatched parentheses in (?i) form", () => {
    assert.throws(
      () => redactStreams(capture(""), capture(""), ["(?i)(unclosed"]),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("Invalid redaction regex");
      },
    );
  });

  it("throws RunfreezeError for invalid quantifier", () => {
    assert.throws(
      () => redactStreams(capture(""), capture(""), ["a*+b"]),
      (err: unknown) => {
        assert.ok(err instanceof RunfreezeError);
        return err.message.includes("Invalid redaction regex");
      },
    );
  });
});
