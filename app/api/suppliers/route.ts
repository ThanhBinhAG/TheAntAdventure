import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { extendedSupplierCreateRequestSchema } from '@/lib/suppliers/extended-supplier-input';
import {
  SupplierRepositoryError,
  createExtendedSupplierServer,
  listExtendedSuppliersServer,
} from '@/lib/suppliers/extended-supplier-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'suppliers', route: '/api/suppliers' },
    requiredPermission: 'suppliers.read',
  },
  async ({ supabase }) => listExtendedSuppliersServer(supabase),
);

export const POST = bffRoute(
  {
    logging: { scope: 'suppliers', route: '/api/suppliers' },
    requiredPermission: 'suppliers.write',
    bodySchema: extendedSupplierCreateRequestSchema,
  },
  async ({ supabase, body }) => {
    try {
      return await createExtendedSupplierServer(supabase, body.supplier);
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
