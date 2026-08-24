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

mock.module(require.resolve('../lib/redis/cache-helper'), {
  namedExports: {
    cacheGet: async () => null,
    cacheSet: async () => true,
    cacheInvalidatePattern: async () => {
      throw new Error('Redis unavailable');
    },
  },
});

test('Product cache invalidation never propagates a Redis failure to a completed mutation', async () => {
  const { invalidateProductFacetsCache } = await import('../lib/redis/product-facets');

  await assert.doesNotReject(invalidateProductFacetsCache());
});
