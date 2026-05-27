import path from "node:path";
import { RunfreezeError } from "./errors.js";
import type { RunfreezeCommand, RunfreezeConfig } from "./types.js";

export type PreparedCommand = {
  id: string;
  command: string[];
  cwd: string;
  env?: Record<string, string>;
  timeoutMs: number;
  maxOutputBytes: number;
  allowFailure: boolean;
};

export function prepareCommand(config: RunfreezeConfig, command: RunfreezeCommand): PreparedCommand {
  const cwd = path.resolve(config.root, command.cwd ?? ".");
  assertInsideRoot(config.root, cwd, `Command ${command.id} cwd`);

  const argv = normalizeRun(command.run);
  assertAllowed(config.allow ?? [], argv);

  return {
    id: command.id,
    command: argv,
    cwd,
    env: command.env,
    timeoutMs: command.timeoutMs ?? config.timeoutMs,
    maxOutputBytes: command.maxOutputBytes ?? config.maxOutputBytes,
    allowFailure: command.allowFailure ?? false,
  };
}

export function normalizeRun(run: string | string[]): string[] {
  if (Array.isArray(run)) {
    return run;
  }
  return splitShellLike(run);
}

export function assertInsideRoot(root: string, candidate: string, label: string): void {
  const relative = path.relative(root, candidate);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }
  throw new RunfreezeError(`${label} must stay inside root: ${root}`, "CWD_OUTSIDE_ROOT");
}

function assertAllowed(allow: string[], argv: string[]): void {
  if (argv.length === 0 || !argv[0]) {
    throw new RunfreezeError("Command cannot be empty.", "COMMAND_INVALID");
  }
  if (allow.length === 0) {
    throw new RunfreezeError("Config allow list must include at least one command.", "COMMAND_DENIED");
  }

  const executable = argv[0];
  const commandLine = argv.join(" ");
  const allowed = allow.some((entry) => {
    if (entry.includes(" ")) {
      return commandLine === entry || commandLine.startsWith(`${entry} `);
    }
    return executable === entry || path.basename(executable) === entry;
  });

  if (!allowed) {
    throw new RunfreezeError(`Command is not allowlisted: ${commandLine}`, "COMMAND_DENIED");
  }
}

function splitShellLike(input: string): string[] {
  const result: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaping = false;

  for (const char of input.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\" && quote !== "'") {
      escaping = true;
      continue;
    }
    if ((char === "'" || char === '"') && quote === null) {
      quote = char;
      continue;
    }
    if (char === quote) {
      quote = null;
      continue;
    }
    if (/\s/.test(char) && quote === null) {
      if (current !== "") {
        result.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaping) {
    current += "\\";
  }
  if (quote !== null) {
    throw new RunfreezeError("Command string has an unterminated quote.", "COMMAND_INVALID");
  }
  if (current !== "") {
    result.push(current);
  }
  return result;
}
