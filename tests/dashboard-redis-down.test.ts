import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

type RedisGlobal = typeof globalThis & {
  redisClient?: unknown;
  redisConnectPromise?: unknown;
};

async function withRedisUrlUnset<T>(fn: () => Promise<T>): Promise<T> {
  const original = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  const g = globalThis as RedisGlobal;
  const prevClient = g.redisClient;
  const prevPromise = g.redisConnectPromise;
  g.redisClient = undefined;
  g.redisConnectPromise = undefined;
  try {
    return await fn();
  } finally {
    if (original === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = original;
    g.redisClient = prevClient;
    g.redisConnectPromise = prevPromise;
  }
}

test('Dashboard cache invalidation does not throw when Redis is unset', async () => {
  await withRedisUrlUnset(async () => {
    const { invalidateDashboardCache } = await import('../lib/dashboard/dashboard-repository');
    await assert.doesNotReject(invalidateDashboardCache());
  });
});

test('Dashboard cache-aside helpers treat Redis-down as miss / no-op', async () => {
  await withRedisUrlUnset(async () => {
    const { cacheGet, cacheSet, cacheInvalidatePattern } = await import('../lib/redis/cache-helper');
    assert.equal(await cacheGet('cache:dashboard:v1:all:all'), null);
    assert.equal(await cacheSet('cache:dashboard:v1:all:all', { ok: true }, 45), false);
    await assert.doesNotReject(cacheInvalidatePattern('cache:dashboard:v1:*'));
  });
});
