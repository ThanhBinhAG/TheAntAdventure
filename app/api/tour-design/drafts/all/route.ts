import { bffRoute } from '@/lib/bff/route';
import { getAllTourDraftsServer } from '@/lib/tour-design/tour-design-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'tour-design/drafts/all', route: '/api/tour-design/drafts/all' },
    requiredPermission: 'tour_design.read',
  },
  async ({ supabase }) => {
    return await getAllTourDraftsServer(supabase);
  }
);
