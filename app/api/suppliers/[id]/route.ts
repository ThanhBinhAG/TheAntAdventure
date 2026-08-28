import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { extendedSupplierUpdateRequestSchema } from '@/lib/suppliers/extended-supplier-input';
import {
  SupplierRepositoryError,
  deleteExtendedSupplierServer,
  getExtendedSupplierByIdServer,
  updateExtendedSupplierServer,
} from '@/lib/suppliers/extended-supplier-repository';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'suppliers', route: '/api/suppliers/[id]' },
      requiredPermission: 'suppliers.read',
    },
    async ({ supabase }) => {
      try {
        return await getExtendedSupplierByIdServer(supabase, id);
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
      logging: { scope: 'suppliers', route: '/api/suppliers/[id]' },
      requiredPermission: 'suppliers.write',
      bodySchema: extendedSupplierUpdateRequestSchema,
    },
    async ({ supabase, body }) => {
      if (body.supplier.id !== id) {
        return NextResponse.json(
          { ok: false, error: 'Supplier id trong URL và body không khớp.' },
          { status: 400 },
        );
      }
      try {
        return await updateExtendedSupplierServer(supabase, body.supplier);
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
      logging: { scope: 'suppliers', route: '/api/suppliers/[id]' },
      requiredPermission: 'suppliers.write',
    },
    async ({ supabase }) => {
      try {
        await deleteExtendedSupplierServer(supabase, id);
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
