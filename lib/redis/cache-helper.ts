import 'server-only';

import { getRedisClient } from '@/lib/redis/client';

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
    console.warn(`[Redis Cache Error] Không thể đọc key "${key}":`, error);
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
    console.warn(`[Redis Cache Error] Không thể ghi key "${key}":`, error);
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
    console.warn(`[Redis Cache Error] Không thể xóa key(s) "${key}":`, error);
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
    console.warn(`[Redis Cache Error] Không thể tăng key "${key}":`, error);
    return null;
  }
}

/**
 * Tìm và xóa toàn bộ các key khớp với pattern (sử dụng scanIterator).
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    const keys: string[] = [];
    for await (const key of client.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      keys.push(String(key));
    }

    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.warn(`[Redis Cache Error] Không thể invalidate pattern "${pattern}":`, error);
  }
}
