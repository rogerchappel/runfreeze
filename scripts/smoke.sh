#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

cat >"$tmp_dir/runfreeze.yaml" <<EOF
root: $tmp_dir
allow:
  - node
maxOutputBytes: 65536
timeoutMs: 10000
commands:
  - id: node-version
    run: node --version
EOF

node "$repo_root/dist/src/cli.js" record --config "$tmp_dir/runfreeze.yaml" --output "$tmp_dir/runfreeze.json"
node "$repo_root/dist/src/cli.js" summarize "$tmp_dir/runfreeze.json" --output "$tmp_dir/RUNS.md"
node "$repo_root/dist/src/cli.js" verify "$tmp_dir/runfreeze.json"

grep -q 'node-version' "$tmp_dir/RUNS.md"
printf 'smoke passed\n'
