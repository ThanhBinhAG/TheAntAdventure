import { bffRoute } from '@/lib/bff/route';
import { getAllAttractionsServer } from '@/lib/attractions/attraction-repository';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'attractions/all', route: '/api/attractions/all' },
    requiredPermission: 'attractions.read',
    querySchema: z.object({
      region: z.enum(['north', 'central', 'south']).optional(),
    }),
  },
  async ({ supabase, query }) => {
    return await getAllAttractionsServer(supabase, query.region);
  }
);
