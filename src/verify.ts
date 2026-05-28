export type VerifyResult = {
  ok: boolean;
  errors: string[];
};

export function verifyReport(report: unknown): VerifyResult {
  const errors: string[] = [];

  if (!isRecord(report)) {
    return { ok: false, errors: ["report must be an object"] };
  }

  if (report.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  const commands = Array.isArray(report.commands) ? report.commands : [];
  if (!Array.isArray(report.commands)) errors.push("commands must be an array");

  for (const command of commands) {
    if (!isRecord(command)) {
      errors.push("command must be an object");
      continue;
    }

    const id = typeof command.id === "string" && command.id.length > 0 ? command.id : "unknown";
    if (id === "unknown") errors.push("command is missing id");
    if (!Array.isArray(command.command) || command.command.length === 0) errors.push(`${id}: command argv is empty`);
    if (command.allowedFailure !== true && command.exitCode !== 0) errors.push(`${id}: command failed with exit ${String(command.exitCode)}`);
    if (command.timedOut === true) errors.push(`${id}: command timed out`);
  }

  return { ok: errors.length === 0, errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
