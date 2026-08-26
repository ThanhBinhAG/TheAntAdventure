import { bffRoute } from '@/lib/bff/route';
import { getAllTasksServer } from '@/lib/planner/task-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'planner/all', route: '/api/planner/all' },
    requiredPermission: 'planner.read',
  },
  async ({ supabase }) => {
    return await getAllTasksServer(supabase);
  }
);
