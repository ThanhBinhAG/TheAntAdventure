import 'server-only';

import { createHash } from 'node:crypto';
import type {
    ProductListFacets,
    ProductListFilters,
} from '@/lib/products/product-list-input';
import { cacheGet, cacheSet, cacheInvalidatePattern } from './cache-helper';
import { serverLogger } from '@/lib/system/server-logger';

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
    const cached = await cacheGet<unknown>(getFacetsCacheKey(input));
    if (!cached || typeof cached !== 'object') return undefined;
    const facets = cached as Partial<ProductListFacets>;
    if (
        !Array.isArray(facets.categories) ||
        !facets.categories.every((category) => typeof category === 'string') ||
        !facets.destinations ||
        !facets.pricingPulse
    ) {
        return undefined;
    }
    return facets as ProductListFacets;
}

export async function setCachedProductFacets(
    input: ProductListFilters,
    facets: ProductListFacets,
) {
    await cacheSet(getFacetsCacheKey(input), facets, PRODUCT_FACETS_TTL_SECONDS);
}

export async function invalidateProductFacetsCache(): Promise<void> {
    try {
        await cacheInvalidatePattern('cache:products:*:v1:*');
  } catch (error) {
    // Cache is optional: a completed Product mutation must still succeed.
    serverLogger.warn({
        scope: 'redis/product-facets',
        event: 'redis.product_facets.invalidate_failed',
        err: error,
    }, 'Product-facets cache invalidation failed');
  }
}
