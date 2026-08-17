import { z } from 'zod';

export const PRODUCT_PAGE_SIZES = [12, 24, 48, 96] as const;

export type ProductPageSize =
    (typeof PRODUCT_PAGE_SIZES)[number];

export const productListViewSchema = z.enum([
    'catalog',
    'modules',
]);

export type ProductListView = z.infer<
    typeof productListViewSchema
>;

export const productPricingStatusFilterSchema = z.enum([
    'complete',
    'incomplete',
    'missing',
]);

export type ProductPricingStatusFilter = z.infer<
    typeof productPricingStatusFilterSchema
>;

export type ProductListFilters = {
    q?: string;
    region?: string;
    duration?: string;
    category?: string;
    destination?: string;
    pricingStatus?: ProductPricingStatusFilter;
};

export const productListQuerySchema = z.object({
    page: z.coerce.number()
        .int('page phải là số nguyên.')
        .min(1, 'page phải lớn hơn hoặc bằng 1.')
        .default(1),
    pageSize: z.enum(['12', '24', '48', '96'])
        .transform((value) => Number(value) as ProductPageSize)
        .default(24),
    view: productListViewSchema.default('catalog'),
    q: z.string().trim().min(1).max(100).optional(),
    region: z.string().trim().min(1).max(30).optional(),
    duration: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    destination: z.string().trim().min(1).max(100).optional(),
    pricingStatus: productPricingStatusFilterSchema.optional(),
});

export type ProductListQuery = z.infer<
    typeof productListQuerySchema
>;

export type ProductPageResponse<T> = {
    items: T[];
    page: number;
    pageSize: ProductPageSize;
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
};

export type ProductListFacets = {
    categories: string[];
    destinations: Record<string, number>;
    pricingPulse: Record<ProductPricingStatusFilter, number>;
};

export function optionalProductQueryParam(
    url: URL,
    name: string,
): string | undefined {
    return url.searchParams.get(name) || undefined;
}
