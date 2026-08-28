import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { hotelCreateRequestSchema } from '@/lib/suppliers/hotel-input';
import {
  SupplierRepositoryError,
  createHotelServer,
  listHotelsServer,
} from '@/lib/suppliers/hotel-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'suppliers', route: '/api/hotels' },
    requiredPermission: 'suppliers.read',
  },
  async ({ supabase }) => listHotelsServer(supabase),
);

export const POST = bffRoute(
  {
    logging: { scope: 'suppliers', route: '/api/hotels' },
    requiredPermission: 'suppliers.write',
    bodySchema: hotelCreateRequestSchema,
  },
  async ({ supabase, body }) => {
    try {
      return await createHotelServer(supabase, body.hotel);
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
