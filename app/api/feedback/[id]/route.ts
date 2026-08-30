import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import {
  FeedbackRepositoryError,
  getFeedbackByIdServer,
} from '@/lib/feedback/feedback-repository';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'feedback', route: '/api/feedback/[id]' },
      requiredPermission: 'posttour.read',
    },
    async ({ supabase }) => {
      try {
        return await getFeedbackByIdServer(supabase, id);
      } catch (error) {
        if (error instanceof FeedbackRepositoryError && error.code === 'not_found') {
          return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
        }
        throw error;
      }
    },
  )(request);
}
