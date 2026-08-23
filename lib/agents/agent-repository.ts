import 'server-only';

import { nextAgentId, PROTECTED_AGENT_ID } from '@/lib/agents/agent-ids';
import {
  formFieldsToAgent,
  type AgentCreateBody,
  type AgentListQuery,
  type AgentPageResponse,
  type AgentPatchBody,
} from '@/lib/agents/agent-list-input';
import { agentToRow, rowToAgent } from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import type { Agent } from '@/lib/types';

export class AgentRepositoryError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'config'
      | 'query'
      | 'not_found'
      | 'blocked'
      | 'conflict' = 'query',
  ) {
    super(message);
    this.name = 'AgentRepositoryError';
  }
}

type AgentSupabaseClient = Awaited<ReturnType<typeof createAgentServerClient>>;

async function createAgentServerClient() {
  try {
    return await getServerSupabaseClient();
  } catch (error) {
    throw new AgentRepositoryError(
      error instanceof Error
        ? error.message
        : 'CRM session không hợp lệ hoặc Supabase chưa được cấu hình.',
      'config',
    );
  }
}

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

async function fetchAllAgents(supabase: AgentSupabaseClient): Promise<Agent[]> {
  const { data, error } = await supabase.from('agents').select('*');
  if (error) throw new AgentRepositoryError(error.message);
  return ((data ?? []) as Row[]).map(rowToAgent);
}

export async function listAgentsPage(
  input: AgentListQuery,
): Promise<AgentPageResponse> {
  const supabase = await createAgentServerClient();

  let query = supabase.from('agents').select('*', { count: 'exact' });

  if (input.q) {
    const safeQ = input.q.replace(/[,()]/g, ' ').trim();
    if (safeQ) {
      const pattern = `%${escapeIlike(safeQ)}%`;
      query = query.or(
        [
          `name.ilike.${pattern}`,
          `country.ilike.${pattern}`,
          `tier.ilike.${pattern}`,
          `notes.ilike.${pattern}`,
          `contact_name.ilike.${pattern}`,
          `email.ilike.${pattern}`,
          `id.ilike.${pattern}`,
        ].join(','),
      );
    }
  }

  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;

  const { data, error, count } = await query
    .order('id', { ascending: true })
    .range(from, to);

  if (error) throw new AgentRepositoryError(error.message);

  const totalCount = count ?? 0;
  const totalPages =
    totalCount === 0 ? 0 : Math.ceil(totalCount / input.pageSize);
  const items = ((data ?? []) as Row[]).map(rowToAgent);

  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: input.page > 1 && totalPages > 0,
    hasNextPage: input.page < totalPages,
  };
}

export async function getAgentById(id: string): Promise<Agent> {
  const supabase = await createAgentServerClient();
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new AgentRepositoryError(error.message);
  if (!data) {
    throw new AgentRepositoryError('Không tìm thấy đại lý.', 'not_found');
  }
  return rowToAgent(data as Row);
}

export async function createAgent(body: AgentCreateBody): Promise<Agent> {
  const supabase = await createAgentServerClient();
  const existing = await fetchAllAgents(supabase);
  const id = nextAgentId(existing);
  const agent = formFieldsToAgent(body.form, id);

  const { error } = await supabase.from('agents').insert(agentToRow(agent));
  if (error) throw new AgentRepositoryError(error.message);
  return agent;
}

export async function updateAgent(
  id: string,
  body: AgentPatchBody,
): Promise<Agent> {
  const supabase = await createAgentServerClient();
  await getAgentById(id);

  const agent = formFieldsToAgent(body.form, id);
  const { error } = await supabase
    .from('agents')
    .update(agentToRow(agent))
    .eq('id', id);

  if (error) throw new AgentRepositoryError(error.message);
  return agent;
}

export async function deleteAgent(id: string): Promise<void> {
  if (id === PROTECTED_AGENT_ID) {
    throw new AgentRepositoryError(
      'Không thể xóa đại lý Direct Client (AGT-001).',
      'blocked',
    );
  }

  const supabase = await createAgentServerClient();

  const { data: row, error: fetchError } = await supabase
    .from('agents')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw new AgentRepositoryError(fetchError.message);
  if (!row) {
    throw new AgentRepositoryError('Không tìm thấy đại lý.', 'not_found');
  }

  const { error } = await supabase.from('agents').delete().eq('id', id);
  if (error) throw new AgentRepositoryError(error.message);
}
