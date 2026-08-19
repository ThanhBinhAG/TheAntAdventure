import { bffRoute } from '@/lib/bff/route';
import { getAllTasksServer } from '@/lib/planner/task-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    requiredPermission: 'planner.read',
  },
  async () => {
    return await getAllTasksServer();
  }
);
