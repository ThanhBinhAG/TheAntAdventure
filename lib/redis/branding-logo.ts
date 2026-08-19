import 'server-only';

import { cacheGet, cacheSet, cacheDel } from './cache-helper';

const COMPANY_LOGO_CACHE_KEY = 'cache:branding:logo';
const COMPANY_LOGO_CACHE_TTL_SECONDS = 60 * 60;

/**
 * undefined: Redis không có cache hoặc Redis lỗi.
 * null: đã cache trạng thái không có logo tùy chỉnh.
 * string: URL logo tùy chỉnh.
 */
export async function getCachedCompanyLogo(): Promise<string | null | undefined> {
    const value = await cacheGet<unknown>(COMPANY_LOGO_CACHE_KEY);

    if (value === null) return undefined;

    if (value === null || typeof value === 'string') {
        return value;
    }

    return undefined;
}

export async function setCachedCompanyLogo(logoUrl: string | null): Promise<void> {
    await cacheSet(
        COMPANY_LOGO_CACHE_KEY,
        logoUrl,
        COMPANY_LOGO_CACHE_TTL_SECONDS,
    );
}

export async function invalidateCompanyLogoCache(): Promise<void> {
    await cacheDel(COMPANY_LOGO_CACHE_KEY);
}
