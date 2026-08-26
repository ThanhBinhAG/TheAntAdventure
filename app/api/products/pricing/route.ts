import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import {
  getProductPricingByCodeServer,
  updateProductPricingServer,
} from '@/lib/products/product-repository';
import { invalidateProductFacetsCache } from '@/lib/redis/product-facets';

export const dynamic = 'force-dynamic';

const pricingSchema = z.object({
  productCode: z.string().min(1),
  stdCost: z.number().default(0),
  p1: z.number().default(0),
  p2: z.number().default(0),
  p3: z.number().default(0),
  p4: z.number().default(0),
  p5: z.number().default(0),
  p6: z.number().default(0),
  p7: z.number().default(0),
  p8: z.number().default(0),
  p9: z.number().default(0),
  p10: z.number().default(0),
  c1: z.number().default(0),
  c2: z.number().default(0),
  c3: z.number().default(0),
  c4: z.number().default(0),
  c5: z.number().default(0),
  c6: z.number().default(0),
  c7: z.number().default(0),
  c8: z.number().default(0),
  c9: z.number().default(0),
  c10: z.number().default(0),
  incl: z.object({
    g: z.boolean().default(false),
    tr: z.boolean().default(false),
    tk: z.boolean().default(false),
    w: z.boolean().default(false),
    m: z.boolean().default(false),
  }),
});

export const GET = bffRoute(
  {
    logging: { scope: 'products/pricing', route: '/api/products/pricing' },
    requiredPermission: 'products.read',
    querySchema: z.object({ productCode: z.string().min(1) }),
  },
  async ({ supabase, query }) => {
    const pricing = await getProductPricingByCodeServer(supabase, query.productCode);
    if (!pricing) {
      return NextResponse.json({ ok: false, error: 'Không tìm thấy bảng giá Product.' }, { status: 404 });
    }
    return pricing;
  }
);

// PATCH: Cập nhật chi tiết bảng giá cho một sản phẩm
export const PATCH = bffRoute(
  {
    logging: { scope: 'products/pricing', route: '/api/products/pricing' },
    requiredPermission: 'pricing.write',
    bodySchema: z.object({
      pricing: pricingSchema,
    }),
  },
  async ({ supabase, body }) => {
    const updated = await updateProductPricingServer(supabase, body.pricing);
    await invalidateProductFacetsCache();
    return updated;
  }
);
