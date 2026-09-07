# runfreeze

Local-first command smoke evidence recorder.

`runfreeze` runs allowlisted commands, captures stdout/stderr/exit codes/durations, redacts configured secret patterns, and writes a compact JSON evidence pack plus a Markdown summary.

## Status

This repository is early-stage and has not yet published an npm release. Until
[`npm view runfreeze version`](https://www.npmjs.com/package/runfreeze) returns
a version, install a locally packed tarball as described below. Confirm the
current support, release, and security posture before using it in production.

## Install

From a source checkout, build and pack the project, then install that tarball in
a clean working directory:

```sh
git clone https://github.com/rogerchappel/runfreeze.git
cd runfreeze
npm ci
package_file=$(npm pack --silent)

mkdir ../runfreeze-example
cd ../runfreeze-example
npm init --yes
npm install --ignore-scripts "../runfreeze/$package_file"
```

After a version is visible from `npm view runfreeze version`, a global registry
install is also available with `npm install --global runfreeze`.

## Use

Use the locally installed CLI from the clean working directory:

```sh
./node_modules/.bin/runfreeze init
./node_modules/.bin/runfreeze record --config runfreeze.yaml --output runfreeze.json
./node_modules/.bin/runfreeze summarize runfreeze.json --output RUNS.md
./node_modules/.bin/runfreeze verify runfreeze.json
```

`init` and `summarize` create missing parent directories for their `--output`
paths. `init` still refuses to overwrite an existing configuration file.

Both `summarize` and `verify` validate external JSON against the complete schema-1
report structure, including summary totals. `verify` additionally exits nonzero
when a required command failed or any command timed out.

Expected user errors (a missing report, malformed report JSON, an invalid config,
or `init` on an existing file) print a single-line message to stderr and exit with
code 1 instead of leaking a raw stack trace.

Commands fail closed: each command must stay inside the configured root and match the `allow` list.
String-form `run` values use shell-like tokenization for whitespace, quotes, and
backslash escapes; quoted empty arguments such as `""` and `''` are preserved.
Use YAML array form when exact argument boundaries are preferable, including an
explicit empty argument:

```yaml
run: [node, script.mjs, "", tail]
```

When a command exceeds `timeoutMs`, runfreeze sends `SIGTERM`, waits a one-second grace period,
then sends `SIGKILL` if the command is still running. The report marks the command as timed out.
If an executable cannot be started, runfreeze records a failed command with the launch diagnostic
in stderr, continues recording later configured commands, and writes the complete evidence report.
Captured stdout and stderr are each bounded by `maxOutputBytes`. When that limit
cuts through a multibyte UTF-8 character, runfreeze drops the incomplete
character so captured text remains valid UTF-8; the reported byte count reflects
the bytes retained and `truncated` remains `true`.

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

runfreeze supports Node.js 20 and newer. CI runs the complete repository checks
on Node.js 20 (the minimum supported version) and Node.js 24.

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
