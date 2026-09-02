import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { deleteTravelStyleQuerySchema, replaceTravelStylesBodySchema } from '@/lib/customers/travel-styles';
import {
  deleteTravelStyleServer,
  listTravelStylesServer,
  replaceTravelStylesServer,
  TravelStyleRepositoryError,
} from '@/lib/customers/travel-style-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'customers', route: '/api/customers/travel-styles' },
    requiredPermission: 'customers.write',
  },
  async ({ supabase }) => listTravelStylesServer(supabase),
);

export const PATCH = bffRoute(
  {
    logging: { scope: 'customers', route: '/api/customers/travel-styles' },
    requiredPermission: 'customers.write',
    bodySchema: replaceTravelStylesBodySchema,
  },
  async ({ supabase, body }) => {
    try {
      return await replaceTravelStylesServer(supabase, body.styles);
    } catch (error) {
      if (error instanceof TravelStyleRepositoryError) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      throw error;
    }
  },
);

export const DELETE = bffRoute(
  {
    logging: { scope: 'customers', route: '/api/customers/travel-styles' },
    requiredPermission: 'customers.write',
    querySchema: deleteTravelStyleQuerySchema,
  },
  async ({ supabase, query }) => {
    try {
      return await deleteTravelStyleServer(supabase, query.code);
    } catch (error) {
      if (error instanceof TravelStyleRepositoryError) {
        const status = error.code === 'not_found' ? 404 : error.code === 'in_use' || error.code === 'last_active' ? 409 : 400;
        return NextResponse.json({ ok: false, error: error.message }, { status });
      }
      throw error;
    }
  },
);
