import { bffRoute } from '@/lib/bff/route';
import { listSalaryStaffServer } from '@/lib/salary/salary-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'salary', route: '/api/salary' },
    requiredPermission: 'salary.read',
  },
  async ({ supabase }) => listSalaryStaffServer(supabase),
);
