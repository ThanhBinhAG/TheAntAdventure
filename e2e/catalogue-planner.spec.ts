import { expect, test } from '@playwright/test';
import { createClient } from 'redis';
import { assertRow, browserJson, getAdminClient, login, readE2eState } from './support';

type RedisScanClient = {
  scanIterator(options: { MATCH: string; COUNT: number }): AsyncIterable<string | string[]>;
};

async function productCacheKeys(redis: RedisScanClient): Promise<string[]> {
  const keys: string[] = [];
  for await (const batch of redis.scanIterator({ MATCH: 'cache:products:*:v1:*', COUNT: 100 })) {
    const scannedKeys = Array.isArray(batch) ? batch : [batch];
    keys.push(...scannedKeys.map((key) => String(key)));
  }
  return keys;
}

test.describe.serial('Product, pricing, planner, and attraction acceptance', () => {
  test('Planner and Attractions enforce unauthenticated and forbidden access', async ({ page }) => {
    await page.goto('/login');
    const protectedReads = [
      '/api/products?page=1&pageSize=12',
      '/api/products/pricing?productCode=missing',
      '/api/planner/all',
      '/api/attractions/all',
    ];
    for (const path of protectedReads) {
      expect((await browserJson(page, path)).status, path).toBe(401);
    }

    const state = await readE2eState();
    await login(page, state.unassigned);
    for (const path of protectedReads) {
      expect((await browserJson(page, path)).status, path).toBe(403);
    }
    for (const [path, method, body] of [
      ['/api/products/import', 'POST', { drafts: [] }],
      ['/api/products/pricing', 'PATCH', { pricing: { productCode: 'missing', incl: {} } }],
      ['/api/planner', 'POST', { task: {} }],
      ['/api/attractions', 'POST', { attraction: {} }],
    ] as const) {
      expect((await browserJson(page, path, { method, body })).status, path).toBe(403);
    }
  });

  test('Product CRUD, pricing update, and rejected import preserve existing data', async ({ page }) => {
    const state = await readE2eState();
    const code = `${state.prefix}-PRODUCT`;
    await login(page, state.admin);
    const product = { code, name: 'E2E Product', logic: '', dur: 'Full Day', cat: 'Experience', dest: 'Hanoi', lvl: 'Easy', desc: '', usp: '', price: '', region: 'north', photoIds: [], linkedPhotoIds: [] };
    expect((await browserJson(page, '/api/products', { method: 'POST', body: { product } })).status).toBe(200);
    expect((await assertRow('products', 'code', code))?.name).toBe('E2E Product');
    expect(await assertRow('product_pricing', 'product_code', code)).not.toBeNull();

    product.name = 'E2E Product Updated';
    expect((await browserJson(page, '/api/products', { method: 'PATCH', body: { product } })).status).toBe(200);
    expect((await browserJson(page, '/api/products/pricing', { method: 'PATCH', body: { pricing: { productCode: code, p1: 321, incl: {} } } })).status).toBe(200);
    expect((await assertRow('products', 'code', code))?.name).toBe('E2E Product Updated');
    expect(Number((await assertRow('product_pricing', 'product_code', code))?.p1)).toBe(321);

    expect((await browserJson(page, '/api/products/import', { method: 'POST', body: { drafts: 'not-an-array' } })).status).toBe(422);
    expect((await assertRow('products', 'code', code))?.name).toBe('E2E Product Updated');

    expect((await browserJson(page, '/api/products', { method: 'DELETE', body: { code } })).status).toBe(200);
    expect(await assertRow('products', 'code', code)).toBeNull();
  });

  test('Product list and facets use Redis cache when available and fall back when it is down', async ({ page }) => {
    const state = await readE2eState();
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) test.skip(true, 'REDIS_URL is required for Product cache acceptance.');

    const redis = createClient({
      url: redisUrl,
      socket: { connectTimeout: 250, reconnectStrategy: () => false },
    });
    redis.on('error', () => undefined);
    let redisAvailable = true;
    try {
      await redis.connect();
    } catch {
      redisAvailable = false;
    }

    try {
      await login(page, state.admin);
      if (!redisAvailable) {
        expect((await browserJson(page, `/api/products?page=1&pageSize=24&view=catalog&q=${state.prefix}`)).status).toBe(200);
        expect((await browserJson(page, `/api/products/facets?q=${state.prefix}`)).status).toBe(200);
        return;
      }

      const existingCacheKeys = await productCacheKeys(redis);
      if (existingCacheKeys.length > 0) await redis.del(existingCacheKeys);

      const pageResponse = await browserJson(page, `/api/products?page=1&pageSize=24&view=catalog&q=${state.prefix}`);
      const facetsResponse = await browserJson(page, `/api/products/facets?q=${state.prefix}`);
      expect(pageResponse.status).toBe(200);
      expect(facetsResponse.status).toBe(200);

      const cachedKeys = await productCacheKeys(redis);
      expect(cachedKeys.some((key) => key.startsWith('cache:products:list:v1:'))).toBe(true);
      expect(cachedKeys.some((key) => key.startsWith('cache:products:facets:v1:'))).toBe(true);
      const cacheTtls = await Promise.all(cachedKeys.map((key) => redis.ttl(key)));
      expect(cacheTtls.every((ttl) => ttl > 0)).toBe(true);

      const code = `${state.prefix}-CACHE`;
      const product = { code, name: 'Cached E2E Product', logic: '', dur: 'Full Day', cat: 'Experience', dest: 'Hanoi', lvl: 'Easy', desc: '', usp: '', price: '', region: 'north', photoIds: [], linkedPhotoIds: [] };
      expect((await browserJson(page, '/api/products', { method: 'POST', body: { product } })).status).toBe(200);
      expect(await productCacheKeys(redis)).toEqual([]);

      expect((await browserJson(page, `/api/products?page=1&pageSize=24&view=catalog&q=${state.prefix}`)).status).toBe(200);
      expect((await browserJson(page, `/api/products/facets?q=${state.prefix}`)).status).toBe(200);
      expect((await productCacheKeys(redis)).length).toBeGreaterThan(0);

      expect((await browserJson(page, '/api/products/pricing', { method: 'PATCH', body: { pricing: { productCode: code, p1: 321, incl: {} } } })).status).toBe(200);
      expect(await productCacheKeys(redis)).toEqual([]);
    } finally {
      if (redis.isOpen) await redis.quit();
    }
  });

  test('Planner CRUD and validation failures affect only the intended task', async ({ page }) => {
    const state = await readE2eState();
    const id = `${state.prefix}-TASK`;
    await login(page, state.admin);
    const task = { id, title: 'E2E planner task', assignee: 'E2E', date: '2026-08-21', priority: 'medium', dept: 'Operations', status: 'todo', notes: '' };
    expect((await browserJson(page, '/api/planner', { method: 'POST', body: { task } })).status).toBe(200);
    expect((await assertRow('tasks', 'id', id))?.title).toBe(task.title);
    expect((await browserJson(page, '/api/planner', { method: 'PATCH', body: { id, patch: { status: 'done' } } })).status).toBe(200);
    expect((await assertRow('tasks', 'id', id))?.status).toBe('done');
    expect((await browserJson(page, '/api/planner', { method: 'POST', body: { task: { id: `${id}-BAD` } } })).status).toBe(422);
    expect(await assertRow('tasks', 'id', `${id}-BAD`)).toBeNull();
    expect((await browserJson(page, '/api/planner', { method: 'DELETE', body: { id } })).status).toBe(200);
    expect(await assertRow('tasks', 'id', id)).toBeNull();
    expect((await browserJson(page, '/api/planner', { method: 'PATCH', body: { id, patch: { status: 'done' } } })).status).toBe(404);
    expect((await browserJson(page, '/api/planner', { method: 'DELETE', body: { id } })).status).toBe(404);
  });

  test('Attraction region filter and rejected mutation keep database state consistent', async ({ page }) => {
    const state = await readE2eState();
    const northId = `${state.prefix}-ATTRACTION-N`;
    const centralId = `${state.prefix}-ATTRACTION-C`;
    const existingPhotoId = `${state.prefix}-ATTRACTION-PHOTO`;
    const missingPhotoId = `${state.prefix}-ATTRACTION-PHOTO-MISSING`;
    const admin = getAdminClient();
    await login(page, state.admin);
    const attraction = (id: string, region: 'north' | 'central') => ({ id, region, type: 'museum', name: `${region} E2E attraction`, dest: 'E2E destination', hours: '', closed: '', admission: '', duration: 1, best_time: '', crowd: '', book_req: false, seasonal: '', notes: '', alert: '', phone: '', photoIds: [], linkedPhotoIds: [] });
    try {
      expect((await browserJson(page, '/api/attractions', { method: 'POST', body: { attraction: attraction(northId, 'north') } })).status).toBe(200);
      expect((await browserJson(page, '/api/attractions', { method: 'POST', body: { attraction: attraction(centralId, 'central') } })).status).toBe(200);
      const northRows = await browserJson(page, '/api/attractions/all?region=north');
      expect(northRows.status).toBe(200);
      expect(JSON.stringify(northRows.body)).toContain(northId);
      expect(JSON.stringify(northRows.body)).not.toContain(centralId);
      expect((await browserJson(page, '/api/attractions', { method: 'POST', body: { attraction: { ...attraction(`${northId}-BAD`, 'north'), name: '' } } })).status).toBe(422);
      expect(await assertRow('attractions', 'id', `${northId}-BAD`)).toBeNull();

      const { error: photoError } = await admin
        .from('photos')
        .insert({ id: existingPhotoId, caption: 'E2E attraction photo', region: 'north' });
      if (photoError) throw photoError;
      const originalAttraction = {
        ...attraction(northId, 'north'),
        name: 'Attraction before failed photo update',
        photoIds: [existingPhotoId],
        linkedPhotoIds: [existingPhotoId],
      };
      expect((await browserJson(page, '/api/attractions', { method: 'PATCH', body: { attraction: originalAttraction } })).status).toBe(200);

      const failedAttraction = {
        ...originalAttraction,
        name: 'Attraction name must roll back',
        photoIds: [missingPhotoId],
        linkedPhotoIds: [missingPhotoId],
      };
      expect((await browserJson(page, '/api/attractions', { method: 'PATCH', body: { attraction: failedAttraction } })).status).toBe(500);
      expect((await assertRow('attractions', 'id', northId))?.name).toBe(originalAttraction.name);
      const { data: photoLinks, error: photoLinksError } = await admin
        .from('attraction_photos')
        .select('photo_id')
        .eq('attraction_id', northId);
      if (photoLinksError) throw photoLinksError;
      expect(photoLinks?.map((link) => link.photo_id)).toEqual([existingPhotoId]);

      expect((await browserJson(page, '/api/attractions', {
        method: 'PATCH',
        body: { attraction: { ...attraction(`${northId}-MISSING`, 'north'), name: 'Missing attraction' } },
      })).status).toBe(404);
      expect((await browserJson(page, '/api/attractions', {
        method: 'DELETE',
        body: { id: `${northId}-MISSING` },
      })).status).toBe(404);
      expect((await browserJson(page, '/api/attractions', {
        method: 'DELETE', body: { id: centralId },
      })).status).toBe(200);
      expect(await assertRow('attractions', 'id', centralId)).toBeNull();
    } finally {
      await admin.from('photos').delete().eq('id', existingPhotoId);
    }
  });
});
