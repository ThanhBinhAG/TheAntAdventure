import { bffRoute } from '@/lib/bff/route';
import { getAllProductsServer } from '@/lib/products/product-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'products/all', route: '/api/products/all' },
    requiredPermission: 'products.read',
  },
  async ({ supabase }) => {
    return await getAllProductsServer(supabase);
  }
);
