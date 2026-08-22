import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { mock } from 'node:test';

loadEnvConfig(process.cwd());

const enabled = process.env.PRODUCT_POSTGRES_INTEGRATION === '1';
const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

type ProductListServerClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  from: (table: string) => unknown;
};

let productListServerClient: ProductListServerClient | null = null;

mock.module(require.resolve('../lib/supabase/server'), {
  namedExports: {
    getServerSupabaseClient: async () => {
      if (!productListServerClient) throw new Error('Product list integration client is not initialized.');
      return productListServerClient;
    },
  },
});

function productRow(code: string, name: string) {
  return {
    code,
    name,
    logic: '',
    duration: '1 day',
    category: 'Integration test',
    destination: 'Local',
    level: '',
    description: '',
    usp: '',
    notes_to_sales: '',
    price_from: '',
    region: 'north',
  };
}

function pricingRow(productCode: string, stdCost: unknown = 10) {
  return {
    product_code: productCode,
    std_cost: stdCost,
    p1: 0,
    p2: 0,
    p3: 0,
    p4: 0,
    p5: 0,
    p6: 0,
    p7: 0,
    p8: 0,
    p9: 0,
    p10: 0,
    c1: 0,
    c2: 0,
    c3: 0,
    c4: 0,
    c5: 0,
    c6: 0,
    c7: 0,
    c8: 0,
    c9: 0,
    c10: 0,
    incl_guide: false,
    incl_transport: false,
    incl_tickets: false,
    incl_water: false,
    incl_meals: false,
  };
}

