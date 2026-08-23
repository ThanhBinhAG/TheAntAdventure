import 'server-only';

import type { PermissionCode } from '@/lib/auth/permissions';
import { cacheGet, cacheSet, cacheIncr } from './cache-helper';

const PERMISSION_VERSION_KEY = 'cache:permissions:version';
const PERMISSION_TTL_SECONDS = 5 * 60;

type PermissionCacheLookup = {
    version: string;
    permissionCodes: PermissionCode[] | undefined;
};

function permissionCacheKey(userId: string, version: string): string {
    return `cache:permissions:v${version}:${userId}`;
}

/**
 * Đọc cache và giữ lại version đã dùng.
 * `version` này phải dùng lại lúc ghi cache để tránh ghi dữ liệu cũ vào version mới.
 */
export async function getCachedPermissionCodes(
    userId: string,
): Promise<PermissionCacheLookup> {
    const version = (await cacheGet<string>(PERMISSION_VERSION_KEY)) ?? '0';
    const permissionCodes = await cacheGet<PermissionCode[]>(permissionCacheKey(userId, version));

    return {
        version,
        permissionCodes: permissionCodes ?? undefined,
    };
}

export async function setCachedPermissionCodes(
    userId: string,
    version: string,
    permissionCodes: PermissionCode[],
): Promise<void> {
    await cacheSet(
        permissionCacheKey(userId, version),
        permissionCodes,
        PERMISSION_TTL_SECONDS,
    );
}

/** Gọi sau khi role hoặc permission thay đổi thành công. */
export async function invalidatePermissionCache(): Promise<void> {
    await cacheIncr(PERMISSION_VERSION_KEY);
}