import 'server-only';

import { createHash } from 'node:crypto';
import type { Product } from '@/lib/types';
import type {
  ProductListQuery,
  ProductPageResponse,
} from '@/lib/products/product-list-input';
import { cacheGet, cacheSet } from './cache-helper';

export const PRODUCT_LIST_CACHE_TTL_SECONDS = 60;

function getProductListCacheKey(input: ProductListQuery) {
  const hash = createHash('sha256')
    .update(JSON.stringify({
      page: input.page,
      pageSize: input.pageSize,
      view: input.view,
      q: input.q ?? null,
      region: input.region ?? null,
      duration: input.duration ?? null,
      category: input.category ?? null,
      destination: input.destination ?? null,
      pricingStatus: input.pricingStatus ?? null,
    }))
    .digest('hex')
    .slice(0, 16);

  return `cache:products:list:v1:${hash}`;
}

function isCachedProductPage(value: unknown): value is ProductPageResponse<Product> {
  if (!value || typeof value !== 'object') return false;
  const page = value as Partial<ProductPageResponse<Product>>;
  return (
    Array.isArray(page.items) &&
    Number.isInteger(page.page) &&
    Number.isInteger(page.pageSize) &&
    Number.isInteger(page.totalCount) &&
    Number.isInteger(page.totalPages) &&
    typeof page.hasPreviousPage === 'boolean' &&
    typeof page.hasNextPage === 'boolean'
  );
}

/** `undefined` covers a miss, Redis outage, and a malformed cache entry. */
export async function getCachedProductPage(
  input: ProductListQuery,
): Promise<ProductPageResponse<Product> | undefined> {
  const cached = await cacheGet<unknown>(getProductListCacheKey(input));
  return isCachedProductPage(cached) ? cached : undefined;
}

export async function setCachedProductPage(
  input: ProductListQuery,
  page: ProductPageResponse<Product>,
): Promise<void> {
  await cacheSet(getProductListCacheKey(input), page, PRODUCT_LIST_CACHE_TTL_SECONDS);
}
