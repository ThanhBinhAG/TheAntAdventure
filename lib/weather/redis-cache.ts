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

export type DestinationCachePayload = {
  payload: {
    current: any;
    days: any[];
  };
  fetchedAt: string;
  expiresAt: string;
};

function getDestinationKey(destinationId: string): string {
  return `weather:destination:${destinationId}`;
}

export async function getDestinationWeatherCache(destinationId: string): Promise<DestinationCachePayload | null> {
  const client = await getRedisClient();
  if (!client) return null;
  try {
    const raw = await client.get(getDestinationKey(destinationId));
    if (!raw) return null;
    return JSON.parse(raw) as DestinationCachePayload;
  } catch {
    return null;
  }
}

export async function setDestinationWeatherCache(
  destinationId: string,
  payload: { current: any; days: any[] },
  fetchedAt: string,
  expiresAt: string
): Promise<void> {
  const client = await getRedisClient();
  if (!client) throw new Error('Redis unavailable');
  const cacheData: DestinationCachePayload = {
    payload,
    fetchedAt,
    expiresAt,
  };
  const value = JSON.stringify(cacheData);
  // Calculate TTL based on expiresAt or default to 24h
  const ttl = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const finalTtl = ttl > 0 ? ttl : WEATHER_TTL_SECONDS;
  await client.set(getDestinationKey(destinationId), value, { EX: finalTtl });
}

export async function invalidateDestinationWeatherCache(destinationId: string): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  await client.del(getDestinationKey(destinationId));
}

const WEATHER_LAST_FETCH_SUCCESS_KEY = 'weather:last_fetch_success';
const RATE_LIMIT_SECONDS = 5 * 60; // 5 minutes

export async function setLastFetchSuccessRedis(): Promise<void> {
  const client = await getRedisClient();
  if (!client) return;
  await client.set(WEATHER_LAST_FETCH_SUCCESS_KEY, 'true', { EX: RATE_LIMIT_SECONDS });
}

export async function hasRecentFetchSuccessRedis(): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return false;
  const value = await client.get(WEATHER_LAST_FETCH_SUCCESS_KEY);
  return value === 'true';
}


