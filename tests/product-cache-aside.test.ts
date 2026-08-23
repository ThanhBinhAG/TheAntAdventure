import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Product list and facets use cache-aside with explicit TTLs', () => {
  const listCache = source('lib/redis/product-list.ts');
  const facetsCache = source('lib/redis/product-facets.ts');
  const productList = source('lib/products/product-list-server.ts');

  assert.match(listCache, /PRODUCT_LIST_CACHE_TTL_SECONDS = 60/);
  assert.match(listCache, /cache:products:list:v1:/);
  assert.match(facetsCache, /PRODUCT_FACETS_TTL_SECONDS = 5 \* 60/);
  assert.match(facetsCache, /cache:products:facets:v1:/);
  assert.match(productList, /getCachedProductPage/);
  assert.match(productList, /setCachedProductPage/);
  assert.match(productList, /getCachedProductFacets/);
  assert.match(productList, /setCachedProductFacets/);
});

test('Product mutations invalidate every Product cache key after successful writes', () => {
  const facetsCache = source('lib/redis/product-facets.ts');
  const productRoute = source('app/api/products/route.ts');
  const pricingRoute = source('app/api/products/pricing/route.ts');
  const importRoute = source('app/api/products/import/route.ts');

  assert.match(facetsCache, /cache:products:\*:v1:\*/);
  for (const sourceFile of [productRoute, pricingRoute, importRoute]) {
    assert.match(sourceFile, /await invalidateProductFacetsCache\(\);/);
  }
});
