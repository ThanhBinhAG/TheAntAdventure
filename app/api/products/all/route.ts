import { bffRoute } from '@/lib/bff/route';
import { getAllProductsServer } from '@/lib/products/product-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    requiredPermission: 'products.read',
  },
  async () => {
    return await getAllProductsServer();
  }
);
