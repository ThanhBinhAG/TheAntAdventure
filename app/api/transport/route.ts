import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { transportCreateRequestSchema } from '@/lib/suppliers/quicklist-input';
import {
  SupplierRepositoryError,
  createTransportServer,
  listTransportServer,
} from '@/lib/suppliers/quicklist-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'suppliers', route: '/api/transport' },
    requiredPermission: 'suppliers.read',
  },
  async ({ supabase }) => listTransportServer(supabase),
);

export const POST = bffRoute(
  {
    logging: { scope: 'suppliers', route: '/api/transport' },
    requiredPermission: 'suppliers.write',
    bodySchema: transportCreateRequestSchema,
  },
  async ({ supabase, body }) => {
    try {
      return await createTransportServer(supabase, body.transport);
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
