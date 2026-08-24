import { createHash } from 'node:crypto';


type Bucket = {
  failures: number;
  windowStart: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const REFRESH_WINDOW_MS = 60 * 1000;
const MAX_REFRESHES = 30;

const WINDOW_SECONDS = WINDOW_MS / 1000;

function hashClientIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

function redisRateLimitKey(ip: string): string {
  return `auth:login-rate:${hashClientIp(ip)}`;
}

function redisRefreshRateLimitKey(ip: string): string {
  return `auth:refresh-rate:${hashClientIp(ip)}`;
}

async function getRateLimitRedisClient() {
  if (!process.env.REDIS_URL) return null;

  const { getRedisClient } = await import('@/lib/redis/client');
  return getRedisClient();
}

const buckets = new Map<string, Bucket>();
const refreshBuckets = new Map<string, Bucket>();

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > WINDOW_MS) buckets.delete(key);
  }
}

/** Returns true when the client may attempt login. */
function checkLoginRateLimitFallback(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket) return { ok: true };
  if (now - bucket.windowStart > WINDOW_MS) {
    buckets.delete(key);
    return { ok: true };
  }
  if (bucket.failures >= MAX_FAILURES) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - bucket.windowStart)) / 1000);
    return { ok: false, retryAfterSec: Math.max(retryAfterSec, 1) };
  }
  return { ok: true };
}

function recordLoginFailureFallback(key: string) {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(key, { failures: 1, windowStart: now });
    return;
  }
  bucket.failures += 1;
}

function clearLoginFailuresFallback(key: string) {
  buckets.delete(key);
}

/** Kiểm tra IP còn được thử đăng nhập hay không. */
export async function checkLoginRateLimit(
  ip: string,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const client = await getRateLimitRedisClient();

  if (!client) return checkLoginRateLimitFallback(ip);

  try {
    const key = redisRateLimitKey(ip);
    const failures = Number((await client.get(key)) ?? '0');

    if (failures < MAX_FAILURES) return { ok: true };

    const ttlSeconds = await client.ttl(key);

    return {
      ok: false,
      retryAfterSec: Math.max(ttlSeconds, 1),
    };
  } catch {
    return checkLoginRateLimitFallback(ip);
  }
}

/** Tăng số lần đăng nhập sai, hết hạn sau 15 phút kể từ lần sai đầu tiên. */
export async function recordLoginFailure(ip: string): Promise<void> {
  const client = await getRateLimitRedisClient();

  if (!client) {
    recordLoginFailureFallback(ip);
    return;
  }

  try {
    await client.eval(
      `
        local failures = redis.call('INCR', KEYS[1])
        if failures == 1 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        return failures
      `,
      {
        keys: [redisRateLimitKey(ip)],
        arguments: [String(WINDOW_SECONDS)],
      },
    );
  } catch {
    recordLoginFailureFallback(ip);
  }
}

/** Đăng nhập thành công thì xóa số lần sai của IP đó. */
export async function clearLoginFailures(ip: string): Promise<void> {
  const client = await getRateLimitRedisClient();

  if (!client) {
    clearLoginFailuresFallback(ip);
    return;
  }

  try {
    await client.del(redisRateLimitKey(ip));
  } catch {
    clearLoginFailuresFallback(ip);
  }
}

/**
 * Consume one refresh attempt. Redis uses one atomic counter per IP; when it
 * is unavailable, an in-process counter keeps a single instance bounded.
 */
export async function consumeRefreshRateLimit(
  ip: string,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const now = Date.now();
  const fallbackKey = hashClientIp(ip);
  const client = await getRateLimitRedisClient();

  if (client) {
    try {
      const count = Number(await client.eval(
        `
          local attempts = redis.call('INCR', KEYS[1])
          if attempts == 1 then
            redis.call('EXPIRE', KEYS[1], ARGV[1])
          end
          return attempts
        `,
        {
          keys: [redisRefreshRateLimitKey(ip)],
          arguments: [String(REFRESH_WINDOW_MS / 1000)],
        },
      ));
      if (count <= MAX_REFRESHES) return { ok: true };
      const ttl = await client.ttl(redisRefreshRateLimitKey(ip));
      return { ok: false, retryAfterSec: Math.max(ttl, 1) };
    } catch {
      // Fall through to the local limiter without making Redis a hard dependency.
    }
  }

  const bucket = refreshBuckets.get(fallbackKey);
  if (!bucket || now - bucket.windowStart >= REFRESH_WINDOW_MS) {
    refreshBuckets.set(fallbackKey, { failures: 1, windowStart: now });
    return { ok: true };
  }
  bucket.failures += 1;
  if (bucket.failures <= MAX_REFRESHES) return { ok: true };
  return {
    ok: false,
    retryAfterSec: Math.max(1, Math.ceil((REFRESH_WINDOW_MS - (now - bucket.windowStart)) / 1000)),
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}
