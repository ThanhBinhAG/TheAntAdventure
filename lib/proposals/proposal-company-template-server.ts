import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  emptyCompanyTemplatesMap,
  parseCompanyTemplateFields,
  resolveCompanyTemplate,
  serializeCompanyTemplate,
  type CompanyTemplatesMap,
} from './proposal-company-template';
import type { ProposalTemplateOverrides } from './proposal-content-overrides';
import type { ProposalVariant } from './proposal-types';

export async function fetchCompanyProposalTemplates(
  client: SupabaseClient
): Promise<CompanyTemplatesMap> {
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
  client: SupabaseClient,
  variant: ProposalVariant,
  fields: ProposalTemplateOverrides
): Promise<CompanyTemplatesMap> {
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
  return fetchCompanyProposalTemplates(client);
}