test('Product PostgreSQL transactions roll back failed imports and aggregate writes', {
  skip: enabled ? undefined : 'Set PRODUCT_POSTGRES_INTEGRATION=1 to run',
}, async () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Local Supabase admin configuration is required.');

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const prefix = `A1-INT-${process.pid}-${Date.now()}`;
  const existingCode = `${prefix}-EXISTING`;
  const failedImportCode = `${prefix}-IMPORT-FAILED`;
  const photoCode = `${prefix}-PHOTO-FAILED`;
  const existingPhotoId = `${prefix}-PHOTO-EXISTING`;
  const missingPhotoId = `${prefix}-PHOTO-MISSING`;
  const originalRedisUrl = process.env.REDIS_URL;

  try {
    const { error: insertProductError } = await admin
      .from('products')
      .insert(productRow(existingCode, 'Original Product'));
    assert.equal(insertProductError, null);
    const { error: insertPricingError } = await admin
      .from('product_pricing')
      .insert(pricingRow(existingCode, 123));
    assert.equal(insertPricingError, null);

    let productPageRpcCalls = 0;
    let productFacetsRpcCalls = 0;
    const rawAdmin = admin as unknown as ProductListServerClient;
    productListServerClient = {
      rpc: async (name, args) => {
        if (name === 'list_products_page') productPageRpcCalls++;
        if (name === 'list_product_facets') productFacetsRpcCalls++;
        return rawAdmin.rpc(name, args);
      },
      from: (table) => rawAdmin.from(table),
    };
    const { getRedisClient } = await import('../lib/redis/client');
    const { invalidateProductFacetsCache } = await import('../lib/redis/product-facets');
    const { listProductFacets, listProductsPage } = await import('../lib/products/product-list-server');
    const redis = await getRedisClient();
    assert.ok(redis, 'Redis must be available for Product cache integration.');
    await invalidateProductFacetsCache();

    const pageQuery = { page: 1, pageSize: 24, view: 'catalog' as const, q: existingCode };
    const facetQuery = { q: existingCode };
    assert.equal((await listProductsPage(pageQuery)).items[0]?.code, existingCode);
    assert.ok((await listProductFacets(facetQuery)).categories.includes('Integration test'));
    assert.equal(productPageRpcCalls, 1);
    assert.equal(productFacetsRpcCalls, 1);
    await listProductsPage(pageQuery);
    await listProductFacets(facetQuery);
    assert.equal(productPageRpcCalls, 1, 'Redis cache hit avoids a second Product page RPC.');
    assert.equal(productFacetsRpcCalls, 1, 'Redis cache hit avoids a second Product facets RPC.');

    await invalidateProductFacetsCache();
    const cacheKeys: string[] = [];
    for await (const batch of redis.scanIterator({ MATCH: 'cache:products:*:v1:*', COUNT: 100 })) {
      const scannedKeys = Array.isArray(batch) ? batch : [batch];
      cacheKeys.push(...scannedKeys.map((key) => String(key)));
    }
    assert.deepEqual(cacheKeys, []);

    process.env.REDIS_URL = '';
    const pageCallsBeforeRedisDown = productPageRpcCalls;
    const facetsCallsBeforeRedisDown = productFacetsRpcCalls;
    const fallbackQuery = `${existingCode}-redis-down`;
    assert.deepEqual((await listProductsPage({ ...pageQuery, q: fallbackQuery })).items, []);
    assert.ok(Array.isArray((await listProductFacets({ q: fallbackQuery })).categories));
    assert.equal(productPageRpcCalls, pageCallsBeforeRedisDown + 1);
    assert.equal(productFacetsRpcCalls, facetsCallsBeforeRedisDown + 1);
    process.env.REDIS_URL = originalRedisUrl;
    if (redis.isOpen) await redis.quit();

    // The numeric cast happens after the function deletes the current catalogue.
    const { error: importError } = await admin.rpc('replace_product_catalogue_transaction', {
      p_products: [productRow(failedImportCode, 'Failed Import Product')],
      p_pricing_stubs: [pricingRow(failedImportCode, 'not-a-number')],
    });
    assert.equal(importError?.code, '22P02');
    const { data: originalAfterImport, error: originalAfterImportError } = await admin
      .from('products')
      .select('name')
      .eq('code', existingCode)
      .single();
    assert.equal(originalAfterImportError, null);
    assert.equal(originalAfterImport?.name, 'Original Product');
    const { data: originalPricingAfterImport, error: originalPricingAfterImportError } = await admin
      .from('product_pricing')
      .select('std_cost')
      .eq('product_code', existingCode)
      .single();
    assert.equal(originalPricingAfterImportError, null);
    assert.equal(Number(originalPricingAfterImport?.std_cost), 123);
    const { data: failedImportProduct, error: failedImportProductError } = await admin
      .from('products')
      .select('code')
      .eq('code', failedImportCode)
      .maybeSingle();
    assert.equal(failedImportProductError, null);
    assert.equal(failedImportProduct, null);

    const { error: pricingAggregateError } = await admin.rpc('save_product_aggregate', {
      p_product: productRow(existingCode, 'Pricing must not update this name'),
      p_pricing_stub: pricingRow(existingCode, 'not-a-number'),
      p_photo_links: [],
    });
    assert.equal(pricingAggregateError?.code, '22P02');
    const { data: originalAfterPricingError, error: originalAfterPricingErrorError } = await admin
      .from('products')
      .select('name')
      .eq('code', existingCode)
      .single();
    assert.equal(originalAfterPricingErrorError, null);
    assert.equal(originalAfterPricingError?.name, 'Original Product');

    const { error: insertPhotoProductError } = await admin
      .from('products')
      .insert(productRow(photoCode, 'Product With Existing Photo'));
    assert.equal(insertPhotoProductError, null);
    const { error: insertPhotoPricingError } = await admin
      .from('product_pricing')
      .insert(pricingRow(photoCode));
    assert.equal(insertPhotoPricingError, null);
    const { error: insertPhotoError } = await admin
      .from('photos')
      .insert({ id: existingPhotoId, caption: 'Existing test photo', region: 'north' });
    assert.equal(insertPhotoError, null);
    const { error: insertPhotoLinkError } = await admin
      .from('product_photos')
      .insert({ product_code: photoCode, photo_id: existingPhotoId, sort_order: 0, is_featured: true });
    assert.equal(insertPhotoLinkError, null);

    const { error: photoAggregateError } = await admin.rpc('save_product_aggregate', {
      p_product: productRow(photoCode, 'Photo must not update this name'),
      p_pricing_stub: pricingRow(photoCode),
      p_photo_links: [{ product_code: photoCode, photo_id: missingPhotoId, sort_order: 0, is_featured: true }],
    });
    assert.equal(photoAggregateError?.code, '23503');
    const { data: productAfterPhotoError, error: productAfterPhotoErrorError } = await admin
      .from('products')
      .select('name')
      .eq('code', photoCode)
      .single();
    assert.equal(productAfterPhotoErrorError, null);
    assert.equal(productAfterPhotoError?.name, 'Product With Existing Photo');
    const { data: linksAfterPhotoError, error: linksAfterPhotoErrorError } = await admin
      .from('product_photos')
      .select('photo_id')
      .eq('product_code', photoCode);
    assert.equal(linksAfterPhotoErrorError, null);
    assert.deepEqual(linksAfterPhotoError?.map((link) => link.photo_id), [existingPhotoId]);
  } finally {
    process.env.REDIS_URL = originalRedisUrl;
    productListServerClient = null;
    await admin.from('product_photos').delete().in('product_code', [existingCode, photoCode]);
    await admin.from('product_pricing').delete().in('product_code', [existingCode, photoCode]);
    await admin.from('products').delete().in('code', [existingCode, photoCode]);
    await admin.from('photos').delete().eq('id', existingPhotoId);
  }
});
