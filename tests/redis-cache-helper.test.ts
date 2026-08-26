import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

// Bypass server-only warning/error in tests
const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

test('Redis Cache Helper - Core Operations & Invalidation', async (t) => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    t.skip('REDIS_URL is not configured. Skipping active Redis tests.');
    return;
  }

  // Import real cache helpers when Redis is available
  const { cacheGet, cacheSet, cacheDel, cacheIncr, cacheInvalidatePattern } = await import('../lib/redis/cache-helper');

  await t.test('Set and Get JSON data correctly', async () => {
    const key = 'cache:test:set-get';
    const payload = { id: 1, name: 'Antigravity', active: true };

    const setOk = await cacheSet(key, payload, 60);
    assert.equal(setOk, true, 'cacheSet should return true on success');

    const retrieved = await cacheGet<typeof payload>(key);
    assert.deepEqual(retrieved, payload, 'retrieved value should match stored payload');
  });

  await t.test('Incr increments integer keys', async () => {
    const key = 'cache:test:incr';
    await cacheDel(key); // Start clean

    const first = await cacheIncr(key);
    assert.equal(first, 1, 'first increment should initialize key to 1');

    const second = await cacheIncr(key);
    assert.equal(second, 2, 'second increment should return 2');
  });

  await t.test('Del deletes keys', async () => {
    const key = 'cache:test:del';
    await cacheSet(key, { value: 100 });

    const delOk = await cacheDel(key);
    assert.equal(delOk, true);

    const retrieved = await cacheGet(key);
    assert.equal(retrieved, null, 'key should be deleted');
  });

  await t.test('InvalidatePattern deletes keys matching wildcard', async () => {
    const key1 = 'cache:test:pattern:1';
    const key2 = 'cache:test:pattern:2';
    const key3 = 'cache:test:other:1';

    await cacheSet(key1, 'data1');
    await cacheSet(key2, 'data2');
    await cacheSet(key3, 'data3');

    await cacheInvalidatePattern('cache:test:pattern:*');

    assert.equal(await cacheGet(key1), null, 'key1 matching pattern should be invalidated');
    assert.equal(await cacheGet(key2), null, 'key2 matching pattern should be invalidated');
    assert.equal(await cacheGet(key3), 'data3', 'key3 not matching pattern should NOT be invalidated');

    await cacheDel(key3);
  });

  // The app cache uses a process-global Redis client. Close it here so this
  // integration test does not keep Node's test worker alive after completion.
  const { getRedisClient } = await import('../lib/redis/client');
  const sharedClient = await getRedisClient();
  if (sharedClient?.isOpen) await sharedClient.quit();
});

test('Redis Cache Helper - Graceful Degradation (Redis Offline)', async (t) => {
  const originalRedisUrl = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  try {
    const { cacheGet, cacheSet, cacheDel, cacheIncr } = await import('../lib/redis/cache-helper');

    await t.test('cacheGet returns null without a Redis connection', async () => {
      const value = await cacheGet('some-key');
      assert.equal(value, null, 'should return null gracefully without Redis');
    });

    await t.test('cacheSet returns false without a Redis connection', async () => {
      const success = await cacheSet('some-key', { value: 1 });
      assert.equal(success, false, 'should return false gracefully without Redis');
    });

    await t.test('cacheDel returns false without a Redis connection', async () => {
      const success = await cacheDel('some-key');
      assert.equal(success, false, 'should return false gracefully without Redis');
    });

    await t.test('cacheIncr returns null without a Redis connection', async () => {
      const value = await cacheIncr('some-key');
      assert.equal(value, null, 'should return null gracefully without Redis');
    });
  } finally {
    if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedisUrl;
  }
});
