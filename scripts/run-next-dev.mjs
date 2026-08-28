import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

export function createDevEnvironment(environment) {
  const existing = environment.NODE_OPTIONS?.trim() ?? '';
  return {
    ...environment,
    NODE_OPTIONS: existing.includes('--max-old-space-size')
      ? existing
      : [existing, '--max-old-space-size=3072'].filter(Boolean).join(' '),
  };
}

function main() {
  const nextCli = require.resolve('next/dist/bin/next');
  const child = spawn(process.execPath, [nextCli, 'dev', '-p', '3006', ...process.argv.slice(2)], {
    env: createDevEnvironment(process.env),
    stdio: 'inherit',
  });
  child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
  child.on('error', () => { process.exitCode = 1; });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
