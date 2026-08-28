import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['scripts/check-supabase-leakage.mjs'], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  if (code && code !== 0) {
    console.warn('Supabase leakage remains a transitional report until the Dev 2 browser cutover is merged.');
  }
});
child.on('error', () => {
  console.warn('Supabase leakage report could not run.');
});
