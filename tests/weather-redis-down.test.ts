import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import type { WeatherPageBoot } from '../lib/weather/boot';

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

const emptyBoot: WeatherPageBoot = {
  destinations: [],
  featuredWeather: [],
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

test('Weather Redis helpers soft-fail when REDIS_URL is unset', async () => {
  await withRedisUrlUnset(async () => {
    const {
      getWeatherCache,
      setWeatherCache,
      invalidateWeatherCache,
      getDestinationWeatherCache,
      setDestinationWeatherCache,
      invalidateDestinationWeatherCache,
      hasRecentFetchSuccessRedis,
      setLastFetchSuccessRedis,
    } = await import('../lib/weather/redis-cache');
    const { isWeatherCacheConfigured } = await import('../lib/weather/cache');

    assert.equal(isWeatherCacheConfigured(), false);
    assert.equal(await getWeatherCache(), null);
    assert.equal(await setWeatherCache(emptyBoot), false);
    await assert.doesNotReject(invalidateWeatherCache());

    assert.equal(await getDestinationWeatherCache('hanoi'), null);
    assert.equal(
      await setDestinationWeatherCache(
        'hanoi',
        {
          current: {
            tempC: 0,
            humidity: 0,
            feelsLikeC: 0,
            weatherCode: 0,
            windKmh: 0,
          },
          days: [],
        },
        new Date().toISOString(),
        new Date(Date.now() + 60_000).toISOString(),
      ),
      false,
    );
    await assert.doesNotReject(invalidateDestinationWeatherCache('hanoi'));
    assert.equal(await hasRecentFetchSuccessRedis(), false);
    await assert.doesNotReject(setLastFetchSuccessRedis());
  });
});

test('Weather invalidate swallows Redis del failures', async () => {
  const original = process.env.REDIS_URL;
  process.env.REDIS_URL = original || 'redis://127.0.0.1:6379';

  const g = globalThis as RedisGlobal;
  const prevClient = g.redisClient;
  const prevPromise = g.redisConnectPromise;

  const throwingClient = {
    isOpen: true,
    isReady: true,
    del: async () => {
      throw new Error('Redis del failed');
    },
  };
  g.redisClient = throwingClient;
  g.redisConnectPromise = undefined;

  try {
    const {
      invalidateWeatherCache,
      invalidateDestinationWeatherCache,
    } = await import('../lib/weather/redis-cache');
    await assert.doesNotReject(invalidateWeatherCache());
    await assert.doesNotReject(invalidateDestinationWeatherCache('hanoi'));
  } finally {
    if (original === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = original;
    g.redisClient = prevClient;
    g.redisConnectPromise = prevPromise;
  }
});
