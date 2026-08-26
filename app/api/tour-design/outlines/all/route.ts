import { bffRoute } from '@/lib/bff/route';
import { getAllTourOutlineDaysServer } from '@/lib/tour-design/tour-design-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'tour-design/outlines/all', route: '/api/tour-design/outlines/all' },
    requiredPermission: 'tour_design.read',
  },
  async ({ supabase }) => {
    return await getAllTourOutlineDaysServer(supabase);
  }
);
