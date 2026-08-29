import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('Node test launcher finds tests recursively and keeps platform ownership explicit', async () => {
  const { collectTestFiles, selectTestSuite } = await import('../scripts/test-runner.mjs');
  const root = await mkdtemp(join(tmpdir(), 'crm-test-launcher-'));
  await mkdir(join(root, 'nested'));
  await Promise.all([
    writeFile(join(root, 'crm-session-context.test.ts'), ''),
    writeFile(join(root, 'nested', 'supabase-jwt.test.ts'), ''),
    writeFile(join(root, 'nested', 'domain.test.ts'), ''),
    writeFile(join(root, 'nested', 'ignored.ts'), ''),
  ]);

  const files = await collectTestFiles(root);
  assert.deepEqual(files.map((file: string) => file.replace(`${root}/`, '')), [
    'crm-session-context.test.ts',
    'nested/domain.test.ts',
    'nested/supabase-jwt.test.ts',
  ]);
  assert.deepEqual(
    selectTestSuite(files, 'platform').map((file: string) => file.replace(`${root}/`, '')),
    ['crm-session-context.test.ts', 'nested/supabase-jwt.test.ts'],
  );
});

test('Node dev launcher preserves existing options and supplies a portable heap limit', async () => {
  const { createDevEnvironment } = await import('../scripts/run-next-dev.mjs');

  assert.equal(createDevEnvironment({}).NODE_OPTIONS, '--max-old-space-size=3072');
  assert.equal(
    createDevEnvironment({ NODE_OPTIONS: '--trace-warnings' }).NODE_OPTIONS,
    '--trace-warnings --max-old-space-size=3072',
  );
  assert.equal(
    createDevEnvironment({ NODE_OPTIONS: '--max-old-space-size=4096' }).NODE_OPTIONS,
    '--max-old-space-size=4096',
  );
});
