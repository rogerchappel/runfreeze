# Changelog

All notable changes to this project will be documented in this file.

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and uses semantic versioning when versioned releases are published.

## [Unreleased]

### Added

- Initial project setup.

### Changed

- Test discovery now works on every supported Node.js version, and CI verifies
  the minimum Node.js 20 runtime alongside Node.js 24.
- CLI reports expected user errors as single-line stderr messages with exit
  code 1 instead of raw stack traces (missing report, malformed report JSON,
  invalid config, `init` on an existing file).
- Truncated stdout and stderr now stop at complete UTF-8 character boundaries.

## Release Links

- No version has been published to npm and no release tag exists yet.
- Unreleased work is available on the
  [`main` branch](https://github.com/rogerchappel/runfreeze/tree/main).

Add version comparison and latest-release links when the first release tag is
published.
