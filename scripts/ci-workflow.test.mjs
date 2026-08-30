import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
const workflow = parse(
  await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
);
const job = workflow.jobs['repository-hygiene'];

assert.equal(
  packageJson.scripts.test,
  'npm run build && node --test dist/tests/cli.test.js dist/tests/runfreeze.test.js dist/tests/verify.test.js',
  'test discovery must work on the minimum supported Node version',
);
assert.deepEqual(
  job.strategy.matrix.node,
  [20, 24],
  'CI must exercise the minimum and a current supported Node version',
);
assert.ok(
  job.steps.some(
    (step) =>
      step.uses === 'actions/setup-node@v6' &&
      step.with?.['node-version'] === '${{ matrix.node }}' &&
      step.with?.cache === 'npm',
  ),
  'CI must install each declared Node version',
);

console.log('CI workflow contract passed');
