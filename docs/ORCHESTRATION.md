# runfreeze Orchestration

runfreeze is designed for local-first release evidence in human, CI, and agent review loops.

## Contract

1. Prepare a repository-local `runfreeze.yaml` with only the commands needed for review.
2. Keep `allow` narrow so the evidence run cannot execute unrelated tools.
3. Run `runfreeze record --config runfreeze.yaml --output runfreeze.json`.
4. Store `runfreeze.json` as the machine-readable evidence pack.
5. Run `runfreeze summarize runfreeze.json --output RUNS.md`.
6. Run `runfreeze verify runfreeze.json` before attaching evidence to a pull request.

## Safety model

- Local-only operation.
- Commands must be allowlisted.
- Command working directories must stay inside the configured root.
- Output capture is bounded by byte limits.
- Redaction patterns are applied before evidence is written.
- Failed commands fail verification unless marked as allowed failures.
- No remote upload or publishing behavior.

## CI pattern

```sh
runfreeze record --config runfreeze.yaml --output runfreeze.json
runfreeze verify runfreeze.json
```

Commit generated evidence only when it is intentionally part of the release review trail.

## Agent workflow

Agents should include `runfreeze.json` and the Markdown summary in review packs when they claim local validation. If a command cannot be run, the agent should document the skipped command and reason outside the evidence pack instead of fabricating a passing record.
