import { bffRoute } from '@/lib/bff/route';
import { getAllAttractionsServer } from '@/lib/attractions/attraction-repository';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    requiredPermission: 'attractions.read',
    querySchema: z.object({
      region: z.enum(['north', 'central', 'south']).optional(),
    }),
  },
  async ({ query }) => {
    return await getAllAttractionsServer(query.region);
  }
);
