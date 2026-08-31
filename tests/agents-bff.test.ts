import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  AGENT_PAGE_SIZES,
  agentCreateBodySchema,
  agentListQuerySchema,
  agentPatchBodySchema,
  formFieldsToAgent,
} from '@/lib/agents/agent-list-input';
import { nextAgentId, PROTECTED_AGENT_ID } from '@/lib/agents/agent-ids';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('agent list query accepts page/pageSize/q', () => {
  const parsed = agentListQuerySchema.safeParse({
    page: '2',
    pageSize: '24',
    q: 'virtuoso',
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.page, 2);
  assert.equal(parsed.data.pageSize, 24);
  assert.equal(parsed.data.q, 'virtuoso');
  assert.ok((AGENT_PAGE_SIZES as readonly number[]).includes(parsed.data.pageSize));
});

test('agent create/patch bodies require name', () => {
  const bad = agentCreateBodySchema.safeParse({ form: { name: '' } });
  assert.equal(bad.success, false);

  const ok = agentCreateBodySchema.safeParse({
    form: {
      name: 'Virtuoso',
      country: 'USA',
      tier: 'Gold',
      commissionPct: 15,
      currency: 'USD',
      contactName: 'Alex',
      email: 'a@example.com',
      phone: '+1',
      notes: '',
      status: 'Active',
    },
  });
  assert.equal(ok.success, true);

  const patch = agentPatchBodySchema.safeParse({
    form: {
      name: 'Virtuoso',
      country: 'USA',
      tier: 'Gold',
      commissionPct: 12,
      currency: 'USD',
      status: 'Active',
    },
  });
  assert.equal(patch.success, true);
});

test('nextAgentId increments AGT sequence and protected id is AGT-001', () => {
  assert.equal(PROTECTED_AGENT_ID, 'AGT-001');
  assert.equal(nextAgentId([]), 'AGT-001');
  assert.equal(nextAgentId([{ id: 'AGT-001' }, { id: 'AGT-006' }]), 'AGT-007');
});

test('formFieldsToAgent fills em-dash placeholders', () => {
  const agent = formFieldsToAgent(
    {
      name: 'ILV',
      country: 'Belgium',
      tier: 'Silver',
      commissionPct: 12,
      currency: 'EUR',
      contactName: '',
      email: '',
      phone: '',
      notes: 'cycling',
      status: 'Active',
    },
    'AGT-002',
  );
  assert.equal(agent.id, 'AGT-002');
  assert.equal(agent.contactName, '—');
  assert.equal(agent.email, '—');
  assert.equal(agent.phone, '—');
  assert.equal(agent.notes, 'cycling');
});

test('Agents BFF cutover: API hooks and denylist', () => {
  const bffManaged = source('lib/db/bff-managed-tables.ts');
  const agentsPage = source('components/agents/AgentsPage.tsx');
  const register = source('hooks/useRegisterAgent.ts');
  const deleteHook = source('hooks/useDeleteAgent.ts');
  const listHook = source('hooks/useAgentPage.ts');
  const api = source('app/api/agents/route.ts');
  const apiId = source('app/api/agents/[id]/route.ts');

  assert.match(bffManaged, /'agents'/);
  assert.match(listHook, /\/api\/agents/);
  assert.match(register, /\/api\/agents/);
  assert.match(register, /withoutAutoSyncAsync/);
  assert.match(deleteHook, /DELETE/);
  assert.match(deleteHook, /withoutAutoSyncAsync/);
  assert.match(deleteHook, /PROTECTED_AGENT_ID/);
  assert.match(agentsPage, /useAgentPage/);
  assert.match(agentsPage, /useRegisterAgent/);
  assert.match(agentsPage, /useDeleteAgent/);
  assert.doesNotMatch(agentsPage, /\baddAgent\b/);
  assert.doesNotMatch(agentsPage, /\bupdateAgent\b/);
  assert.match(api, /agents\.read/);
  assert.match(api, /agents\.write/);
  assert.match(apiId, /agents\.write/);
  assert.match(apiId, /blocked/);
});

test('Agents page uses CRM BFF catalog without browser hydrate', () => {
  const catalog = source('hooks/useEnsureAgentsCatalogLoaded.ts');
  const page = source('components/agents/AgentsPage.tsx');
  const list = source('hooks/useAgentPage.ts');

  assert.match(catalog, /pageSize: 96/);
  assert.match(catalog, /withoutAutoSyncAsync/);
  assert.match(catalog, /fetchAgentJsonOnce/);
  assert.match(catalog, /ensureCatalog/);
  assert.match(page, /useEnsureAgentsCatalogLoaded/);
  assert.match(page, /applyCatalogItems/);
  assert.match(page, /unfilteredFullSet/);
  assert.doesNotMatch(page, /lib\/db\/hydrate/);
  assert.match(list, /export function fetchAgentJsonOnce/);
});
