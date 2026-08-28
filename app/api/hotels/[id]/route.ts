import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { hotelUpdateRequestSchema } from '@/lib/suppliers/hotel-input';
import {
  SupplierRepositoryError,
  deleteHotelServer,
  getHotelByIdServer,
  updateHotelServer,
} from '@/lib/suppliers/hotel-repository';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'suppliers', route: '/api/hotels/[id]' },
      requiredPermission: 'suppliers.read',
    },
    async ({ supabase }) => {
      try {
        return await getHotelByIdServer(supabase, id);
      } catch (error) {
        if (error instanceof SupplierRepositoryError && error.code === 'not_found') {
          return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
        }
        throw error;
      }
    },
  )(request);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'suppliers', route: '/api/hotels/[id]' },
      requiredPermission: 'suppliers.write',
      bodySchema: hotelUpdateRequestSchema,
    },
    async ({ supabase, body }) => {
      if (body.hotel.id !== id) {
        return NextResponse.json(
          { ok: false, error: 'Hotel id trong URL và body không khớp.' },
          { status: 400 },
        );
      }
      try {
        return await updateHotelServer(supabase, body.hotel);
      } catch (error) {
        if (error instanceof SupplierRepositoryError) {
          const status = error.code === 'not_found' ? 404 : 400;
          return NextResponse.json({ ok: false, error: error.message }, { status });
        }
        throw error;
      }
    },
  )(request);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'suppliers', route: '/api/hotels/[id]' },
      requiredPermission: 'suppliers.write',
    },
    async ({ supabase }) => {
      try {
        await deleteHotelServer(supabase, id);
        return { ok: true };
      } catch (error) {
        if (error instanceof SupplierRepositoryError) {
          const status = error.code === 'not_found' ? 404 : 400;
          return NextResponse.json({ ok: false, error: error.message }, { status });
        }
        throw error;
      }
    },
  )(request);
}
