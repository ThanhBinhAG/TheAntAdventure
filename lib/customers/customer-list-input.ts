import { z } from 'zod';
import type { Customer } from '@/lib/types';

export const CUSTOMER_PAGE_SIZES = [12, 24, 48, 96] as const;

export type CustomerPageSize = (typeof CUSTOMER_PAGE_SIZES)[number];

export const customerPipelineStageFilterSchema = z.enum([
  'Inquiry',
  'Designing',
  'Quoted',
  'Negotiation',
  'Pending',
  'Confirmed',
  'On Tour',
  'Completed',
  'none',
]);

export type CustomerPipelineStageFilter = z.infer<
  typeof customerPipelineStageFilterSchema
>;

export const customerClientTypeFilterSchema = z.enum(['b2b', 'b2c']);

export type CustomerListFilters = {
  q?: string;
  source?: string;
  country?: string;
  salesperson?: string;
  clientType?: z.infer<typeof customerClientTypeFilterSchema>;
  agentId?: string;
  stage?: CustomerPipelineStageFilter;
};

export const customerListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int('page phải là số nguyên.')
    .min(1, 'page phải lớn hơn hoặc bằng 1.')
    .default(1),
  pageSize: z
    .enum(['12', '24', '48', '96'])
    .transform((value) => Number(value) as CustomerPageSize)
    .default(24),
  q: z.string().trim().min(1).max(100).optional(),
  source: z.string().trim().min(1).max(100).optional(),
  country: z.string().trim().min(1).max(100).optional(),
  salesperson: z.string().trim().min(1).max(100).optional(),
  clientType: customerClientTypeFilterSchema.optional(),
  agentId: z.string().trim().min(1).max(64).optional(),
  stage: customerPipelineStageFilterSchema.optional(),
});

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

export type CustomerListItem = Customer & {
  pipelineStage: string | null;
  pipelineValue: number;
  pipelineLeadCount: number;
  avgNps: number | null;
};

export type CustomerPageResponse = {
  items: CustomerListItem[];
  page: number;
  pageSize: CustomerPageSize;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

/** Shared form fields for create / update (mirrors CustomerFormData). */
export const customerFormFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().max(50).default(''),
  country: z.string().trim().min(1).max(100),
  nat: z.string().max(100).default(''),
  source: z.string().trim().min(1).max(100),
  style: z.string().trim().min(1).max(100),
  lang: z.string().trim().min(1).max(100),
  notes: z.string().max(8000).default(''),
  clientType: z.enum(['b2b', 'b2c']).default('b2c'),
  agentName: z.string().max(200).default(''),
  salesperson: z.string().max(100).default(''),
  whatsapp: z.string().max(50).default(''),
  hotelTier: z.string().max(100).default(''),
  budget: z.string().max(100).default(''),
  travelMonth: z.string().max(50).default(''),
  adults: z.string().max(10).default('2'),
  firstTime: z.string().max(50).default(''),
  flights: z.string().max(50).default('yes'),
  intlFlights: z.string().max(50).default(''),
  visaStatus: z.string().max(50).default(''),
  interests: z.string().max(2000).default(''),
  donts: z.string().max(2000).default(''),
  numChildren: z.string().max(10).default('0'),
  childAges: z.string().max(500).default(''),
  childDiet: z.string().max(500).default(''),
  childPrefs: z.string().max(500).default(''),
});

export const customerCreateBodySchema = z.object({
  form: customerFormFieldsSchema,
  createLead: z.boolean().default(true),
  logInquiry: z.boolean().default(true),
  flagTourDesign: z.boolean().default(false),
});

export type CustomerCreateBody = z.infer<typeof customerCreateBodySchema>;

export const customerPatchBodySchema = z.object({
  form: customerFormFieldsSchema.optional(),
  notes: z.string().max(8000).optional(),
});

export type CustomerPatchBody = z.infer<typeof customerPatchBodySchema>;

/** GET /api/customers/email-check — on-the-fly uniqueness while typing. */
export const customerEmailCheckQuerySchema = z.object({
  email: z.string().trim().email().max(200),
  excludeId: z.string().trim().min(1).max(64).optional(),
});

export type CustomerEmailCheckQuery = z.infer<typeof customerEmailCheckQuerySchema>;

/** POST /api/customers/:id/inquiry — new Inquiry lead from profile modal. */
export const customerInquiryBodySchema = z.object({
  flagTourDesign: z.boolean().optional().default(true),
});

export type CustomerInquiryBody = z.infer<typeof customerInquiryBodySchema>;

/** POST /api/customers/:id/comms — log a communication from profile modal. */
export const customerCommCreateBodySchema = z.object({
  type: z.string().trim().min(1).max(50),
  dir: z.enum(['inbound', 'outbound']),
  date: z.string().trim().min(1).max(20),
  subj: z.string().trim().min(1).max(500),
  body: z.string().max(8000).default(''),
});

export type CustomerCommCreateBody = z.infer<typeof customerCommCreateBodySchema>;

export function optionalCustomerQueryParam(
  url: URL,
  name: string,
): string | undefined {
  return url.searchParams.get(name) || undefined;
}
