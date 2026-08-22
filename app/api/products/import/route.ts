import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import { draftToProduct } from '@/lib/products/portfolio-classify';
import { mergeRequiredProducts } from '@/lib/products/ensure-core-products';
import { buildEmptyPricingStubs } from '@/lib/products/replace-catalogue';
import { replaceProductCatalogueServer } from '@/lib/products/product-repository';
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

    await replaceProductCatalogueServer(supabase, products, pricingStubs);

    await invalidateProductFacetsCache();

    return {
      products,
      pricingStubs,
    };
  }
);
