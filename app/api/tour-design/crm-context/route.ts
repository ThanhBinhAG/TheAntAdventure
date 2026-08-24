import { bffRoute } from '@/lib/bff/route';
import { getTourDesignCrmContextServer } from '@/lib/tour-design/tour-design-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    requiredPermission: 'tour_design.read',
  },
  async () => {
    return await getTourDesignCrmContextServer();
  },
);
