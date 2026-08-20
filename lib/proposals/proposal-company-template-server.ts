import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/env';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import {
  emptyCompanyTemplatesMap,
  parseCompanyTemplateFields,
  resolveCompanyTemplate,
  serializeCompanyTemplate,
  type CompanyTemplatesMap,
} from './proposal-company-template';
import type { ProposalTemplateOverrides } from './proposal-content-overrides';
import type { ProposalVariant } from './proposal-types';

function getServiceClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getTemplateClient(): Promise<SupabaseClient | null> {
  const service = getServiceClient();
  if (service) return service;

  return getServerSupabaseClient();
}

export async function fetchCompanyProposalTemplates(): Promise<CompanyTemplatesMap> {
  const client = await getTemplateClient();
  if (!client) return emptyCompanyTemplatesMap();

  try {
    const { data, error } = await client.from('proposal_templates').select('id, fields, updated_at');
    if (error) return emptyCompanyTemplatesMap();

    const map = emptyCompanyTemplatesMap();
    for (const row of data ?? []) {
      const id = row.id === 'b2b' ? 'b2b' : row.id === 'b2c' ? 'b2c' : null;
      if (!id) continue;
      const resolved = resolveCompanyTemplate(id, parseCompanyTemplateFields(row.fields));
      map[id] = {
        ...resolved,
        updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
      };
    }
    return map;
  } catch {
    return emptyCompanyTemplatesMap();
  }
}

export async function upsertCompanyProposalTemplate(
  variant: ProposalVariant,
  fields: ProposalTemplateOverrides
): Promise<CompanyTemplatesMap> {
  const client = await getTemplateClient();
  if (!client) {
    throw new Error('Database is not configured');
  }

  const payload = serializeCompanyTemplate(fields);
  const { error } = await client.from('proposal_templates').upsert(
    {
      id: variant,
      fields: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
  return fetchCompanyProposalTemplates();
}
