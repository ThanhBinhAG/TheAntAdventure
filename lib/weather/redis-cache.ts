import { getRedisClient } from '@/lib/redis/client';
import type { WeatherPageBoot } from './boot';

/**
 * Key used for storing the entire weather guide payload in Redis.
 * Shared key as requested by the user.
 */
const WEATHER_GUIDE_KEY = 'weather:guide';

/** TTL in seconds – 24 hours */
const WEATHER_TTL_SECONDS = 24 * 60 * 60;

/**
 * Retrieve the cached weather guide payload from Redis.
 * Returns `null` if the key does not exist or Redis cannot be reached.
 */
export async function getWeatherCache(): Promise<WeatherPageBoot | null> {
  const client = await getRedisClient();
  if (!client) return null;
  try {
    const raw = await client.get(WEATHER_GUIDE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeatherPageBoot;
  } catch {
    // Any parsing or Redis error is treated as cache miss.
    return null;
  }
}

/**
 * Store the weather guide payload in Redis with a 24‑hour expiration.
 */
export async function setWeatherCache(payload: WeatherPageBoot): Promise<void> {
  const client = await getRedisClient();
  if (!client) throw new Error('Redis unavailable');
  const value = JSON.stringify(payload);
  await client.set(WEATHER_GUIDE_KEY, value, { EX: WEATHER_TTL_SECONDS });
}

/** Invalidate the cache (used by the refresh endpoint). */
export async function invalidateWeatherCache(): Promise<void> {
  const client = await getRedisClient();
  if (!client) return; // nothing to do if Redis is down
  await client.del(WEATHER_GUIDE_KEY);
}
