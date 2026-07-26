import type { RecordedCommand, RunfreezeReport } from "./types.js";

export type VerifyResult = {
  ok: boolean;
  errors: string[];
};

export function validateReport(report: unknown): VerifyResult {
  const errors: string[] = [];
  if (!isRecord(report)) return { ok: false, errors: ["report must be an object"] };

  exact(report.schemaVersion, 1, "schemaVersion", errors);
  validateTool(report.tool, errors);
  string(report.root, "root", errors);
  dateString(report.createdAt, "createdAt", errors);

  const commands = report.commands;
  if (!Array.isArray(commands)) {
    errors.push("commands must be an array");
  } else {
    commands.forEach((command, index) => validateCommand(command, `commands[${index}]`, errors));
  }

  validateSummary(report.summary, Array.isArray(commands) ? commands : undefined, errors);
  return { ok: errors.length === 0, errors };
}

export function verifyReport(report: unknown): VerifyResult {
  const result = validateReport(report);
  if (!result.ok) return result;

  const validReport = report as RunfreezeReport;
  const errors: string[] = [];
  for (const command of validReport.commands) {
    if (!command.allowedFailure && command.exitCode !== 0) {
      errors.push(`${command.id}: command failed with exit ${command.exitCode ?? command.signal ?? "null"}`);
    }
    if (command.timedOut) errors.push(`${command.id}: command timed out`);
  }
  return { ok: errors.length === 0, errors };
}

function validateTool(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("tool must be an object");
    return;
  }
  exact(value.name, "runfreeze", "tool.name", errors);
  string(value.version, "tool.version", errors);
}

function validateCommand(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  nonEmptyString(value.id, `${path}.id`, errors);
  if (!Array.isArray(value.command) || value.command.length === 0) {
    errors.push(`${path}.command must be a non-empty array`);
  } else {
    value.command.forEach((part, index) => string(part, `${path}.command[${index}]`, errors));
  }
  string(value.cwd, `${path}.cwd`, errors);
  dateString(value.startedAt, `${path}.startedAt`, errors);
  dateString(value.endedAt, `${path}.endedAt`, errors);
  nonNegativeInteger(value.durationMs, `${path}.durationMs`, errors);
  nullableInteger(value.exitCode, `${path}.exitCode`, errors);
  nullableString(value.signal, `${path}.signal`, errors);
  boolean(value.timedOut, `${path}.timedOut`, errors);
  validateStream(value.stdout, `${path}.stdout`, errors);
  validateStream(value.stderr, `${path}.stderr`, errors);
  validateRedactions(value.redactions, `${path}.redactions`, errors);
  boolean(value.allowedFailure, `${path}.allowedFailure`, errors);
}

function validateStream(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  string(value.text, `${path}.text`, errors);
  nonNegativeInteger(value.bytes, `${path}.bytes`, errors);
  boolean(value.truncated, `${path}.truncated`, errors);
}

function validateRedactions(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  nonNegativeInteger(value.total, `${path}.total`, errors);
  if (!isRecord(value.byPattern)) {
    errors.push(`${path}.byPattern must be an object`);
    return;
  }
  for (const [pattern, count] of Object.entries(value.byPattern)) {
    nonNegativeInteger(count, `${path}.byPattern[${JSON.stringify(pattern)}]`, errors);
  }
  if (
    isNonNegativeInteger(value.total) &&
    Object.values(value.byPattern).every(isNonNegativeInteger) &&
    Object.values(value.byPattern).reduce<number>((sum, count) => sum + (count as number), 0) !== value.total
  ) {
    errors.push(`${path}.total must equal the sum of byPattern counts`);
  }
}

function validateSummary(value: unknown, commands: unknown[] | undefined, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("summary must be an object");
    return;
  }
  for (const field of ["total", "passed", "failed", "redactions", "truncated"] as const) {
    nonNegativeInteger(value[field], `summary.${field}`, errors);
  }
  if (!commands || !commands.every(isRecordedCommandShape)) return;

  const failed = commands.filter((command) => !command.allowedFailure && command.exitCode !== 0).length;
  const expected = {
    total: commands.length,
    passed: commands.length - failed,
    failed,
    redactions: commands.reduce((sum, command) => sum + command.redactions.total, 0),
    truncated: commands.filter((command) => command.stdout.truncated || command.stderr.truncated).length,
  };
  for (const field of Object.keys(expected) as Array<keyof typeof expected>) {
    if (value[field] !== expected[field]) {
      errors.push(`summary.${field} must be ${expected[field]} for the recorded commands`);
    }
  }
}

function isRecordedCommandShape(value: unknown): value is RecordedCommand {
  return (
    isRecord(value) &&
    typeof value.allowedFailure === "boolean" &&
    (typeof value.exitCode === "number" || value.exitCode === null) &&
    isRecord(value.redactions) &&
    isNonNegativeInteger(value.redactions.total) &&
    isRecord(value.stdout) &&
    typeof value.stdout.truncated === "boolean" &&
    isRecord(value.stderr) &&
    typeof value.stderr.truncated === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: unknown, expected: unknown, path: string, errors: string[]): void {
  if (value !== expected) errors.push(`${path} must be ${JSON.stringify(expected)}`);
}

function string(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "string") errors.push(`${path} must be a string`);
}

function nonEmptyString(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "string" || value.length === 0) errors.push(`${path} must be a non-empty string`);
}

function dateString(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    errors.push(`${path} must be a valid date string`);
  }
}

function boolean(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "boolean") errors.push(`${path} must be a boolean`);
}

function nullableInteger(value: unknown, path: string, errors: string[]): void {
  if (value !== null && !Number.isInteger(value)) errors.push(`${path} must be an integer or null`);
}

function nullableString(value: unknown, path: string, errors: string[]): void {
  if (value !== null && typeof value !== "string") errors.push(`${path} must be a string or null`);
}

function nonNegativeInteger(value: unknown, path: string, errors: string[]): void {
  if (!isNonNegativeInteger(value)) errors.push(`${path} must be a non-negative integer`);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}
