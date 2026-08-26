import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import {
  optionalProductQueryParam,
  productListQuerySchema,
} from '@/lib/products/product-list-input';
import { listProductsPage } from '@/lib/products/product-list-server';
import {
  createProductServer,
  updateProductServer,
  deleteProductServer,
  getProductByCodeServer,
  ProductNotFoundError,
} from '@/lib/products/product-repository';
import { invalidateProductFacetsCache } from '@/lib/redis/product-facets';

export const dynamic = 'force-dynamic';

const productSchema = z.object({
  code: z.string().min(1, 'Product code cannot be empty'),
  name: z.string().min(1, 'Product name cannot be empty'),
  logic: z.string().default(''),
  dur: z.string().default(''),
  cat: z.string().default(''),
  dest: z.string().default(''),
  lvl: z.string().default(''),
  desc: z.string().default(''),
  usp: z.string().default(''),
  notesToSales: z.string().nullable().optional().transform((v) => v || undefined),
  price: z.string().default(''),
  region: z.string().default(''),
  nameVn: z.string().nullable().optional().transform((v) => v || undefined),
  status: z.enum(['active', 'draft', 'archived']).optional(),
  photoIds: z.array(z.string()).optional(),
  linkedPhotoIds: z.array(z.string()).optional(),
});

// GET: Lấy danh sách sản phẩm phân trang và có bộ lọc
export const GET = bffRoute(
  {
    logging: { scope: 'products', route: '/api/products' },
    requiredPermission: 'products.read',
  },
  async ({ request, supabase, logger }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (code) {
      const product = await getProductByCodeServer(supabase, code);
      if (!product) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy Product.' }, { status: 404 });
      }
      return product;
    }
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
          error: 'Tham số phân trang hoặc bộ lọc không hợp lệ.',
        },
        { status: 400 }
      );
    }

    try {
      const productPage = await listProductsPage(parsed.data, supabase);
      return NextResponse.json(
        {
          ok: true,
          ...productPage,
        },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    } catch (error) {
      logger.error({ event: 'products.list.failed', err: error }, 'Product list failed');

      return NextResponse.json(
        {
          ok: false,
          error: 'Không thể tải danh sách product.',
        },
        { status: 500 }
      );
    }
  }
);

// POST: Tạo một sản phẩm mới
export const POST = bffRoute(
  {
    logging: { scope: 'products', route: '/api/products' },
    requiredPermission: 'products.write',
    bodySchema: z.object({
      product: productSchema,
    }),
  },
  async ({ supabase, body }) => {
    const created = await createProductServer(supabase, body.product);
    await invalidateProductFacetsCache();
    return created;
  }
);

// PATCH: Cập nhật chi tiết một sản phẩm
export const PATCH = bffRoute(
  {
    logging: { scope: 'products', route: '/api/products' },
    requiredPermission: 'products.write',
    bodySchema: z.object({
      product: productSchema,
    }),
  },
  async ({ supabase, body }) => {
    let updated;
    try {
      updated = await updateProductServer(supabase, body.product.code, body.product);
    } catch (error) {
      if (error instanceof ProductNotFoundError) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
      }
      throw error;
    }
    await invalidateProductFacetsCache();
    return updated;
  }
);

// DELETE: Xóa sản phẩm
export const DELETE = bffRoute(
  {
    logging: { scope: 'products', route: '/api/products' },
    requiredPermission: 'products.write',
    bodySchema: z.object({
      code: z.string().min(1),
    }),
  },
  async ({ supabase, body }) => {
    try {
      await deleteProductServer(supabase, body.code);
    } catch (error) {
      if (error instanceof ProductNotFoundError) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
      }
      throw error;
    }
    await invalidateProductFacetsCache();
    return { success: true };
  }
);
