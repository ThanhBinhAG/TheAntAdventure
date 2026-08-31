import { bffRoute } from '@/lib/bff/route';
import { listHrStaffServer } from '@/lib/hr/hr-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'hr', route: '/api/hr' },
    requiredPermission: 'hr.read',
  },
  async ({ supabase }) => listHrStaffServer(supabase),
);
