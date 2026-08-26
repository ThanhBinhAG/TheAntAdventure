import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { guideRequestSchema } from '@/lib/guides/guide-input';
import {
  createGuideServer,
  listGuidesServer,
  updateGuideServer,
} from '@/lib/guides/guide-repository';
import type { Guide } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  { requiredPermission: 'guides.read' },
  async ({ supabase }) => listGuidesServer(supabase),
);

export const POST = bffRoute(
  { requiredPermission: 'guides.write', bodySchema: guideRequestSchema },
  async ({ supabase, body }) => createGuideServer(supabase, body.guide as Guide),
);

export const PATCH = bffRoute(
  { requiredPermission: 'guides.write', bodySchema: guideRequestSchema },
  async ({ supabase, body }) => {
    const guide = await updateGuideServer(supabase, body.guide as Guide);
    if (!guide) {
      return NextResponse.json({ ok: false, error: 'Không tìm thấy hướng dẫn viên.' }, { status: 404 });
    }
    return guide;
  },
);
