import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { restaurantCreateRequestSchema } from '@/lib/suppliers/quicklist-input';
import {
  SupplierRepositoryError,
  createRestaurantServer,
  listRestaurantsServer,
} from '@/lib/suppliers/quicklist-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'suppliers', route: '/api/restaurants' },
    requiredPermission: 'suppliers.read',
  },
  async ({ supabase }) => listRestaurantsServer(supabase),
);

export const POST = bffRoute(
  {
    logging: { scope: 'suppliers', route: '/api/restaurants' },
    requiredPermission: 'suppliers.write',
    bodySchema: restaurantCreateRequestSchema,
  },
  async ({ supabase, body }) => {
    try {
      return await createRestaurantServer(supabase, body.restaurant);
    } catch (error) {
      if (error instanceof SupplierRepositoryError) {
        const status =
          error.code === 'conflict' ? 409 : error.code === 'not_found' ? 404 : 400;
        return NextResponse.json({ ok: false, error: error.message }, { status });
      }
      throw error;
    }
  },
);
