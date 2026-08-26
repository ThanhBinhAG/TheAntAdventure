import { bffRoute } from '@/lib/bff/route';
import { getTourDesignReferenceDataServer } from '@/lib/tour-design/tour-design-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'tour-design/reference-data', route: '/api/tour-design/reference-data' },
    requiredPermission: 'tour_design.read',
  },
  async ({ supabase }) => getTourDesignReferenceDataServer(supabase),
);
