import 'server-only';

import { createClient } from 'redis';

type RedisClient = ReturnType<
    // node-redis uses {} for no modules, functions, scripts, or type mapping extensions.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    typeof createClient<{}, {}, {}, 3, {}>
>;

type RedisGlobal = typeof globalThis & {
    redisClient?: RedisClient;
    redisConnectPromise?: Promise<RedisClient | null>;
};

const globalForRedis = globalThis as RedisGlobal;

function getConnectTimeoutMs(): number {
    const value = Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 1000);
    return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 5_000) : 1000;
}

function createRedisClient(): RedisClient {
    // node-redis uses {} for no modules, functions, scripts, or type mapping extensions.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const client = createClient<{}, {}, {}, 3, {}>({
        url: process.env.REDIS_URL,
        socket: {
            connectTimeout: getConnectTimeoutMs(),
            reconnectStrategy: (retries) => {
                // Thử kết nối lại tối đa 3 lần với khoảng cách 1 giây để xử lý các sự cố mạng tạm thời
                if (retries >= 3) {
                    return false; // Ngừng thử và kích hoạt lỗi kết nối thất bại hẳn
                }
                return 1000;
            },
        },
    });

    client.on('error', (err) => {
        console.warn('Redis client connection failed:', err);
    });

    return client;
}

export async function getRedisClient(): Promise<RedisClient | null> {
    if (!process.env.REDIS_URL) return null;

    let client = globalForRedis.redisClient;

    // Nếu client đã tồn tại nhưng không còn mở (bị đóng/ngắt kết nối hẳn), dọn dẹp và tạo client mới
    if (client && !client.isOpen && !globalForRedis.redisConnectPromise) {
        client = undefined;
        globalForRedis.redisClient = undefined;
    }

    if (!client) {
        client = createRedisClient();
        globalForRedis.redisClient = client;
    }

    if (client.isReady) return client;
    if (globalForRedis.redisConnectPromise) return globalForRedis.redisConnectPromise;

    const connectPromise = client
        .connect()
        .then(() => client)
        .catch(() => {
            try {
                client.destroy();
            } catch {
                // Nuốt lỗi an toàn nếu socket đã đóng sẵn
            }
            if (globalForRedis.redisClient === client) {
                globalForRedis.redisClient = undefined;
            }
            return null;
        });

    globalForRedis.redisConnectPromise = connectPromise;

    void connectPromise.then(() => {
        if (globalForRedis.redisConnectPromise === connectPromise) {
            globalForRedis.redisConnectPromise = undefined;
        }
    });

    return connectPromise;
}

export type RedisHealth = {
    configured: boolean;
    ok: boolean;
    latencyMs: number;
};

export async function checkRedisHealth(): Promise<RedisHealth> {
    if (!process.env.REDIS_URL) {
        return { configured: false, ok: false, latencyMs: 0 };
    }

    const startedAt = Date.now();
    const client = await getRedisClient();

    if (!client) {
        return { configured: true, ok: false, latencyMs: Date.now() - startedAt };
    }

    try {
        await client.ping();
        return { configured: true, ok: true, latencyMs: Date.now() - startedAt };
    } catch {
        return { configured: true, ok: false, latencyMs: Date.now() - startedAt };
    }
}
