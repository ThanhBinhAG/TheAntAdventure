import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const platformPrefixes = [
  'auth-', 'bff-request-context', 'bff-route-', 'crm-session-', 'middleware-',
  'proxy-', 'request-origin-', 'supabase-jwt', 'supabase-server-', 'redis-',
];

export async function collectTestFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTestFiles(path);
    return entry.isFile() && entry.name.endsWith('.test.ts') ? [path] : [];
  }));
  return files.flat().sort();
}

export function selectTestSuite(files, suite) {
  if (suite === 'all') return files;
  if (suite !== 'platform') throw new Error(`Unknown test suite: ${suite}`);
  return files.filter((file) => {
    const name = file.slice(file.lastIndexOf('/') + 1);
    return platformPrefixes.some((prefix) => name.startsWith(prefix));
  });
}

async function main() {
  const suite = process.argv[2] ?? 'all';
  const files = selectTestSuite(await collectTestFiles(resolve('tests')), suite);
  if (files.length === 0) throw new Error(`No tests found for suite: ${suite}`);

  const child = spawn(process.execPath, [
    '--experimental-test-module-mocks', '--import', 'tsx', '--test', ...files,
  ], { stdio: 'inherit' });
  child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
  child.on('error', () => { process.exitCode = 1; });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Unable to run tests.');
    process.exitCode = 1;
  });
}
