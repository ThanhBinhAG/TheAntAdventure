#!/usr/bin/env node
/**
 * Runs the reproducible local portion of the BFF final-acceptance gate.
 * A real E2E lifecycle needs an isolated, mutable Supabase target, so it is
 * deliberately opt-in with FINAL_ACCEPTANCE_E2E=1.
 */
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const localGates = [
  ['lint', 'npm run lint', ['run', 'lint']],
  ['typecheck', 'npm run typecheck', ['run', 'typecheck']],
  ['unit tests', 'npm test', ['test']],
  ['production build', 'npm run build', ['run', 'build']],
  ['browser leakage', 'npm run leakage:check', ['run', 'leakage:check']],
];

function run(label, command, args) {
  console.log(`\n==> ${label}: ${command}`);
  const result = spawnSync(npm, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`final-acceptance: could not start ${label}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`final-acceptance: ${label} failed (exit ${result.status ?? 'unknown'}).`);
    process.exit(result.status ?? 1);
  }
}

for (const [label, command, args] of localGates) run(label, command, args);

if (process.env.FINAL_ACCEPTANCE_E2E === '1') {
  run('E2E session lifecycle', 'npm run test:e2e', ['run', 'test:e2e']);
} else {
  console.log('\n==> E2E session lifecycle: pending (set FINAL_ACCEPTANCE_E2E=1 on the isolated test target).');
}

console.log('\nfinal-acceptance: local gates passed.');
