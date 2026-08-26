import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import type { TourDraft, TourOutlineDay } from '@/lib/types';
import {
  applyTourDesignOutlineWorkflowServer,
  TourDesignSaveConflictError,
} from '@/lib/tour-design/tour-design-repository';

export const dynamic = 'force-dynamic';

const tourDraftSchema = z.object({
  id: z.string().min(1),
  leadId: z.string().min(1),
  custId: z.string().min(1),
  briefJson: z.record(z.string(), z.any()).optional().nullable().transform((v) => v || undefined),
  outlineStatus: z.enum(['draft', 'sent', 'approved']).default('draft'),
  outlineNotes: z.string().optional().nullable().transform((v) => v || undefined),
  outlineSentAt: z.string().optional().nullable().transform((v) => v || undefined),
  outlineApprovedAt: z.string().optional().nullable().transform((v) => v || undefined),
  outlineRevision: z.number().int().nonnegative().optional().nullable().transform((v) => v || undefined),
  selectedCodes: z.array(z.string()).optional().nullable().transform((v) => v || undefined),
  selectedPackageId: z.string().optional().nullable().transform((v) => v || undefined),
  experienceOverrides: z.record(z.string(), z.any()).optional().nullable().transform((v) => v || undefined),
  markupPct: z.number().optional().nullable().transform((v) => v || undefined),
  clientType: z.enum(['b2c', 'b2b']).optional().nullable().transform((v) => v || undefined),
  currentStep: z.number().int().nonnegative().optional().nullable().transform((v) => v || undefined),
});

const tourOutlineDaySchema = z.object({
  id: z.string().min(1),
  draftId: z.string().min(1),
  dayNumber: z.number().int().positive(),
  date: z.string().optional().nullable().transform((v) => v || undefined),
  location: z.string().optional().nullable().transform((v) => v || undefined),
  activities: z.string().optional().nullable().transform((v) => v || undefined),
  hotels: z.string().optional().nullable().transform((v) => v || undefined),
  sortOrder: z.number().int().nonnegative().optional().nullable().transform((v) => v || undefined),
});

export const POST = bffRoute(
  {
    logging: { scope: 'tour-design/outline-workflow', route: '/api/tour-design/outline-workflow' },
    requiredPermission: 'tour_design.write',
    bodySchema: z.object({
      action: z.enum(['sent', 'resent', 'approved', 'revised']),
      draft: tourDraftSchema,
      outlineDays: z.array(tourOutlineDaySchema),
      expectedSaveRevision: z.number().int().nonnegative(),
    }).strict(),
  },
  async ({ supabase, body }) => {
    try {
      return await applyTourDesignOutlineWorkflowServer(supabase, {
        action: body.action,
        draft: body.draft as TourDraft,
        outlineDays: body.outlineDays as TourOutlineDay[],
        expectedSaveRevision: body.expectedSaveRevision,
      });
    } catch (error) {
      if (error instanceof TourDesignSaveConflictError) {
        return NextResponse.json(
          { ok: false, error: error.message, currentSaveRevision: error.currentSaveRevision },
          { status: 409 },
        );
      }
      throw error;
    }
  },
);
