import { bffRoute } from '@/lib/bff/route';
import { listActiveHotelTiersServer } from '@/lib/customers/hotel-tier-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'customers', route: '/api/customers/hotel-tiers' },
    requiredPermission: 'customers.write',
  },
  async ({ supabase }) => listActiveHotelTiersServer(supabase),
);
