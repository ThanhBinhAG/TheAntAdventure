import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { feedbackCreateRequestSchema } from '@/lib/feedback/feedback-input';
import {
  FeedbackRepositoryError,
  createFeedbackServer,
  listFeedbackServer,
} from '@/lib/feedback/feedback-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'feedback', route: '/api/feedback' },
    requiredPermission: 'posttour.read',
  },
  async ({ supabase }) => listFeedbackServer(supabase),
);

export const POST = bffRoute(
  {
    logging: { scope: 'feedback', route: '/api/feedback' },
    requiredPermission: 'posttour.write',
    bodySchema: feedbackCreateRequestSchema,
  },
  async ({ supabase, body }) => {
    try {
      return await createFeedbackServer(supabase, body.feedback);
    } catch (error) {
      if (error instanceof FeedbackRepositoryError) {
        const status =
          error.code === 'conflict' ? 409 : error.code === 'not_found' ? 404 : 400;
        return NextResponse.json({ ok: false, error: error.message }, { status });
      }
      throw error;
    }
  },
);
