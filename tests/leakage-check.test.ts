import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const script = join(process.cwd(), 'scripts/scan-leakage.sh');

function runLeakageCheck(buildDir: string, extraEnv: Partial<NodeJS.ProcessEnv> = {}) {
  return () => execFileSync('bash', [script], {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv, BUILD_DIR: buildDir },
    encoding: 'utf8',
  });
}

test('leakage check accepts a clean browser bundle and rejects Supabase paths or keys', () => {
  const buildDir = mkdtempSync(join(tmpdir(), 'crm-leakage-'));
  try {
    writeFileSync(join(buildDir, 'clean.js'), 'console.log("crm api only")');
    assert.doesNotThrow(runLeakageCheck(buildDir));

    writeFileSync(join(buildDir, 'leak.js'), 'fetch("https://db.example.test/rest/v1/products")');
    assert.throws(runLeakageCheck(buildDir));

    writeFileSync(join(buildDir, 'key.js'), 'public-anon-test-key');
    assert.throws(runLeakageCheck(buildDir, { NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-test-key' }));
  } finally {
    rmSync(buildDir, { recursive: true, force: true });
  }
});

test('production build invokes the leakage check after Next build', async () => {
  const packageJson = await import('node:fs/promises').then(({ readFile }) =>
    readFile(join(process.cwd(), 'package.json'), 'utf8')
  );
  const scripts = JSON.parse(packageJson).scripts as Record<string, string>;
  assert.equal(scripts['leakage:check'], 'bash scripts/scan-leakage.sh');
  assert.match(scripts.build, /next build --webpack && npm run leakage:check/);
});
