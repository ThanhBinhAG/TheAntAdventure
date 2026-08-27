import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('server infrastructure logging uses safe Pino events without cache keys', () => {
  const expectedEvents = new Map<string, string[]>([
    ['lib/redis/cache-helper.ts', [
      'redis.cache.read_failed',
      'redis.cache.write_failed',
      'redis.cache.delete_failed',
      'redis.cache.increment_failed',
      'redis.cache.invalidate_failed',
    ]],
    ['lib/redis/client.ts', ['redis.connection.failed']],
    ['lib/redis/product-facets.ts', ['redis.product_facets.invalidate_failed']],
    ['lib/dashboard/dashboard-repository.ts', ['dashboard.cache.invalidate_failed']],
    ['lib/system/debug-logger.ts', ['system.debug.emitted']],
  ]);

  for (const [path, events] of expectedEvents) {
    const file = source(path);
    assert.match(file, /serverLogger/);
    assert.doesNotMatch(file, /console\.(?:error|warn|info|log|debug)\(/);
    for (const event of events) assert.match(file, new RegExp(event.replaceAll('.', '\\.')));
  }

  const debugLogger = source('lib/system/debug-logger.ts');
  assert.match(debugLogger, /'System debug event emitted'/);
  assert.doesNotMatch(debugLogger, /\},\s*message,\s*\)/);
});

test('browser diagnostics remain explicitly client-only', () => {
  const file = source('lib/system/client-logger.ts');
  assert.match(file, /process\.env\.NODE_ENV === 'production'/);
  assert.match(file, /console\.(?:error|warn|info)\(/);
});
