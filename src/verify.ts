import type { RunfreezeReport } from "./types.js";

export type VerifyResult = {
  ok: boolean;
  errors: string[];
};

export function verifyReport(report: RunfreezeReport): VerifyResult {
  const errors: string[] = [];

  if (report.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!Array.isArray(report.commands)) errors.push("commands must be an array");

  for (const command of report.commands ?? []) {
    if (!command.id) errors.push("command is missing id");
    if (!Array.isArray(command.command) || command.command.length === 0) errors.push(`${command.id}: command argv is empty`);
    if (!command.allowedFailure && command.exitCode !== 0) errors.push(`${command.id}: command failed with exit ${command.exitCode}`);
    if (command.timedOut) errors.push(`${command.id}: command timed out`);
  }

  return { ok: errors.length === 0, errors };
}
