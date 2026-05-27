import { RunfreezeError } from "./errors.js";
import type { RedactionSummary, StreamCapture } from "./types.js";

export type RedactionResult = {
  stdout: StreamCapture;
  stderr: StreamCapture;
  summary: RedactionSummary;
};

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

  const redactedStdout = { ...stdout, text: redactText(stdout.text) };
  const redactedStderr = { ...stderr, text: redactText(stderr.text) };
  const total = Object.values(byPattern).reduce((sum, count) => sum + count, 0);

  return {
    stdout: redactedStdout,
    stderr: redactedStderr,
    summary: { total, byPattern },
  };
}

function compilePattern(pattern: string): { label: string; regex: RegExp } {
  try {
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
