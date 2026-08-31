import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import {
  CalEventsRepositoryError,
  deleteCalEventServer,
} from '@/lib/cal-events/cal-events-repository';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'cal-events', route: '/api/cal-events/[id]' },
      requiredPermission: 'guides.write',
    },
    async ({ supabase }) => {
      try {
        await deleteCalEventServer(supabase, id);
        return { deleted: true };
      } catch (error) {
        if (error instanceof CalEventsRepositoryError) {
          const status = error.code === 'not_found' ? 404 : 400;
          return NextResponse.json({ ok: false, error: error.message }, { status });
        }
        throw error;
      }
    },
  )(_request);
}
