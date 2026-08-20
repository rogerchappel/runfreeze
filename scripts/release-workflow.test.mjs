import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const workflow = parse(await readFile(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8'));
const jobs = workflow.jobs;

assert.deepEqual(jobs.verify.permissions, { contents: 'read' }, 'verify must remain read-only');
assert.equal(jobs['npm-publish'].needs, 'verify', 'npm publishing must depend on verify');
assert.deepEqual(
  jobs['npm-publish'].permissions,
  { contents: 'read', 'id-token': 'write' },
  'npm publishing must have only read and OIDC permissions',
);
assert.equal(jobs['github-release'].needs, 'verify', 'GitHub publishing must depend on verify');
assert.deepEqual(
  jobs['github-release'].permissions,
  { contents: 'write' },
  'GitHub publishing must have only release-write permission',
);

const steps = (job) => jobs[job].steps;
const verifyUpload = steps('verify').find((step) => step.uses === 'actions/upload-artifact@v4');
assert.ok(verifyUpload, 'verify must upload release artifacts');
assert.equal(verifyUpload.with.name, 'verified-release');
assert.equal(verifyUpload.with['if-no-files-found'], 'error');
assert.ok(Number(verifyUpload.with['retention-days']) <= 7, 'artifact retention must stay short');
assert.match(verifyUpload.with.path, /\*\.tgz/);
assert.match(verifyUpload.with.path, /RELEASE_NOTES\.md/);

for (const job of ['npm-publish', 'github-release']) {
  const download = steps(job).find((step) => step.uses === 'actions/download-artifact@v4');
  assert.equal(download?.with?.name, 'verified-release', `${job} must download the verified artifact`);
  assert.ok(!steps(job).some((step) => /npm (ci|pack)|releasebox/i.test(step.run ?? '')), `${job} must not rebuild`);
}

assert.ok(steps('npm-publish').some((step) => /npm publish[^\n]*\*\.tgz/.test(step.run ?? '')), 'npm must publish the tarball');
assert.ok(steps('github-release').some((step) => /gh release create[^\n]*RELEASE_NOTES\.md[^\n]*\*\.tgz/.test(step.run ?? '')), 'GitHub must publish the notes and tarball');

console.log('release workflow contract passed');
