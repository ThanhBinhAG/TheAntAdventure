import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';
import type { ProductListQuery } from '../lib/products/product-list-input';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const cache = new Map<string, unknown>();
let redisDown = false;
let productPageRpcCalls = 0;
let facetsRpcCalls = 0;
let invalidatedPatterns: string[] = [];

mock.module(require.resolve('../lib/redis/cache-helper'), {
  namedExports: {
    cacheGet: async (key: string) => (redisDown ? null : cache.get(key) ?? null),
    cacheSet: async (key: string, value: unknown) => {
      if (redisDown) return false;
      cache.set(key, value);
      return true;
    },
    cacheInvalidatePattern: async (pattern: string) => {
      invalidatedPatterns.push(pattern);
      cache.clear();
    },
  },
});

mock.module(require.resolve('../lib/supabase/server'), {
  namedExports: {
    getServerSupabaseClient: async () => ({
      rpc: async (name: string) => {
        if (name === 'list_product_facets') {
          facetsRpcCalls++;
          return {
            data: {
              categories: ['Cultural'],
              destinations: { Hanoi: 1 },
              pricingPulse: { complete: 1, incomplete: 0, missing: 0 },
            },
            error: null,
          };
        }
        productPageRpcCalls++;
        return {
          data: {
            items: [{ code: 'P-001', name: 'Hanoi', description: '' }],
            page: 1,
            pageSize: 24,
            totalCount: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
          error: null,
        };
      },
      from: () => ({
        select: () => ({
          in: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  },
});

test('Product list and facets use cache hits and fall back to Supabase when Redis is down', async () => {
  const { invalidateProductFacetsCache } = await import('../lib/redis/product-facets');
  const { listProductFacets, listProductsPage } = await import('../lib/products/product-list-server');
  const pageQuery: ProductListQuery = { page: 1, pageSize: 24, view: 'catalog' };
  const facetQuery = {};

  cache.clear();
  redisDown = false;
  productPageRpcCalls = 0;
  facetsRpcCalls = 0;
  invalidatedPatterns = [];

  const firstPage = await listProductsPage(pageQuery);
  const firstFacets = await listProductFacets(facetQuery);
  assert.equal(firstPage.items[0]?.code, 'P-001');
  assert.deepEqual(firstFacets.categories, ['Cultural']);
  assert.equal(productPageRpcCalls, 1, 'cache miss queries the Product page RPC');
  assert.equal(facetsRpcCalls, 1, 'cache miss queries the Product facets RPC');

  await listProductsPage(pageQuery);
  await listProductFacets(facetQuery);
  assert.equal(productPageRpcCalls, 1, 'cache hit skips the Product page RPC');
  assert.equal(facetsRpcCalls, 1, 'cache hit skips the Product facets RPC');

  await invalidateProductFacetsCache();
  await listProductsPage(pageQuery);
  await listProductFacets(facetQuery);
  assert.deepEqual(invalidatedPatterns, ['cache:products:*:v1:*']);
  assert.equal(productPageRpcCalls, 2, 'invalidation makes the Product page query Supabase again');
  assert.equal(facetsRpcCalls, 2, 'invalidation makes Product facets query Supabase again');

  redisDown = true;
  const pageWhenRedisDown = await listProductsPage({ ...pageQuery, q: 'Hanoi' });
  const facetsWhenRedisDown = await listProductFacets({ q: 'Hanoi' });
  assert.equal(pageWhenRedisDown.items[0]?.code, 'P-001');
  assert.deepEqual(facetsWhenRedisDown.categories, ['Cultural']);
  assert.equal(productPageRpcCalls, 3, 'Redis outage falls back to the Product page RPC');
  assert.equal(facetsRpcCalls, 3, 'Redis outage falls back to the Product facets RPC');
});
