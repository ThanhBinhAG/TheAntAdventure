import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const HTTP_LOGGING_CONTRACT = /bffRoute\(|withHttpRequestLogging|createHttpRequestLogger/;

function collectRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(absolute);
    return entry.name === 'route.ts' ? [absolute] : [];
  });
}

test('all 90 API routes use a supported HTTP logging contract', () => {
  const root = process.cwd();
  const routes = collectRouteFiles(join(root, 'app/api'));

  assert.equal(routes.length, 90, 'update this acceptance count when an API route is added or removed');
  const missingContract = routes
    .filter((route) => !HTTP_LOGGING_CONTRACT.test(readFileSync(route, 'utf8')))
    .map((route) => route.slice(root.length + 1));

  assert.deepEqual(missingContract, []);
});

test('the legacy requestLogger adapter is no longer used by API routes', () => {
  const root = process.cwd();
  const legacyLogger = join(root, 'lib/system/server-logger.ts');
  const routes = collectRouteFiles(join(root, 'app/api'));

  assert.equal(existsSync(legacyLogger), true);
  assert.doesNotMatch(readFileSync(legacyLogger, 'utf8'), /export function requestLogger\(/);
  assert.deepEqual(
    routes
      .filter((route) => readFileSync(route, 'utf8').includes('requestLogger'))
      .map((route) => route.slice(root.length + 1)),
    [],
  );
});
