# runfreeze Tasks

## V1 MVP

- [x] Scaffold a TypeScript CLI with `init`, `record`, `summarize`, and `verify`.
- [x] Read command smoke definitions from `runfreeze.yaml`.
- [x] Enforce project-root boundaries and command allowlists.
- [x] Capture stdout, stderr, exit codes, durations, and truncation metadata.
- [x] Redact default and configured secret patterns before writing evidence.
- [x] Emit `runfreeze.json` and Markdown summaries for review.
- [x] Add fixture-backed tests and CLI smoke coverage.
- [x] Document install, usage, contributing, security, and release verification.

## Next

- [ ] Add JSON schema documentation for `runfreeze.yaml` and evidence output.
- [ ] Add richer diffing between two evidence packs.
- [ ] Add optional SARIF output for CI annotations.
- [ ] Add examples for multi-command release smoke evidence.
