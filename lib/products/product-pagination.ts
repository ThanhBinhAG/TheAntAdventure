import type { ProductPageSize } from './product-list-input';

export type ProductPageMetadata = {
    page: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
};

export function getProductPageMetadata(
    totalCount: number,
    requestedPage: number,
    pageSize: ProductPageSize,
): ProductPageMetadata {
    const totalPages = Math.max(
        1,
        Math.ceil(totalCount / pageSize),
    );
    const page = Math.min(requestedPage, totalPages);

    return {
        page,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
    };
}
