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

type ProductPageApiResponse = ProductPageResponse<Product> & {
    ok: true;
    facets?: ProductListFacets;
};

export type UseProductPageInput = ProductListFilters & {
    page: number;
    pageSize: ProductPageSize;
    view?: ProductListView;
};

function isProductPageApiResponse(
    value: unknown,
): value is ProductPageApiResponse {
    if (!value || typeof value !== 'object') return false;

    const body = value as Record<string, unknown>;

    return body.ok === true && Array.isArray(body.items);
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

    if (q) params.set('q', q);
    if (region) params.set('region', region);
    if (duration) params.set('duration', duration);
    if (category) params.set('category', category);
    if (destination) params.set('destination', destination);
    if (pricingStatus) {
        params.set('pricingStatus', pricingStatus);
    }

    return `/api/products?${params.toString()}`;
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
    const [data, setData] =
        useState<ProductPageApiResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [requestVersion, setRequestVersion] = useState(0);

    const retry = useCallback(() => {
        setRequestVersion((version) => version + 1);
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        async function loadPage() {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    buildProductPageUrl({
                        page,
                        pageSize,
                        view,
                        q,
                        region,
                        duration,
                        category,
                        destination,
                        pricingStatus,
                    }),
                    {
                        credentials: 'same-origin',
                        signal: controller.signal,
                    },
                );
                const body: unknown = await response.json();

                if (!response.ok || !isProductPageApiResponse(body)) {
                    throw new Error(getApiErrorMessage(body));
                }

                if (!controller.signal.aborted) {
                    setData(body);
                }
            } catch (caughtError) {
                if (
                    caughtError instanceof DOMException &&
                    caughtError.name === 'AbortError'
                ) {
                    return;
                }

                setError(
                    caughtError instanceof Error
                        ? caughtError.message
                        : 'Không thể tải danh sách product.',
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadPage();

        return () => controller.abort();
    }, [
        page,
        pageSize,
        requestVersion,
        view,
        q,
        region,
        duration,
        category,
        destination,
        pricingStatus,
    ]);

    return {
        data,
        error,
        isLoading,
        retry,
    };
}
