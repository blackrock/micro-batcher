/* eslint-disable no-console */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'npm-shrinkwrap.json'];
const PUBLIC_NPM_REGISTRY = 'https://registry.npmjs.org';

const stagedFiles = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
  encoding: 'utf8'
})
  .split('\n')
  .filter(Boolean);

const stagedLockfiles = stagedFiles.filter((file) =>
  LOCKFILES.some((lockfile) => file.endsWith(lockfile))
);

if (stagedLockfiles.length === 0) {
  process.exit(0);
}

const candidates = stagedLockfiles.filter((file) => existsSync(file));

if (candidates.length === 0) {
  process.exit(0);
}

const rl = createInterface({ input, output });
const internalRegistry = (
  await rl.question(
    'Staged lockfiles detected. Enter the internal registry base URL to replace with https://registry.npmjs.org, or press Enter to skip: '
  )
).trim();
rl.close();

if (!internalRegistry) {
  console.log('Skipped lockfile registry sanitization.');
  process.exit(0);
}

const normalizedInternalRegistry = internalRegistry.replace(/\/+$/, '');
let changed = false;

for (const file of candidates) {
  const original = readFileSync(file, 'utf8');
  const updated = original.split(normalizedInternalRegistry).join(PUBLIC_NPM_REGISTRY);

  if (updated !== original) {
    writeFileSync(file, updated);
    execFileSync('git', ['add', file]);
    console.log(`Sanitized and re-staged ${file}`);
    changed = true;
  }
}

if (!changed) {
  console.log('No matching internal registry URLs found in staged lockfiles.');
}
