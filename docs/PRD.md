# runfreeze PRD

Status: in-progress

## Summary

`runfreeze` records local command smokes as compact, sanitized evidence packs. It runs allowlisted commands, captures stdout/stderr/exit codes/durations, redacts configured patterns, and writes a replayable `runfreeze.json` plus a Markdown summary. It is for developers who want proof that an agent-built project actually ran locally.

## Source attribution

Inspired by agentic OSS factory workflows and recent discussion of autonomous coding agents producing verifiable artifacts. The concept is reframed as a deterministic local evidence recorder, not a remote telemetry product.

## Problem

Agent-produced repos often claim "tests pass" in prose. Maintainers need local, inspectable command evidence that can be checked into a repo without leaking secrets or relying on a service.

## Users

- Developers reviewing agent-generated patches.
- OSS maintainers publishing local smoke evidence.
- Agent orchestrators that need a small verification artifact.

## V1 Goals

- Read commands from `runfreeze.yaml`.
- Enforce cwd boundaries and command allowlists.
- Capture output with configurable byte limits.
- Redact secrets using default and user-provided regexes.
- Emit JSON and Markdown reports.
- Provide `init`, `record`, `summarize`, and `verify` commands.

## Non-Goals

- Full terminal replay.
- Remote storage.
- Arbitrary shell automation without guardrails.

## CLI

```bash
runfreeze init
runfreeze record --config runfreeze.yaml --output runfreeze.json
runfreeze summarize runfreeze.json --output RUNS.md
runfreeze verify runfreeze.json
```

## Acceptance Criteria

- Fails closed for commands outside the configured project root.
- Captures stdout and stderr separately.
- Marks redaction counts in the report.
- Fixture-backed tests cover success, failure, truncation, and redaction.
- README includes a real CLI smoke workflow.
