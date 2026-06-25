# runfreeze Orchestration

runfreeze is designed for local-first release evidence in human and agent review loops.

## Agent workflow

1. Run `runfreeze init` or create a small `runfreeze.yaml` with only the commands needed for review.
2. Keep `allow` narrow so the evidence run cannot execute unrelated tools.
3. Run `runfreeze record --config runfreeze.yaml --output runfreeze.json`.
4. Run `runfreeze summarize runfreeze.json --output RUNS.md`.
5. Run `runfreeze verify runfreeze.json` before attaching evidence to a pull request.

## Safety contract

- Local-only operation.
- Commands must be allowlisted.
- Command working directories must stay inside the configured root.
- Output is bounded and redacted before evidence is written.
- No remote upload or publishing behavior.

## CI pattern

```sh
runfreeze record --config runfreeze.yaml --output runfreeze.json
runfreeze verify runfreeze.json
```

Commit generated evidence only when it is intentionally part of the release review trail.
