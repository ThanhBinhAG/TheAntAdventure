import 'server-only';
import { createHash } from 'node:crypto';
import {
  GALLERY_BYTES_PER_HOUR_PER_USER,
  GALLERY_UPLOADS_PER_HOUR_PER_USER,
} from '@/lib/storage/photo-limits';

/**
 * Per-user gallery upload quota (fixed 1h window).
 * Redis is shared across Node instances; the in-memory bucket is a fallback only.
 */

type Bucket = {
  count: number;
  bytes: number;
  windowStart: number;
};

const WINDOW_MS = 60 * 60 * 1000;
const WINDOW_SECONDS = WINDOW_MS / 1000;

const buckets = new Map<string, Bucket>();

function galleryRateLimitKey(userId: string): string {
  const hash = createHash('sha256')
    .update(userId || 'anonymous')
    .digest('hex');

  return `rate:gallery-upload:${hash}`;
}

async function getGalleryRateLimitRedisClient() {
  if (!process.env.REDIS_URL) return null;

  const { getRedisClient } = await import('@/lib/redis/client');
  return getRedisClient();
}

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) buckets.delete(key);
  }
}

export type GalleryRateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Fallback for when Redis is unavailable. This is process-local, so it must
 * never be relied on as the distributed rate limit in production.
 */
function checkAndRecordGalleryUploadRateLimitFallback(
  userId: string,
  bytes: number
): GalleryRateLimitResult {
  const now = Date.now();
  prune(now);

  const key = userId || 'anonymous';
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    bucket = { count: 0, bytes: 0, windowStart: now };
    buckets.set(key, bucket);
  }

  if (
    bucket.count >= GALLERY_UPLOADS_PER_HOUR_PER_USER ||
    bucket.bytes + bytes > GALLERY_BYTES_PER_HOUR_PER_USER
  ) {
    const retryAfterSec = Math.max(Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000), 1);
    return { ok: false, retryAfterSec };
  }

  bucket.count += 1;
  bucket.bytes += bytes;
  return { ok: true };
}

/**
 * Checks the hourly quota and records an accepted upload in one Redis Lua
 * operation. A Hash keeps count and byte fields together; EXPIRE preserves
 * the existing fixed window from the first attempt.
 */
export async function checkAndRecordGalleryUploadRateLimit(
  userId: string,
  bytes: number
): Promise<GalleryRateLimitResult> {
  const client = await getGalleryRateLimitRedisClient();

  if (!client) {
    return checkAndRecordGalleryUploadRateLimitFallback(userId, bytes);
  }

  try {
    const result = (await client.eval(
      `
        local ttl = redis.call('TTL', KEYS[1])

        if ttl < 0 then
          redis.call('HSET', KEYS[1], 'count', 0, 'bytes', 0)
          redis.call('EXPIRE', KEYS[1], ARGV[4])
          ttl = tonumber(ARGV[4])
        end

        local count = tonumber(redis.call('HGET', KEYS[1], 'count'))
        local totalBytes = tonumber(redis.call('HGET', KEYS[1], 'bytes'))
        local nextBytes = totalBytes + tonumber(ARGV[1])

        if count + 1 > tonumber(ARGV[2]) or nextBytes > tonumber(ARGV[3]) then
          return { 0, ttl }
        end

        redis.call('HINCRBY', KEYS[1], 'count', 1)
        redis.call('HINCRBY', KEYS[1], 'bytes', ARGV[1])

        return { 1, ttl }
      `,
      {
        keys: [galleryRateLimitKey(userId)],
        arguments: [
          String(bytes),
          String(GALLERY_UPLOADS_PER_HOUR_PER_USER),
          String(GALLERY_BYTES_PER_HOUR_PER_USER),
          String(WINDOW_SECONDS),
        ],
      }
    )) as unknown as [number, number];

    if (result[0] === 1) return { ok: true };

    return { ok: false, retryAfterSec: Math.max(result[1], 1) };
  } catch {
    return checkAndRecordGalleryUploadRateLimitFallback(userId, bytes);
  }
}

/** Test-only: clear a fallback-RAM bucket so tests do not bleed into each other. */
export function resetGalleryUploadRateLimit(userId: string): void {
  buckets.delete(userId || 'anonymous');
}
