import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { rowToProduct } from '@/lib/db/mappers';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import type { Product } from '@/lib/types';
import type {
    ProductListQuery,
    ProductListFacets,
    ProductPageResponse,
} from './product-list-input';
import {
    getCachedProductFacets,
    setCachedProductFacets,
} from '@/lib/redis/product-facets';


type ProductRow = Record<string, unknown>;
type ProductListRpcResponse = ProductPageResponse<ProductRow>;

export class ProductListError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProductListError';
    }
}

function createProductServerClient() {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();

    if (!url || !key) {
        throw new ProductListError(
            'Supabase URL hoặc anon key chưa được cấu hình.',
        );
    }

    const cookieStore = cookies();

    return createServerClient(url, key, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll() {
                // Danh sách product chỉ đọc, không cần ghi cookie.
            },
        },
    });
}

export async function listProductsPage(
    input: ProductListQuery,
): Promise<ProductPageResponse<Product>> {
    const supabase = createProductServerClient();
    const result = input.view === 'modules'
        ? await supabase.rpc('list_product_modules_page', {
            p_page_number: input.page,
            p_page_size: input.pageSize,
            p_search_text: input.q ?? null,
        })
        : await supabase.rpc('list_products_page', {
            p_page_number: input.page,
            p_page_size: input.pageSize,
            p_search_text: input.q ?? null,
            p_filter_region: input.region ?? null,
            p_filter_duration: input.duration ?? null,
            p_filter_category: input.category ?? null,
            p_filter_destination: input.destination ?? null,
            p_filter_pricing_status: input.pricingStatus ?? null,
        });

    if (result.error) throw new ProductListError(result.error.message);

    const page = result.data as ProductListRpcResponse | null;

    if (!page || !Array.isArray(page.items)) {
        throw new ProductListError('RPC danh sách product trả dữ liệu không hợp lệ.');
    }

    return {
        items: page.items.map((row) =>
            rowToProduct(row as ProductRow),
        ),
        page: page.page,
        pageSize: page.pageSize,
        totalCount: page.totalCount,
        totalPages: page.totalPages,
        hasPreviousPage: page.hasPreviousPage,
        hasNextPage: page.hasNextPage,
    };
}

export async function listProductFacets(
    input: ProductListQuery,
): Promise<ProductListFacets> {
    const cached = await getCachedProductFacets(input);
    if (cached) return cached;

    const supabase = createProductServerClient();
    const result = await supabase.rpc('list_product_facets', {
        p_search_text: input.q ?? null,
        p_filter_region: input.region ?? null,
        p_filter_duration: input.duration ?? null,
        p_filter_category: input.category ?? null,
        p_filter_destination: input.destination ?? null,
        p_filter_pricing_status: input.pricingStatus ?? null,
    });

    if (result.error) throw new ProductListError(result.error.message);
    const facets = result.data as ProductListFacets | null;

    if (
        !facets ||
        !Array.isArray(facets.categories) ||
        !facets.destinations ||
        !facets.pricingPulse
    ) {
        throw new ProductListError(
            'RPC facet product trả dữ liệu không hợp lệ.',
        );
    }

    const validFacets: ProductListFacets = facets;

    await setCachedProductFacets(input, validFacets);
    return validFacets;
}
