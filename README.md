# runfreeze

Local-first command smoke evidence recorder.

`runfreeze` runs allowlisted commands, captures stdout/stderr/exit codes/durations, redacts configured secret patterns, and writes a compact JSON evidence pack plus a Markdown summary.

## Status

This repository is early-stage. Confirm the current support, release, and
security posture before using it in production.

## Install

```sh
npm install
npm run build
```

## Use

From a local checkout, use the built CLI:

```sh
node dist/src/cli.js init
node dist/src/cli.js record --config runfreeze.yaml --output runfreeze.json
node dist/src/cli.js summarize runfreeze.json --output RUNS.md
node dist/src/cli.js verify runfreeze.json
```

After package installation, replace `node dist/src/cli.js` with `runfreeze`.

Commands fail closed: each command must stay inside the configured root and match the `allow` list.
When a command exceeds `timeoutMs`, runfreeze sends `SIGTERM`, waits a one-second grace period,
then sends `SIGKILL` if the command is still running. The report marks the command as timed out.

See [examples/runfreeze.yaml](examples/runfreeze.yaml) for a tiny allowlisted
Node.js command set that can be recorded, summarized, and verified locally.

## Verify

Run the local validation script before opening a pull request:

```sh
bash scripts/validate.sh
```

`scripts/validate.sh` runs the repository's standard local checks when they are defined and will also run `agent-qc ready` when `agent-qc` is installed. Missing `agent-qc` is treated as a skip, not a failure.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes
should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance. Review
captured command output before sharing reports; redaction is helpful but not a
substitute for human review of sensitive logs.

## License

MIT

## Verification

Run these checks before opening a PR or publishing a release:

```bash
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

## Limitations

runfreeze is a local-first helper for preparing reviewable evidence. It does not replace human review, live system validation, or project-specific policy checks, and generated output should be inspected before use in release or operational decisions.
