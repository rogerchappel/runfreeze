import { RunfreezeError } from "./errors.js";
import type { RedactionSummary, StreamCapture } from "./types.js";

export type RedactionResult = {
  stdout: StreamCapture;
  stderr: StreamCapture;
  summary: RedactionSummary;
};

const MAX_PATTERN_LENGTH = 256;

function hasUnsafeRepetition(pattern: string): boolean {
  // Nested repetition and quantified alternation can cause exponential backtracking.
  return /\([^)]*(?:[*+{]|\|)[^)]*\)[*+{]/u.test(pattern);
}

export function redactStreams(
  stdout: StreamCapture,
  stderr: StreamCapture,
  patterns: string[],
): RedactionResult {
  const compiled = patterns.map((pattern) => compilePattern(pattern));
  const byPattern: Record<string, number> = {};

  const redactText = (text: string): string => {
    let output = text;
    for (const item of compiled) {
      output = output.replace(item.regex, () => {
        byPattern[item.label] = (byPattern[item.label] ?? 0) + 1;
        return "[REDACTED]";
      });
    }
    return output;
  };

  const redactCapture = (capture: StreamCapture): StreamCapture => {
    const text = redactText(capture.text);
    return { ...capture, text, bytes: Buffer.byteLength(text, "utf8") };
  };

  const redactedStdout = redactCapture(stdout);
  const redactedStderr = redactCapture(stderr);
  const total = Object.values(byPattern).reduce((sum, count) => sum + count, 0);

  return {
    stdout: redactedStdout,
    stderr: redactedStderr,
    summary: { total, byPattern },
  };
}

function compilePattern(pattern: string): { label: string; regex: RegExp } {
  try {
    const source = pattern.startsWith("(?i)") ? pattern.slice(4) : pattern;
    if (source.length > MAX_PATTERN_LENGTH || hasUnsafeRepetition(source)) {
      throw new Error(`pattern exceeds safe limits (maximum ${MAX_PATTERN_LENGTH} characters; nested repetition is unsupported)`);
    }
    if (pattern.startsWith("(?i)")) {
      return {
        label: pattern,
        regex: new RegExp(pattern.slice(4), "giu"),
      };
    }
    return {
      label: pattern,
      regex: new RegExp(pattern, "gu"),
    };
  } catch (error) {
    throw new RunfreezeError(
      `Invalid redaction regex ${JSON.stringify(pattern)}: ${(error as Error).message}`,
      "REDACTION_INVALID",
    );
  }
}
