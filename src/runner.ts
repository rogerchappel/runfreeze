import { spawn } from "node:child_process";
import { ByteCapture } from "./capture.js";
import { prepareCommand } from "./command.js";
import { redactStreams } from "./redact.js";
import type { RecordedCommand, RunfreezeConfig, RunfreezeReport } from "./types.js";

export async function record(config: RunfreezeConfig, version: string): Promise<RunfreezeReport> {
  const commands: RecordedCommand[] = [];

  for (const command of config.commands) {
    const prepared = prepareCommand(config, command);
    const recorded = await runPreparedCommand(prepared, config.redact ?? []);
    commands.push(recorded);
  }

  return buildReport(config.root, version, commands);
}

async function runPreparedCommand(
  prepared: ReturnType<typeof prepareCommand>,
  redactPatterns: string[],
): Promise<RecordedCommand> {
  const started = new Date();
  const stdout = new ByteCapture(prepared.maxOutputBytes);
  const stderr = new ByteCapture(prepared.maxOutputBytes);
  let timedOut = false;

  const child = spawn(prepared.command[0]!, prepared.command.slice(1), {
    cwd: prepared.cwd,
    env: { ...process.env, ...prepared.env },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
  }, prepared.timeoutMs);

  child.stdout?.on("data", (chunk: Buffer) => stdout.append(chunk));
  child.stderr?.on("data", (chunk: Buffer) => stderr.append(chunk));

  const result = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>(
    (resolve) => {
      child.on("close", (exitCode, signal) => resolve({ exitCode, signal }));
    },
  );
  clearTimeout(timeout);

  const ended = new Date();
  const redacted = redactStreams(stdout.toJSON(), stderr.toJSON(), redactPatterns);

  return {
    id: prepared.id,
    command: prepared.command,
    cwd: prepared.cwd,
    startedAt: started.toISOString(),
    endedAt: ended.toISOString(),
    durationMs: ended.getTime() - started.getTime(),
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut,
    stdout: redacted.stdout,
    stderr: redacted.stderr,
    redactions: redacted.summary,
    allowedFailure: prepared.allowFailure,
  };
}

function buildReport(root: string, version: string, commands: RecordedCommand[]): RunfreezeReport {
  const failed = commands.filter((command) => !command.allowedFailure && command.exitCode !== 0).length;
  const redactions = commands.reduce((sum, command) => sum + command.redactions.total, 0);
  const truncated = commands.filter((command) => command.stdout.truncated || command.stderr.truncated).length;

  return {
    schemaVersion: 1,
    tool: {
      name: "runfreeze",
      version,
    },
    root,
    createdAt: new Date().toISOString(),
    commands,
    summary: {
      total: commands.length,
      passed: commands.length - failed,
      failed,
      redactions,
      truncated,
    },
  };
}
