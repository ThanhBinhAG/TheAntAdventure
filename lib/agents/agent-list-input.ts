import { z } from 'zod';
import type { Agent } from '@/lib/types';

export const AGENT_PAGE_SIZES = [12, 24, 48, 96] as const;

export type AgentPageSize = (typeof AGENT_PAGE_SIZES)[number];

export type AgentListFilters = {
  q?: string;
};

export const agentListQuerySchema = z.object({
  page: z.coerce
    .number()
    .int('page phải là số nguyên.')
    .min(1, 'page phải lớn hơn hoặc bằng 1.')
    .default(1),
  pageSize: z
    .enum(['12', '24', '48', '96'])
    .transform((value) => Number(value) as AgentPageSize)
    .default(24),
  q: z.string().trim().min(1).max(100).optional(),
});

export type AgentListQuery = z.infer<typeof agentListQuerySchema>;

export type AgentListItem = Agent;

export type AgentPageResponse = {
  items: AgentListItem[];
  page: number;
  pageSize: AgentPageSize;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export const agentFormFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  country: z.string().trim().min(1).max(100).default('USA'),
  tier: z.string().trim().min(1).max(50).default('Bronze'),
  commissionPct: z.coerce.number().min(0).max(30).default(8),
  currency: z.string().trim().min(1).max(10).default('USD'),
  contactName: z.string().max(200).default(''),
  email: z.string().max(200).default(''),
  phone: z.string().max(50).default(''),
  notes: z.string().max(8000).default(''),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

export type AgentFormFields = z.infer<typeof agentFormFieldsSchema>;

export const agentCreateBodySchema = z.object({
  form: agentFormFieldsSchema,
});

export type AgentCreateBody = z.infer<typeof agentCreateBodySchema>;

export const agentPatchBodySchema = z.object({
  form: agentFormFieldsSchema,
});

export type AgentPatchBody = z.infer<typeof agentPatchBodySchema>;

export function optionalAgentQueryParam(
  url: URL,
  name: string,
): string | undefined {
  return url.searchParams.get(name) || undefined;
}

export function formFieldsToAgent(
  form: AgentFormFields,
  id: string,
): Agent {
  return {
    id,
    name: form.name.trim(),
    country: form.country.trim() || 'USA',
    tier: form.tier,
    commissionPct: form.commissionPct,
    currency: form.currency,
    contactName: form.contactName.trim() || '—',
    email: form.email.trim() || '—',
    phone: form.phone.trim() || '—',
    notes: form.notes.trim(),
    status: form.status,
  };
}
