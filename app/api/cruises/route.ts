import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { cruiseCreateRequestSchema } from '@/lib/suppliers/quicklist-input';
import {
  SupplierRepositoryError,
  createCruiseServer,
  listCruisesServer,
} from '@/lib/suppliers/quicklist-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'suppliers', route: '/api/cruises' },
    requiredPermission: 'suppliers.read',
  },
  async ({ supabase }) => listCruisesServer(supabase),
);

export const POST = bffRoute(
  {
    logging: { scope: 'suppliers', route: '/api/cruises' },
    requiredPermission: 'suppliers.write',
    bodySchema: cruiseCreateRequestSchema,
  },
  async ({ supabase, body }) => {
    try {
      return await createCruiseServer(supabase, body.cruise);
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
