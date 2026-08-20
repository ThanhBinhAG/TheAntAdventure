import { bffRoute } from '@/lib/bff/route';
import { getAllAttractionsServer } from '@/lib/attractions/attraction-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    requiredPermission: 'attractions.read',
  },
  async () => {
    return await getAllAttractionsServer();
  }
);
