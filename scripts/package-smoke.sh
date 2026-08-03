#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

cd "$repo_root"
npm run build
package_file=$(npm pack --silent --pack-destination "$tmp_dir")
package_path="$tmp_dir/$package_file"

mkdir "$tmp_dir/consumer"
cd "$tmp_dir/consumer"
npm init --yes >/dev/null
npm install --ignore-scripts "$package_path" >/dev/null

runfreeze="$tmp_dir/consumer/node_modules/.bin/runfreeze"
"$runfreeze" --help >/dev/null
"$runfreeze" init
"$runfreeze" record --config runfreeze.yaml --output runfreeze.json
"$runfreeze" summarize runfreeze.json --output RUNS.md
"$runfreeze" verify runfreeze.json
test -s RUNS.md
