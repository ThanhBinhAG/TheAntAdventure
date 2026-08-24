import { z } from 'zod';
import type { Lead, OutlineStatus } from '@/lib/types';
import type {
  ListSortField,
  SalesTimeFilterMode,
  SortDirection,
} from '@/lib/sales/sales-lead-utils';

export const LEAD_PAGE_SIZES = [12, 24, 48, 96] as const;

export type LeadPageSize = (typeof LEAD_PAGE_SIZES)[number];

export type LeadListScope = 'list' | 'pipeline';

export type LeadListFilters = {
  q?: string;
  custId?: string;
  stage?: string;
  timeMode?: SalesTimeFilterMode;
  travelMonth?: string;
  followUpFrom?: string;
  followUpTo?: string;
  sortField?: ListSortField;
  sortDirection?: SortDirection;
  scope?: LeadListScope;
  includeLost?: boolean;
};

export const leadListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int('page phải là số nguyên.')
    .min(1, 'page phải lớn hơn hoặc bằng 1.')
    .default(1),
  pageSize: z
    .enum(['12', '24', '48', '96'])
    .transform((value) => Number(value) as LeadPageSize)
    .default(24),
  q: z.string().trim().min(1).max(200).optional(),
  custId: z.string().trim().min(1).max(50).optional(),
  stage: z.string().trim().min(1).max(50).optional(),
  timeMode: z
    .enum([
      'all',
      'followUpToday',
      'followUpWeek',
      'overdue',
      'travelMonth',
      'followUpRange',
    ])
    .optional()
    .default('all'),
  travelMonth: z.string().trim().min(1).max(20).optional(),
  followUpFrom: z.string().trim().min(1).max(20).optional(),
  followUpTo: z.string().trim().min(1).max(20).optional(),
  sortField: z
    .enum(['weighted', 'value', 'travelDate', 'followUp', 'stage', 'customer'])
    .optional()
    .default('followUp'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('asc'),
  scope: z.enum(['list', 'pipeline']).optional().default('pipeline'),
  includeLost: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .default(false),
  highlightLeadId: z.string().trim().min(1).max(50).optional(),
});

export type LeadListQuery = z.infer<typeof leadListQuerySchema>;

export type LeadListItem = Lead & {
  customerName: string;
  outlineStatus?: OutlineStatus | null;
  outlineRevision?: number;
  hasBooking?: boolean;
};

export type LeadPageResponse = {
  items: LeadListItem[];
  page: number;
  pageSize: LeadPageSize;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  travelMonths: string[];
};

export const leadPatchBodySchema = z
  .object({
    stage: z.string().trim().min(1).max(50).optional(),
    probability: z.coerce.number().min(0).max(100).optional(),
    followUpDate: z.string().trim().max(20).nullable().optional(),
    nextAction: z.string().trim().max(500).nullable().optional(),
    lostReason: z.string().trim().max(200).optional(),
    lostNote: z.string().trim().max(2000).optional(),
    lostAt: z.string().trim().max(20).optional(),
  })
  .refine(
    (body) =>
      body.stage != null ||
      body.probability != null ||
      body.followUpDate !== undefined ||
      body.nextAction !== undefined ||
      body.lostReason != null ||
      body.lostNote != null ||
      body.lostAt != null,
    { message: 'Cần ít nhất một trường cập nhật.' },
  );

export type LeadPatchBody = z.infer<typeof leadPatchBodySchema>;

export function optionalLeadQueryParam(
  url: URL,
  name: string,
): string | undefined {
  return url.searchParams.get(name) || undefined;
}

/** Max leads returned for pipeline kanban (filtered set). */
export const PIPELINE_LEADS_CAP = 2000;
