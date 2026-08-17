import 'server-only';

import { getRedisClient } from '@/lib/redis/client';

const COMPANY_LOGO_CACHE_KEY = 'cache:branding:logo';
const COMPANY_LOGO_CACHE_TTL_SECONDS = 60 * 60;

/**
 * undefined: Redis không có cache hoặc Redis lỗi.
 * null: đã cache trạng thái không có logo tùy chỉnh.
 * string: URL logo tùy chỉnh.
 */
export async function getCachedCompanyLogo(): Promise<string | null | undefined> {
    const client = await getRedisClient();

    if (!client) return undefined;

    try {
        const raw = await client.get(COMPANY_LOGO_CACHE_KEY);

        if (raw === null) return undefined;

        const value: unknown = JSON.parse(raw);

        if (value === null || typeof value === 'string') return value;

        return undefined;
    } catch {
        return undefined;
    }
}

export async function setCachedCompanyLogo(logoUrl: string | null): Promise<void> {
    const client = await getRedisClient();

    if (!client) return;

    try {
        await client.set(
            COMPANY_LOGO_CACHE_KEY,
            JSON.stringify(logoUrl),
            { EX: COMPANY_LOGO_CACHE_TTL_SECONDS },
        );
    } catch {
        // Redis cache lỗi không được làm lỗi API logo.
    }
}

export async function invalidateCompanyLogoCache(): Promise<void> {
    const client = await getRedisClient();

    if (!client) return;

    try {
        await client.del(COMPANY_LOGO_CACHE_KEY);
    } catch {
        // Redis cache lỗi không được làm lỗi thao tác đổi/xóa logo.
    }
}

