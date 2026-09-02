import { bffRoute } from '@/lib/bff/route';
import { listActiveHotelTiersServer } from '@/lib/customers/hotel-tier-repository';
import { listTravelStylesServer } from '@/lib/customers/travel-style-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'tour-design/client-preferences', route: '/api/tour-design/client-preferences' },
    requiredPermission: 'tour_design.read',
  },
  async ({ supabase }) => {
    const [travelStyles, hotelTiers] = await Promise.all([
      listTravelStylesServer(supabase),
      listActiveHotelTiersServer(supabase),
    ]);
    return { travelStyles, hotelTiers };
  },
);
