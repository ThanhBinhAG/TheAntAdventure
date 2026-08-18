'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
    ProductListFilters,
    ProductListView,
    ProductPageResponse,
    ProductPageSize,
    ProductListFacets,
} from '@/lib/products/product-list-input';
import type { Product } from '@/lib/types';

const SEARCH_DEBOUNCE_MS = 300;

type ProductPageApiResponse = ProductPageResponse<Product> & {
    ok: true;
    facets?: ProductListFacets;
};

type ProductFacetsApiResponse = {
    ok: true;
    facets: ProductListFacets;
};

/** Share GETs across React Strict Mode remounts instead of aborting and refetching. */
const productGetInflight = new Map<string, Promise<{
    response: Response;
    body: unknown;
}>>();

function fetchProductJsonOnce(url: string) {
    const existing = productGetInflight.get(url);
    if (existing) return existing;

    const request = fetch(url, { credentials: 'same-origin' })
        .then(async (response) => ({
            response,
            body: await response.json() as unknown,
        }))
        .finally(() => {
            productGetInflight.delete(url);
        });

    productGetInflight.set(url, request);
    return request;
}

export type UseProductPageInput = ProductListFilters & {
    page: number;
    pageSize: ProductPageSize;
    view?: ProductListView;
};

function appendProductFilterParams(
    params: URLSearchParams,
    {
        q,
        region,
        duration,
        category,
        destination,
        pricingStatus,
    }: ProductListFilters,
) {
    if (q) params.set('q', q);
    if (region) params.set('region', region);
    if (duration) params.set('duration', duration);
    if (category) params.set('category', category);
    if (destination) params.set('destination', destination);
    if (pricingStatus) params.set('pricingStatus', pricingStatus);
}

function isProductPageApiResponse(
    value: unknown,
): value is ProductPageApiResponse {
    if (!value || typeof value !== 'object') return false;

    const body = value as Record<string, unknown>;

    return body.ok === true && Array.isArray(body.items);
}

function isProductFacetsApiResponse(
    value: unknown,
): value is ProductFacetsApiResponse {
    if (!value || typeof value !== 'object') return false;

    const body = value as Record<string, unknown>;
    const facets = body.facets;

    return body.ok === true && Boolean(facets) && typeof facets === 'object';
}

function getApiErrorMessage(value: unknown): string {
    if (!value || typeof value !== 'object') {
        return 'Không thể tải danh sách product.';
    }

    const body = value as Record<string, unknown>;

    return typeof body.error === 'string'
        ? body.error
        : 'Không thể tải danh sách product.';
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(timer);
    }, [value, delayMs]);

    return debounced;
}

export function buildProductPageUrl({
    page,
    pageSize,
    view = 'catalog',
    q,
    region,
    duration,
    category,
    destination,
    pricingStatus,
}: UseProductPageInput): string {
    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        view,
    });

    appendProductFilterParams(params, {
        q,
        region,
        duration,
        category,
        destination,
        pricingStatus,
    });

    return `/api/products?${params.toString()}`;
}

export function buildProductFacetsUrl({
    q,
    region,
    duration,
    category,
    destination,
    pricingStatus,
}: ProductListFilters): string {
    const params = new URLSearchParams();
    appendProductFilterParams(params, {
        q,
        region,
        duration,
        category,
        destination,
        pricingStatus,
    });
    const query = params.toString();
    return query ? `/api/products/facets?${query}` : '/api/products/facets';
}

export function useProductPage(input: UseProductPageInput) {
    const {
        page,
        pageSize,
        view = 'catalog',
        q,
        region,
        duration,
        category,
        destination,
        pricingStatus,
    } = input;
    const qDebounced = useDebouncedValue(q, SEARCH_DEBOUNCE_MS);
    const [data, setData] =
        useState<ProductPageApiResponse | null>(null);
    const [facets, setFacets] = useState<ProductListFacets | undefined>(
        undefined,
    );
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [requestVersion, setRequestVersion] = useState(0);

    const retry = useCallback(() => {
        setRequestVersion((version) => version + 1);
    }, []);

    useEffect(() => {
        let active = true;

        async function loadPage() {
            setIsLoading(true);
            setError(null);

            try {
                const { response, body } = await fetchProductJsonOnce(
                    buildProductPageUrl({
                        page,
                        pageSize,
                        view,
                        q: qDebounced,
                        region,
                        duration,
                        category,
                        destination,
                        pricingStatus,
                    }),
                );

                if (!response.ok || !isProductPageApiResponse(body)) {
                    throw new Error(getApiErrorMessage(body));
                }

                if (active) {
                    setData(body);
                }
            } catch (caughtError) {
                if (active) {
                    setError(
                        caughtError instanceof Error
                            ? caughtError.message
                            : 'Không thể tải danh sách product.',
                    );
                }
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        }

        void loadPage();

        return () => {
            active = false;
        };
    }, [
        page,
        pageSize,
        requestVersion,
        view,
        qDebounced,
        region,
        duration,
        category,
        destination,
        pricingStatus,
    ]);

    useEffect(() => {
        if (view !== 'catalog') {
            return;
        }

        let active = true;

        async function loadFacets() {
            try {
                const { response, body } = await fetchProductJsonOnce(
                    buildProductFacetsUrl({
                        q: qDebounced,
                        region,
                        duration,
                        category,
                        destination,
                        pricingStatus,
                    }),
                );

                if (!response.ok || !isProductFacetsApiResponse(body)) {
                    return;
                }

                if (active) {
                    setFacets(body.facets);
                }
            } catch {
                // Facets are decorative; the grid still paints from the list API.
            }
        }

        void loadFacets();

        return () => {
            active = false;
        };
    }, [
        requestVersion,
        view,
        qDebounced,
        region,
        duration,
        category,
        destination,
        pricingStatus,
    ]);

    const dataWithFacets = data
        ? {
            ...data,
            ...(view === 'catalog' && facets ? { facets } : {}),
        }
        : null;

    return {
        data: dataWithFacets,
        error,
        isLoading,
        retry,
    };
}
