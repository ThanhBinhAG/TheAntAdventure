import { bffRoute } from '@/lib/bff/route';
import { getAllProductPricingServer } from '@/lib/products/product-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    requiredPermission: 'products.read',
  },
  async ({ supabase }) => {
    return await getAllProductPricingServer(supabase);
  }
);
