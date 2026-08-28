import 'server-only';

import { assembleProducts } from '@/lib/db/mappers';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { mapGalleryPhotoForClient } from '@/lib/gallery/gallery-photo-dto';
import { photoDisplayUrl, photoThumbUrl } from '@/lib/gallery/gallery-helpers';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { Product } from '@/lib/types';
import type {
    ProductListFilters,
    ProductListQuery,
    ProductListFacets,
    ProductPageResponse,
} from './product-list-input';
import {
    getCachedProductFacets,
    setCachedProductFacets,
} from '@/lib/redis/product-facets';
import {
    getCachedProductPage,
    setCachedProductPage,
} from '@/lib/redis/product-list';


type ProductRow = Record<string, unknown>;
type ProductListRpcResponse = ProductPageResponse<ProductRow>;
type ProductPhotoLinkRow = ProductRow & {
    photo?: ProductRow | ProductRow[] | null;
};

export class ProductListError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProductListError';
    }
}

import type { SupabaseClient } from '@supabase/supabase-js';

function galleryPhotoFromRow(row: ProductRow): GalleryPhoto {
  return mapGalleryPhotoForClient({
    id: String(row.id),
    caption: row.caption as string | null,
    region: row.region as string | null,
    url: row.url as string | null,
    thumb_url: row.thumb_url as string | null,
    storage_path: row.storage_path as string | null,
    display_bytes: row.display_bytes as number | null,
  });
}

async function attachPageCoverThumbs(
    supabase: SupabaseClient,
    rows: ProductRow[],
): Promise<Product[]> {
    if (rows.length === 0) return [];

    const codes = rows.map((row) => String(row.code));
    const { data: links, error: linkError } = await supabase
        .from('product_photos')
        .select(`
            product_code,
            photo_id,
            sort_order,
            is_featured,
            photo:photos!product_photos_photo_id_fkey(
                id,
                url,
                thumb_url,
                storage_path,
                display_bytes
            )
        `)
        .in('product_code', codes);

    if (linkError) throw new ProductListError(linkError.message);

    const linkRows = (links ?? []) as ProductPhotoLinkRow[];
    const assembled = assembleProducts(
        rows,
        linkRows,
    ) as unknown as Product[];

    const coverByPhotoId = new Map<string, string>();
    for (const link of linkRows) {
        const nestedPhoto = Array.isArray(link.photo)
            ? link.photo[0]
            : link.photo;
        if (!nestedPhoto) continue;
        const photo = galleryPhotoFromRow(nestedPhoto);
        const cover_thumb_url =
            photoThumbUrl(photo) || photoDisplayUrl(photo);
        if (cover_thumb_url) coverByPhotoId.set(photo.id, cover_thumb_url);
    }

    return assembled.map((product) => {
        const heroId = product.photoIds?.[0];
        const cover_thumb_url = heroId
            ? coverByPhotoId.get(heroId)
            : undefined;
        return cover_thumb_url
            ? { ...product, coverThumbUrl: cover_thumb_url }
            : product;
    });
}

export async function listProductsPage(
    input: ProductListQuery,
    suppliedClient?: SupabaseClient,
): Promise<ProductPageResponse<Product>> {
    const cached = await getCachedProductPage(input);
    if (cached) return cached;

    const supabase = suppliedClient ?? await getServerSupabaseClient();
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

    const productPage = {
        items: await attachPageCoverThumbs(supabase, page.items),
        page: page.page,
        pageSize: page.pageSize,
        totalCount: page.totalCount,
        totalPages: page.totalPages,
        hasPreviousPage: page.hasPreviousPage,
        hasNextPage: page.hasNextPage,
    };
    await setCachedProductPage(input, productPage);
    return productPage;
}

export async function listProductFacets(
    input: ProductListFilters,
    suppliedClient?: SupabaseClient,
): Promise<ProductListFacets> {
    const cached = await getCachedProductFacets(input);
    if (cached) return cached;

    const supabase = suppliedClient ?? await getServerSupabaseClient();
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
