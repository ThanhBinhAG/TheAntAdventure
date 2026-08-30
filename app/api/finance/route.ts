import { bffRoute } from '@/lib/bff/route';
import { listFinanceBundleServer } from '@/lib/finance/finance-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'finance', route: '/api/finance' },
    requiredPermission: 'finance.read',
  },
  async ({ supabase }) => listFinanceBundleServer(supabase),
);
