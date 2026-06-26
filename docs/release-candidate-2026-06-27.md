# runfreeze release candidate notes

Date: 2026-06-27

## Scope

This release candidate focuses on the package surface for the existing local
command evidence CLI.

## Verification

```sh
npm run release:check
```

Expected coverage:

- TypeScript check and build.
- Node test suite against compiled tests.
- CLI smoke that records, summarizes, and verifies a temporary allowlisted
  command report.
- Package smoke that confirms the built CLI, library entrypoint, and example
  config are present before `npm pack --dry-run`.

## Release notes starter

- Clarify README commands for local checkout use versus installed package use.
- Remove generated-template security copy and replace it with a scoped note for
  command-output review.
- Add `prepack` and package smoke file checks for the CLI, library entrypoint,
  and example config.

## Limitations

runfreeze records local command evidence. It is not a sandbox, CI service, or
secret scanner, and reviewers should inspect reports before sharing them.
