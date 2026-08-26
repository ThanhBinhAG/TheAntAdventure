import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import { acknowledgeTourDesignLeadServer } from '@/lib/tour-design/tour-design-repository';

export const dynamic = 'force-dynamic';

export const POST = bffRoute(
  {
    logging: { scope: 'tour-design/acknowledgements', route: '/api/tour-design/acknowledgements' },
    requiredPermission: 'tour_design.write',
    bodySchema: z.object({
      leadId: z.string().trim().min(1).max(100),
    }).strict(),
  },
  async ({ supabase, body }) => acknowledgeTourDesignLeadServer(supabase, body.leadId),
);
