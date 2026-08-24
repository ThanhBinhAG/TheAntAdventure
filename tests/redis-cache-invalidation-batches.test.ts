import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const deletedKeys: string[][] = [];
let scanBatches: string[][] = [];
let failDeleteAtCall: number | null = null;

mock.module(require.resolve('../lib/redis/client'), {
  namedExports: {
    getRedisClient: async () => ({
      scanIterator: async function* () {
        yield* scanBatches;
      },
      del: async (keys: string[]) => {
        deletedKeys.push(keys);
        if (failDeleteAtCall === deletedKeys.length) {
          throw new Error('Redis DEL failed');
        }
      },
    }),
  },
});

test('cache invalidation deletes each SCAN batch without accumulating every key', async () => {
  const { cacheInvalidatePattern } = await import('../lib/redis/cache-helper');
  deletedKeys.length = 0;
  scanBatches = [
    ['cache:products:list:v1:first', 'cache:products:facets:v1:first'],
    ['cache:products:list:v1:second'],
  ];
  failDeleteAtCall = null;

  await cacheInvalidatePattern('cache:products:*:v1:*');

  assert.deepEqual(deletedKeys, [
    ['cache:products:list:v1:first', 'cache:products:facets:v1:first'],
    ['cache:products:list:v1:second'],
  ]);
});

test('cache invalidation splits an unexpectedly large SCAN batch', async () => {
  const { cacheInvalidatePattern } = await import('../lib/redis/cache-helper');
  deletedKeys.length = 0;
  scanBatches = [Array.from({ length: 201 }, (_, index) => `cache:products:v1:${index}`)];
  failDeleteAtCall = null;

  await cacheInvalidatePattern('cache:products:*:v1:*');

  assert.deepEqual(deletedKeys.map((batch) => batch.length), [100, 100, 1]);
});

test('cache invalidation swallows a Redis failure after an earlier batch', async () => {
  const { cacheInvalidatePattern } = await import('../lib/redis/cache-helper');
  deletedKeys.length = 0;
  scanBatches = [['cache:products:v1:first'], ['cache:products:v1:second']];
  failDeleteAtCall = 2;

  await assert.doesNotReject(cacheInvalidatePattern('cache:products:*:v1:*'));
  assert.deepEqual(deletedKeys, [
    ['cache:products:v1:first'],
    ['cache:products:v1:second'],
  ]);
});

test('cache invalidation does not issue DEL when SCAN returns no keys', async () => {
  const { cacheInvalidatePattern } = await import('../lib/redis/cache-helper');
  deletedKeys.length = 0;
  scanBatches = [[], []];
  failDeleteAtCall = null;

  await cacheInvalidatePattern('cache:products:*:v1:*');

  assert.deepEqual(deletedKeys, []);
});
