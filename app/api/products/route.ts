import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
    optionalProductQueryParam,
    productListQuerySchema,
} from '@/lib/products/product-list-input';
import {
    listProductsPage,
    listProductFacets,
    ProductListError,
} from '@/lib/products/product-list-server';
import { invalidateProductFacetsCache } from '@/lib/redis/product-facets';


export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
    const parsed = productListQuerySchema.safeParse({
        page: optionalProductQueryParam(url, 'page'),
        pageSize: optionalProductQueryParam(url, 'pageSize'),
        view: optionalProductQueryParam(url, 'view'),
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
                error: 'Thông tin phân trang không hợp lệ.',
            },
            { status: 400 },
        );
    }

    try {
        const [productPage, facets] = await Promise.all([
            listProductsPage(parsed.data),
            parsed.data.view === 'catalog' ? listProductFacets(parsed.data) : Promise.resolve(undefined),
        ]);

        return NextResponse.json(
            {
                ok: true,
                ...productPage,
                ...(facets ? { facets } : {}),
            },
            {
                headers: {
                    'Cache-Control': 'no-store',
                },
            },
        );
    } catch (error) {
        if (error instanceof ProductListError) {
            console.error(
                'Không thể lấy danh sách product phân trang:',
                error.message,
            );
        } else {
            console.error(
                'Lỗi không xác định khi lấy danh sách product:',
                error,
            );
        }

        return NextResponse.json(
            {
                ok: false,
                error: 'Không thể tải danh sách product.',
            },
            { status: 500 },
        );
    }
}

export async function POST() {
    const permission = await checkPermissionForRequest('products.write');

    if (!permission.allowed) {
        return NextResponse.json(
            { ok: false, error: 'Bạn không có quyền sửa product.' },
            { status: permission.status },
        );
    }

    await invalidateProductFacetsCache();

    return NextResponse.json({ ok: true });
}
