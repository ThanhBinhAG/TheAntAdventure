import { bffRoute } from '@/lib/bff/route';
import { getTourDesignCrmContextServer } from '@/lib/tour-design/tour-design-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'tour-design/crm-context', route: '/api/tour-design/crm-context' },
    requiredPermission: 'tour_design.read',
  },
  async ({ supabase }) => {
    return await getTourDesignCrmContextServer(supabase);
  },
);
