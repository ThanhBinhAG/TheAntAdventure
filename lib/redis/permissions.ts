import 'server-only';

import type { PermissionCode } from '@/lib/auth/permissions';
import { getRedisClient } from '@/lib/redis/client';

const PERMISSION_VERSION_KEY = 'cache:permissions:version';
const PERMISSION_TTL_SECONDS = 5 * 60;

type PermissionCacheLookup = {
    version: string;
    permissionCodes: PermissionCode[] | undefined;
};

function permissionCacheKey(userId: string, version: string): string {
    return `cache:permissions:v${version}:${userId}`;
}

function parsePermissionCodes(raw: string | null): PermissionCode[] | undefined {
    if (raw === null) return undefined;

    try {
        const value: unknown = JSON.parse(raw);

        if (
            Array.isArray(value) &&
            value.every((code) => typeof code === 'string')
        ) {
            return value as PermissionCode[];
        }
    } catch {
        // Cache hỏng thì coi như cache miss.
        console.log("cache miss.")
    }

    return undefined;
}

/**
 * Đọc cache và giữ lại version đã dùng.
 * `version` này phải dùng lại lúc ghi cache để tránh ghi dữ liệu cũ vào version mới.
 */
export async function getCachedPermissionCodes(
    userId: string,
): Promise<PermissionCacheLookup> {
    const client = await getRedisClient();

    if (!client) {
        return { version: '0', permissionCodes: undefined };
    }

    try {
        const version = (await client.get(PERMISSION_VERSION_KEY)) ?? '0';
        const raw = await client.get(permissionCacheKey(userId, version));

        return {
            version,
            permissionCodes: parsePermissionCodes(raw),
        };
    } catch {
        return { version: '0', permissionCodes: undefined };
    }
}

export async function setCachedPermissionCodes(
    userId: string,
    version: string,
    permissionCodes: PermissionCode[],
): Promise<void> {
    const client = await getRedisClient();

    if (!client) return;

    try {
        await client.set(
            permissionCacheKey(userId, version),
            JSON.stringify(permissionCodes),
            { EX: PERMISSION_TTL_SECONDS },
        );
    } catch {
        // Redis lỗi không làm request permission thất bại.
    }
}

/** Gọi sau khi role hoặc permission thay đổi thành công. */
export async function invalidatePermissionCache(): Promise<void> {
    const client = await getRedisClient();

    if (!client) return;

    try {
        await client.incr(PERMISSION_VERSION_KEY);
    } catch {
        // TTL 60 giây vẫn là lớp bảo vệ cuối nếu Redis tạm lỗi.
    }
}