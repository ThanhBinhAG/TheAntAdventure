import 'server-only';

import { createHash } from 'node:crypto';
import type {
    ProductListFacets,
    ProductListFilters,
} from '@/lib/products/product-list-input';
import { getRedisClient } from './client';

const PRODUCT_FACETS_TTL_SECONDS = 5 * 60;

function getFacetsCacheKey(input: ProductListFilters) {
    const filters = {
        q: input.q ?? null,
        region: input.region ?? null,
        duration: input.duration ?? null,
        category: input.category ?? null,
        destination: input.destination ?? null,
        pricingStatus: input.pricingStatus ?? null,
    };

    const hash = createHash('sha256')
        .update(JSON.stringify(filters))
        .digest('hex')
        .slice(0, 16);

    return `cache:products:facets:v1:${hash}`;
}

export async function getCachedProductFacets(
    input: ProductListFilters,
): Promise<ProductListFacets | undefined> {
    try {
        const client = await getRedisClient();
        if (!client) return undefined;

        const cached = await client.get(getFacetsCacheKey(input));
        return cached ? JSON.parse(cached) as ProductListFacets : undefined;
    } catch {
        return undefined;
    }
}

export async function setCachedProductFacets(
    input: ProductListFilters,
    facets: ProductListFacets,
) {
    try {
        const client = await getRedisClient();
        if (!client) return;

        await client.set(
            getFacetsCacheKey(input),
            JSON.stringify(facets),
            { EX: PRODUCT_FACETS_TTL_SECONDS },
        );
    } catch {
        // Redis lỗi thì Product API vẫn hoạt động bằng Supabase.
    }
}



export async function invalidateProductFacetsCache(): Promise<void> {
    try {
        const client = await getRedisClient();
        if (!client) return;

        const keys: string[] = [];

        for await (const key of client.scanIterator({
            MATCH: 'cache:products:facets:v1:*',
            COUNT: 100,
        })) {
            keys.push(String(key));
        }

        if (keys.length > 0) {
            await client.del(keys);
        }
    } catch {
        // Redis lỗi không được làm hỏng thao tác Product.
    }
}
