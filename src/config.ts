import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  DEFAULT_MAX_OUTPUT_BYTES,
  DEFAULT_REDACTION_PATTERNS,
  DEFAULT_TIMEOUT_MS,
} from "./defaults.js";
import { RunfreezeError } from "./errors.js";
import type { RunfreezeCommand, RunfreezeConfig } from "./types.js";

type RawConfig = {
  root?: unknown;
  commands?: unknown;
  allow?: unknown;
  redact?: unknown;
  maxOutputBytes?: unknown;
  timeoutMs?: unknown;
};

export async function loadConfig(configPath: string): Promise<RunfreezeConfig> {
  const absoluteConfigPath = path.resolve(configPath);
  const rawText = await readFile(absoluteConfigPath, "utf8");
  const parsed = YAML.parse(rawText) as RawConfig | null;
  if (!parsed || typeof parsed !== "object") {
    throw new RunfreezeError("Config must be a YAML object.", "CONFIG_INVALID");
  }

  const configDir = path.dirname(absoluteConfigPath);
  const root = path.resolve(configDir, readString(parsed.root, "root", "."));
  const commands = readCommands(parsed.commands);
  const allow = readOptionalStringList(parsed.allow, "allow");
  const userRedact = readOptionalStringList(parsed.redact, "redact");

  return {
    root,
    commands,
    allow,
    redact: [...DEFAULT_REDACTION_PATTERNS, ...userRedact],
    maxOutputBytes: readPositiveInteger(
      parsed.maxOutputBytes,
      "maxOutputBytes",
      DEFAULT_MAX_OUTPUT_BYTES,
    ),
    timeoutMs: readPositiveInteger(parsed.timeoutMs, "timeoutMs", DEFAULT_TIMEOUT_MS),
  };
}

function readCommands(value: unknown): RunfreezeCommand[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RunfreezeError("Config must include at least one command.", "CONFIG_INVALID");
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new RunfreezeError(`commands[${index}] must be an object.`, "CONFIG_INVALID");
    }
    const item = entry as Record<string, unknown>;
    const id = readString(item.id, `commands[${index}].id`, `cmd-${index + 1}`);
    const run = readRun(item.run, `commands[${index}].run`);
    const cwd = item.cwd === undefined ? undefined : readString(item.cwd, `commands[${index}].cwd`);
    const env = readOptionalEnv(item.env, `commands[${index}].env`);
    const timeoutMs =
      item.timeoutMs === undefined
        ? undefined
        : readPositiveInteger(item.timeoutMs, `commands[${index}].timeoutMs`);
    const maxOutputBytes =
      item.maxOutputBytes === undefined
        ? undefined
        : readPositiveInteger(item.maxOutputBytes, `commands[${index}].maxOutputBytes`);
    const allowFailure =
      item.allowFailure === undefined
        ? false
        : readBoolean(item.allowFailure, `commands[${index}].allowFailure`);

    return { id, run, cwd, env, timeoutMs, maxOutputBytes, allowFailure };
  });
}

function readRun(value: unknown, label: string): string | string[] {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }
  if (Array.isArray(value) && value.length > 0 && value.every((part) => typeof part === "string")) {
    return value;
  }
  throw new RunfreezeError(`${label} must be a non-empty string or string array.`, "CONFIG_INVALID");
}

function readString(value: unknown, label: string, fallback?: string): string {
  if (value === undefined && fallback !== undefined) {
    return fallback;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }
  throw new RunfreezeError(`${label} must be a non-empty string.`, "CONFIG_INVALID");
}

function readBoolean(value: unknown, label: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  throw new RunfreezeError(`${label} must be a boolean.`, "CONFIG_INVALID");
}

function readPositiveInteger(value: unknown, label: string, fallback?: number): number {
  if (value === undefined && fallback !== undefined) {
    return fallback;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  throw new RunfreezeError(`${label} must be a positive integer.`, "CONFIG_INVALID");
}

function readOptionalStringList(value: unknown, label: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.trim() !== "")) {
    return value;
  }
  throw new RunfreezeError(`${label} must be a list of non-empty strings.`, "CONFIG_INVALID");
}

function readOptionalEnv(value: unknown, label: string): Record<string, string> | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RunfreezeError(`${label} must be an object.`, "CONFIG_INVALID");
  }
  const entries = Object.entries(value as Record<string, unknown>);
  for (const [key, envValue] of entries) {
    if (!key || typeof envValue !== "string") {
      throw new RunfreezeError(`${label} values must be strings.`, "CONFIG_INVALID");
    }
  }
  return Object.fromEntries(entries) as Record<string, string>;
}
