import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import {
  getTourDraftByIdServer,
  getTourDraftsForLeadsServer,
} from '@/lib/tour-design/tour-design-repository';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  id: z.string().min(1).optional(),
  leadIds: z.string().min(1).optional(),
}).refine((query) => Boolean(query.id || query.leadIds), {
  message: 'Cần id hoặc leadIds.',
});

export const GET = bffRoute(
  {
    requiredPermission: 'tour_design.read',
    querySchema,
  },
  async ({ supabase, query }) => {
    if (query.id) {
      return await getTourDraftByIdServer(supabase, query.id);
    }

    const leadIds = [...new Set((query.leadIds ?? '').split(',').filter(Boolean))];
    if (leadIds.length > 100) {
      throw new Error('Tối đa 100 lead cho mỗi lần tải Tour Design.');
    }
    return await getTourDraftsForLeadsServer(supabase, leadIds);
  }
);
