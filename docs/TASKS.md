# runfreeze Tasks

Status: active

## V1

- [x] Scaffold TypeScript CLI package.
- [x] Parse `runfreeze.yaml`.
- [x] Enforce command allowlists and cwd bounds.
- [x] Capture stdout, stderr, exit status, duration, and truncation state.
- [x] Redact default and user-configured secret patterns.
- [x] Emit JSON evidence reports.
- [x] Render Markdown summaries.
- [x] Verify reports from CI or local scripts.
- [x] Add fixture-backed tests and local smoke validation.

## Next

- [ ] Add schema documentation for `runfreeze.yaml` and `runfreeze.json`.
- [ ] Add package-install smoke coverage before first npm publish.
- [ ] Add examples for monorepos and multi-language projects.
- [ ] Decide whether to publish generated reports as CI artifacts.
