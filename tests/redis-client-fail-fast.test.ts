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

test('a refused Redis connection fails fast without retrying the request path', async () => {
  const previousUrl = process.env.REDIS_URL;
  const previousTimeout = process.env.REDIS_CONNECT_TIMEOUT_MS;
  const globals = globalThis as typeof globalThis & {
    redisClient?: { destroy?: () => void };
    redisConnectPromise?: unknown;
  };
  const previousClient = globals.redisClient;
  const previousPromise = globals.redisConnectPromise;
  globals.redisClient = undefined;
  globals.redisConnectPromise = undefined;
  process.env.REDIS_URL = 'redis://127.0.0.1:6399';
  process.env.REDIS_CONNECT_TIMEOUT_MS = '250';

  try {
    const { getRedisClient } = await import('../lib/redis/client');
    const startedAt = Date.now();
    assert.equal(await getRedisClient(), null);
    assert.ok(Date.now() - startedAt < 1_000, 'a cache miss must not wait through Redis reconnect retries');
  } finally {
    globals.redisClient = previousClient;
    globals.redisConnectPromise = previousPromise;
    if (previousUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousUrl;
    if (previousTimeout === undefined) delete process.env.REDIS_CONNECT_TIMEOUT_MS;
    else process.env.REDIS_CONNECT_TIMEOUT_MS = previousTimeout;
  }
});
