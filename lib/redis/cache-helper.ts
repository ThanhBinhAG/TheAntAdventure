import 'server-only';

import { getRedisClient } from '@/lib/redis/client';
import { serverLogger } from '@/lib/system/server-logger';

const INVALIDATION_DELETE_BATCH_SIZE = 100;

/**
 * Lấy dữ liệu từ Redis cache.
 * Tự động parse JSON. Trả về null nếu có lỗi hoặc không có cache.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;

    const raw = await client.get(key);
    if (raw === null) return null;

    return JSON.parse(raw) as T;
  } catch (error) {
    serverLogger.warn({ scope: 'redis/cache', event: 'redis.cache.read_failed', err: error }, 'Redis cache read failed');
    return null;
  }
}

/**
 * Thiết lập dữ liệu vào Redis cache.
 * Tự động stringify JSON. Trả về false nếu thất bại.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) return false;

    const raw = JSON.stringify(value);
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      await client.set(key, raw, { EX: ttlSeconds });
    } else {
      await client.set(key, raw);
    }
    return true;
  } catch (error) {
    serverLogger.warn({ scope: 'redis/cache', event: 'redis.cache.write_failed', err: error }, 'Redis cache write failed');
    return false;
  }
}

/**
 * Xóa một hoặc nhiều key khỏi Redis cache.
 * Trả về false nếu thất bại.
 */
export async function cacheDel(key: string | string[]): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) return false;

    const keysToDelete = Array.isArray(key) ? key : [key];
    if (keysToDelete.length === 0) return true;

    await client.del(keysToDelete);
    return true;
  } catch (error) {
    serverLogger.warn({ scope: 'redis/cache', event: 'redis.cache.delete_failed', err: error }, 'Redis cache delete failed');
    return false;
  }
}

/**
 * Tăng giá trị nguyên của một key lên 1 đơn vị.
 * Trả về giá trị mới sau khi tăng, hoặc null nếu lỗi.
 */
export async function cacheIncr(key: string): Promise<number | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;

    return await client.incr(key);
  } catch (error) {
    serverLogger.warn({ scope: 'redis/cache', event: 'redis.cache.increment_failed', err: error }, 'Redis cache increment failed');
    return null;
  }
}

/**
 * Tìm và xóa các key khớp với pattern theo từng SCAN/DEL batch. Không gom
 * toàn bộ key vào RAM, và Redis lỗi không được làm hỏng mutation chính.
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    for await (const batch of client.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      const scannedKeys = Array.isArray(batch) ? batch : [batch];
      const keys = scannedKeys.map((key) => String(key));
      for (let offset = 0; offset < keys.length; offset += INVALIDATION_DELETE_BATCH_SIZE) {
        await client.del(keys.slice(offset, offset + INVALIDATION_DELETE_BATCH_SIZE));
      }
    }
  } catch (error) {
    serverLogger.warn({ scope: 'redis/cache', event: 'redis.cache.invalidate_failed', err: error }, 'Redis cache invalidation failed');
  }
}
