import { bffRoute } from '@/lib/bff/route';
import { taxPeriodQuerySchema } from '@/lib/tax/tax-input';
import { listTaxReportsServer } from '@/lib/tax/tax-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'tax', route: '/api/tax-reports' },
    requiredPermission: 'tax.read',
    querySchema: taxPeriodQuerySchema,
  },
  async ({ supabase, query }) => listTaxReportsServer(supabase, query.period),
);
