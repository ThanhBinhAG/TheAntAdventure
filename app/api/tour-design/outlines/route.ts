import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import { getTourOutlineDaysForDraftServer } from '@/lib/tour-design/tour-design-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    requiredPermission: 'tour_design.read',
    querySchema: z.object({ draftId: z.string().min(1) }),
  },
  async ({ supabase, query }) => {
    return await getTourOutlineDaysForDraftServer(supabase, query.draftId);
  }
);
