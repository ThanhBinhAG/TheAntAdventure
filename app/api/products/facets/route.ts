import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
    optionalProductQueryParam,
    productListFilterQuerySchema,
} from '@/lib/products/product-list-input';
import { listProductFacets } from '@/lib/products/product-list-server';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
    { scope: 'products/facets', route: '/api/products/facets' },
    async (request, _context, { logger }) => {
    const permission = await checkPermissionForRequest(
        'products.read',
    );

    if (!permission.allowed) {
        return NextResponse.json(
            {
                ok: false,
                error: 'Bạn không có quyền xem danh sách product.',
            },
            { status: permission.status },
        );
    }

    const url = new URL(request.url);
    const parsed = productListFilterQuerySchema.safeParse({
        q: optionalProductQueryParam(url, 'q'),
        region: optionalProductQueryParam(url, 'region'),
        duration: optionalProductQueryParam(url, 'duration'),
        category: optionalProductQueryParam(url, 'category'),
        destination: optionalProductQueryParam(url, 'destination'),
        pricingStatus: optionalProductQueryParam(url, 'pricingStatus'),
    });

    if (!parsed.success) {
        return NextResponse.json(
            {
                ok: false,
                error: 'Thông tin bộ lọc không hợp lệ.',
            },
            { status: 400 },
        );
    }

    try {
        const facets = await listProductFacets(parsed.data);

        return NextResponse.json(
            {
                ok: true,
                facets,
            },
            {
                headers: {
                    'Cache-Control': 'no-store',
                },
            },
        );
    } catch (error) {
        logger.error({ event: 'products.facets.failed', err: error }, 'Product facets failed');

        return NextResponse.json(
            {
                ok: false,
                error: 'Không thể tải bộ lọc product.',
            },
            { status: 500 },
        );
    }
    },
);
