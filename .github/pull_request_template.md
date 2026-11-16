## Summary

- Add a deterministic regression assertion that compares the package Node minimum with the locked Commander engine and checks the Node 20/24 CI compatibility lines.

## Verification

- [x] Tests or checks run: `npm ci`; `npm test` (61 tests); `node --test dist/tests/engine-compat.test.js`; `npm run check`; `npm run ci:workflow`; `git diff --check`.
- [x] Manual review completed: confirmed Commander 14.0.3 declares `node >=20`, package declares `>=20`, and CI matrix is Node 20 and 24.

## Risk Level

- [x] Low

Notes: test-only; no runtime or package behavior changes.

## Rollback Plan

- Revert the compatibility assertion.

## Human Decision Needed

- [x] None
- [ ] Maintainer review
- [ ] Product/design decision
- [ ] Security/privacy review
- [ ] Other:
