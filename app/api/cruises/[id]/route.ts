import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { cruiseUpdateRequestSchema } from '@/lib/suppliers/quicklist-input';
import {
  SupplierRepositoryError,
  deleteCruiseServer,
  getCruiseByIdServer,
  updateCruiseServer,
} from '@/lib/suppliers/quicklist-repository';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'suppliers', route: '/api/cruises/[id]' },
      requiredPermission: 'suppliers.read',
    },
    async ({ supabase }) => {
      try {
        return await getCruiseByIdServer(supabase, id);
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
      logging: { scope: 'suppliers', route: '/api/cruises/[id]' },
      requiredPermission: 'suppliers.write',
      bodySchema: cruiseUpdateRequestSchema,
    },
    async ({ supabase, body }) => {
      if (body.cruise.id !== id) {
        return NextResponse.json(
          { ok: false, error: 'Cruise id trong URL và body không khớp.' },
          { status: 400 },
        );
      }
      try {
        return await updateCruiseServer(supabase, body.cruise);
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
      logging: { scope: 'suppliers', route: '/api/cruises/[id]' },
      requiredPermission: 'suppliers.write',
    },
    async ({ supabase }) => {
      try {
        await deleteCruiseServer(supabase, id);
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
