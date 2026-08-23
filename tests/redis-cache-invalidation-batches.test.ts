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

mock.module(require.resolve('../lib/redis/client'), {
  namedExports: {
    getRedisClient: async () => ({
      scanIterator: async function* () {
        yield ['cache:products:list:v1:first', 'cache:products:facets:v1:first'];
        yield ['cache:products:list:v1:second'];
      },
      del: async (keys: string[]) => {
        deletedKeys.push(keys);
      },
    }),
  },
});

test('cache invalidation flattens node-redis SCAN batches before DEL', async () => {
  const { cacheInvalidatePattern } = await import('../lib/redis/cache-helper');
  deletedKeys.length = 0;

  await cacheInvalidatePattern('cache:products:*:v1:*');

  assert.deepEqual(deletedKeys, [[
    'cache:products:list:v1:first',
    'cache:products:facets:v1:first',
    'cache:products:list:v1:second',
  ]]);
});
