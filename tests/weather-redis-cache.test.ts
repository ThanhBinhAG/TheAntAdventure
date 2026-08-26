import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { createClient } from 'redis';

// Bypass server-only warning/error in tests
const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

import type { WeatherPageBoot } from '../lib/weather/boot';

test('Weather Redis Cache Integration Test', async (context) => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    context.skip('REDIS_URL is not configured. Skipping Redis integration test.');
    return;
  }

  // Dynamically import to ensure server-only mock is already set up in require.cache
  const {
    getWeatherCache,
    setWeatherCache,
    invalidateWeatherCache,
    getDestinationWeatherCache,
    setDestinationWeatherCache,
    invalidateDestinationWeatherCache,
    setLastFetchSuccessRedis,
    hasRecentFetchSuccessRedis
  } = await import('../lib/weather/redis-cache');
  const { isWeatherCacheConfigured } = await import('../lib/weather/cache');

  // 1. Verify cache configuration check
  assert.equal(isWeatherCacheConfigured(), true, 'Cache should be configured when REDIS_URL is set');

  const client = createClient({ url: redisUrl });
  await client.connect();

  const mockPayload: WeatherPageBoot = {
    destinations: [
      {
        id: 'test-hanoi',
        name: 'Hà Nội Test',
        region: 'north',
        emoji: '🏛️',
        latitude: 21.0285,
        longitude: 105.8542,
        isFeatured: true,
        active: true,
        sortOrder: 1,
        elevationM: 10,
        description: 'Test description',
        notes: 'Test notes',
        coverPhotoId: null,
        coverUrl: null,
        coverThumbUrl: null,
      }
    ],
    featuredWeather: [
      {
        id: 'test-hanoi',
        name: 'Hà Nội Test',
        region: 'north',
        emoji: '🏛️',
        coverUrl: null,
        coverPhotoId: null,
        description: 'Test description',
        current: {
          tempC: 30,
          humidity: 70,
          feelsLikeC: 33,
          weatherCode: 1,
          windKmh: 10
        },
        days: [],
        fetchedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  };

  try {
    // 2. Test Invalidation first to start clean
    await invalidateWeatherCache();

    // 3. Test getWeatherCache returns null on cache miss
    const cachedMiss = await getWeatherCache();
    assert.equal(cachedMiss, null, 'Cache should be null before any set');

    // 4. Test setWeatherCache stores payload
    await setWeatherCache(mockPayload);

    // 5. Test getWeatherCache returns correct payload (cache hit)
    const cachedHit = await getWeatherCache();
    assert.notEqual(cachedHit, null, 'Cache should not be null after set');
    assert.equal(cachedHit?.destinations[0].id, 'test-hanoi', 'Cached destination ID should match');
    assert.equal(cachedHit?.featuredWeather[0].current.tempC, 30, 'Cached tempC should match');

    // 6. Verify TTL is 24 hours (86400 seconds)
    const ttl = await client.ttl('weather:guide');
    assert.ok(ttl > 0 && ttl <= 24 * 60 * 60, `TTL should be close to 24h, got ${ttl}`);

    // 7. Test invalidateWeatherCache clears payload
    await invalidateWeatherCache();
    const cachedAfterInvalidate = await getWeatherCache();
    assert.equal(cachedAfterInvalidate, null, 'Cache should be null after invalidation');

    // 8. Test Single Destination Cache
    const destId = 'test-hanoi';
    await invalidateDestinationWeatherCache(destId);
    
    const destMiss = await getDestinationWeatherCache(destId);
    assert.equal(destMiss, null, 'Destination cache should be null before set');

    const destPayload = {
      current: { tempC: 25, humidity: 80, feelsLikeC: 26, weatherCode: 2, windKmh: 15 },
      days: []
    };
    const fetchedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now

    await setDestinationWeatherCache(destId, destPayload, fetchedAt, expiresAt);

    const destHit = await getDestinationWeatherCache(destId);
    assert.notEqual(destHit, null, 'Destination cache should not be null after set');
    assert.equal(destHit?.payload.current.tempC, 25);
    assert.equal(destHit?.fetchedAt, fetchedAt);

    const destTtl = await client.ttl(`weather:destination:${destId}`);
    assert.ok(destTtl > 0 && destTtl <= 10 * 60, `Destination TTL should be around 10m, got ${destTtl}`);

    await invalidateDestinationWeatherCache(destId);
    const destAfterInvalidate = await getDestinationWeatherCache(destId);
    assert.equal(destAfterInvalidate, null, 'Destination cache should be null after invalidate');

    // 9. Test Rate Limiting helpers
    const initialRateLimit = await hasRecentFetchSuccessRedis();
    assert.equal(initialRateLimit, false, 'Should not be rate limited initially');

    await setLastFetchSuccessRedis();
    const postRateLimit = await hasRecentFetchSuccessRedis();
    assert.equal(postRateLimit, true, 'Should be rate limited after setting last fetch success');

    const rateLimitTtl = await client.ttl('weather:last_fetch_success');
    assert.ok(rateLimitTtl > 0 && rateLimitTtl <= 5 * 60, 'Rate limit key TTL should be 5 mins');

  } finally {
    // Clean up keys
    await client.del('weather:guide');
    await client.del('weather:destination:test-hanoi');
    await client.del('weather:last_fetch_success');
    if (client.isOpen) {
      await client.quit();
    }
    const { getRedisClient } = await import('../lib/redis/client');
    const sharedClient = await getRedisClient();
    if (sharedClient?.isOpen) await sharedClient.quit();
  }
});
