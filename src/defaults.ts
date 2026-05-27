export const DEFAULT_CONFIG_PATH = "runfreeze.yaml";
export const DEFAULT_OUTPUT_PATH = "runfreeze.json";
export const DEFAULT_MARKDOWN_PATH = "RUNS.md";
export const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024;
export const DEFAULT_TIMEOUT_MS = 120_000;

export const DEFAULT_REDACTION_PATTERNS = [
  "(?i)(api[_-]?key|token|secret|password)\\s*[:=]\\s*[^\\s]+",
  "ghp_[A-Za-z0-9_]{20,}",
  "github_pat_[A-Za-z0-9_]+",
  "sk-[A-Za-z0-9]{20,}",
  "AKIA[0-9A-Z]{16}",
  "-----BEGIN [A-Z ]*PRIVATE KEY-----[\\s\\S]*?-----END [A-Z ]*PRIVATE KEY-----",
];
