# runfreeze Orchestration

`runfreeze` is designed to be called by humans, CI jobs, and agent workflows that need local proof a project actually ran.

## Contract

1. Prepare a repository-local `runfreeze.yaml`.
2. Run `runfreeze record`.
3. Store `runfreeze.json` as the machine-readable evidence pack.
4. Run `runfreeze summarize` to create a Markdown review artifact.
5. Run `runfreeze verify` before claiming the evidence is valid.

## Safety model

- Commands must be allowlisted.
- Command working directories must stay inside the configured root.
- Output capture is bounded by byte limits.
- Redaction patterns are applied before evidence is written.
- Failed commands fail verification unless marked as allowed failures.

## Agent workflow

Agents should include `runfreeze.json` and the Markdown summary in review packs when they claim local validation. If a command cannot be run, the agent should document the skipped command and reason outside the evidence pack instead of fabricating a passing record.
