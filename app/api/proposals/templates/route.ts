/** Company-wide B2C/B2B commercial and legal proposal copy. */

import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import {
  fetchCompanyProposalTemplates,
  upsertCompanyProposalTemplate,
} from '@/lib/proposals/proposal-company-template-server';
import { parseCompanyTemplateFields } from '@/lib/proposals/proposal-company-template';

export const dynamic = 'force-dynamic';

const templateText = z.string().trim().max(12_000);
const templateLine = z.string().trim().min(1).max(1_000);

const proposalTemplateFieldsSchema = z.object({
  tagline: templateText.max(1_000).optional(),
  bookingFields: z.object({
    'Payment Terms': templateText.optional(),
    Commission: templateText.optional(),
    'Valid Until': templateText.optional(),
  }).strict().optional(),
  inclusions: z.array(templateLine).max(100).optional(),
  exclusions: z.array(templateLine).max(100).optional(),
  pricingText: z.object({
    footnote: templateText.optional(),
    b2bGroundDesc: templateText.optional(),
    b2bFlightsDesc: templateText.optional(),
  }).strict().optional(),
  legalText: z.object({
    paymentTerms: templateText.optional(),
    cancellation: templateText.optional(),
    amendment: templateText.optional(),
    importantNotes: templateText.optional(),
  }).strict().optional(),
  theme: z.object({
    brand: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    brandDark: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    tableHeader: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    rowAlt: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }).strict().optional(),
}).strict();

export const GET = bffRoute(
  { requiredPermission: 'tour_design.read' },
  async ({ supabase }) => fetchCompanyProposalTemplates(supabase)
);

export const PUT = bffRoute(
  {
    requiredPermission: 'tour_design.write',
    bodySchema: z.object({
      variant: z.enum(['b2c', 'b2b']),
      fields: proposalTemplateFieldsSchema,
    }).strict(),
  },
  async ({ supabase, body }) =>
    upsertCompanyProposalTemplate(supabase, body.variant, parseCompanyTemplateFields(body.fields))
);
