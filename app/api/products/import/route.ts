import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import { draftToProduct } from '@/lib/products/portfolio-classify';
import { mergeRequiredProducts } from '@/lib/products/ensure-core-products';
import { buildEmptyPricingStubs } from '@/lib/products/replace-catalogue';
import { productToRow, productPricingToRow } from '@/lib/db/mappers';
import { invalidateProductFacetsCache } from '@/lib/redis/product-facets';

export const dynamic = 'force-dynamic';

export const POST = bffRoute(
  {
    requiredPermission: 'products.write',
    bodySchema: z.object({
      drafts: z.array(z.any()),
    }),
  },
  async ({ supabase, body }) => {
    const imported = body.drafts.map(draftToProduct);
    const products = mergeRequiredProducts(imported);
    const pricingStubs = buildEmptyPricingStubs(products);

    // Xóa toàn bộ sản phẩm cũ (cascade sẽ xóa cả pricing & photos tương ứng)
    const { error: delErr } = await supabase
      .from('products')
      .delete()
      .neq('code', '');
    if (delErr) throw delErr;

    // Chèn danh sách sản phẩm mới
    if (products.length > 0) {
      const rows = products.map((p) => productToRow(p));
      const { error: upsertErr } = await supabase
        .from('products')
        .insert(rows);
      if (upsertErr) throw upsertErr;
    }

    // Chèn danh sách bảng giá stub mới
    if (pricingStubs.length > 0) {
      const pricingRows = pricingStubs.map((p) => productPricingToRow(p));
      const { error: pricingErr } = await supabase
        .from('product_pricing')
        .insert(pricingRows);
      if (pricingErr) throw pricingErr;
    }

    await invalidateProductFacetsCache();

    return {
      products,
      pricingStubs,
    };
  }
);
