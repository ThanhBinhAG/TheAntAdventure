import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { calEventCreateRequestSchema } from '@/lib/cal-events/cal-events-input';
import {
  CalEventsRepositoryError,
  createCalEventServer,
  listCalEventsServer,
} from '@/lib/cal-events/cal-events-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'cal-events', route: '/api/cal-events' },
    requiredPermission: 'guides.read',
  },
  async ({ supabase }) => listCalEventsServer(supabase),
);

export const POST = bffRoute(
  {
    logging: { scope: 'cal-events', route: '/api/cal-events' },
    requiredPermission: 'guides.write',
    bodySchema: calEventCreateRequestSchema,
  },
  async ({ supabase, body }) => {
    try {
      return await createCalEventServer(supabase, body.event);
    } catch (error) {
      if (error instanceof CalEventsRepositoryError) {
        const status =
          error.code === 'conflict' ? 409 : error.code === 'not_found' ? 404 : 400;
        return NextResponse.json({ ok: false, error: error.message }, { status });
      }
      throw error;
    }
  },
);
