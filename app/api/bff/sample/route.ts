import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';

export const dynamic = 'force-dynamic';

// GET: Yêu cầu dashboard.read, validate query string { name }
export const GET = bffRoute(
  {
    logging: { scope: 'bff/sample', route: '/api/bff/sample' },
    requiredPermission: 'dashboard.read',
    querySchema: z.object({
      name: z.string().min(1),
    }),
  },
  async ({ query, auth }) => {
    return {
      message: `Hello ${query.name}!`,
      userId: auth.userId,
      email: auth.email,
    };
  }
);

// POST: Yêu cầu hr.write (quyền nhạy cảm hơn), validate JSON body { value }
export const POST = bffRoute(
  {
    logging: { scope: 'bff/sample', route: '/api/bff/sample' },
    requiredPermission: 'hr.write',
    bodySchema: z.object({
      value: z.number().min(0),
    }),
  },
  async ({ body, auth }) => {
    return {
      receivedValue: body.value,
      actor: auth.userId || 'break-glass-actor',
    };
  }
);
