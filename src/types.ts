export type RunfreezeCommand = {
  id: string;
  run: string | string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  maxOutputBytes?: number;
  allowFailure?: boolean;
};

export type RunfreezeConfig = {
  root: string;
  commands: RunfreezeCommand[];
  allow?: string[];
  redact?: string[];
  maxOutputBytes: number;
  timeoutMs: number;
};

export type StreamCapture = {
  text: string;
  bytes: number;
  truncated: boolean;
};

export type RedactionSummary = {
  total: number;
  byPattern: Record<string, number>;
};

export type RecordedCommand = {
  id: string;
  command: string[];
  cwd: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdout: StreamCapture;
  stderr: StreamCapture;
  redactions: RedactionSummary;
  allowedFailure: boolean;
};

export type RunfreezeReport = {
  schemaVersion: 1;
  tool: {
    name: "runfreeze";
    version: string;
  };
  root: string;
  createdAt: string;
  commands: RecordedCommand[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    redactions: number;
    truncated: number;
  };
};
