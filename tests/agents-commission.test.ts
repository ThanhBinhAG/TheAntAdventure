import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeAgentCommission,
  EARNED_STAGES,
  isActivePipelineLead,
  isEarnedCommissionStage,
  summarizeAgentCommissions,
} from '../lib/sales/agents-commission';
import type { Agent, Lead } from '../lib/types';

const agent: Agent = {
  id: 'AGT-002',
  name: 'Black Tomato',
  country: 'UK',
  tier: 'Gold',
  commissionPct: 10,
  status: 'Active',
  contactName: '',
  email: '',
  phone: '',
  currency: 'USD',
  notes: '',
};

function lead(partial: Partial<Lead> & Pick<Lead, 'id' | 'stage' | 'value'>): Lead {
  return {
    custId: 'CUS-1',
    tour: 'Test',
    pax: 2,
    month: 'Jun 2026',
    owner: 'Tai',
    agentId: agent.id,
    ...partial,
  };
}

test('EARNED_STAGES includes Confirmed, On Tour, Completed only', () => {
  assert.deepEqual([...EARNED_STAGES].sort(), ['Completed', 'Confirmed', 'On Tour'].sort());
  assert.equal(isEarnedCommissionStage('Confirmed'), true);
  assert.equal(isEarnedCommissionStage('On Tour'), true);
  assert.equal(isEarnedCommissionStage('Quoted'), false);
  assert.equal(isEarnedCommissionStage('Inquiry'), false);
  assert.equal(isEarnedCommissionStage('Lost'), false);
});

test('isActivePipelineLead excludes Lost and Completed', () => {
  assert.equal(isActivePipelineLead('Inquiry'), true);
  assert.equal(isActivePipelineLead('Confirmed'), true);
  assert.equal(isActivePipelineLead('On Tour'), true);
  assert.equal(isActivePipelineLead('Completed'), false);
  assert.equal(isActivePipelineLead('Lost'), false);
});

test('computeAgentCommission only counts earned stages', () => {
  const leads = [
    lead({ id: 'L1', stage: 'Confirmed', value: 1000 }),
    lead({ id: 'L2', stage: 'On Tour', value: 2000 }),
    lead({ id: 'L3', stage: 'Completed', value: 500 }),
    lead({ id: 'L4', stage: 'Quoted', value: 9999 }),
    lead({ id: 'L5', stage: 'Confirmed', value: 100, agentId: 'OTHER' }),
  ];
  const stats = computeAgentCommission(agent, leads);
  assert.equal(stats.gross, 3500);
  assert.equal(stats.comm, 350);
  assert.equal(stats.net, 3150);
  assert.equal(stats.bookings, 3);
});

test('summarizeAgentCommissions aggregates grand totals', () => {
  const agents = [
    agent,
    { ...agent, id: 'AGT-003', name: 'Pelorus', commissionPct: 12 },
  ];
  const leads = [
    lead({ id: 'L1', stage: 'Confirmed', value: 1000 }),
    lead({ id: 'L2', stage: 'Confirmed', value: 2000, agentId: 'AGT-003' }),
  ];
  const summary = summarizeAgentCommissions(agents, leads);
  assert.equal(summary.grandGross, 3000);
  assert.equal(summary.grandComm, 100 + 240);
  assert.equal(summary.grandNet, 3000 - 340);
  assert.equal(summary.rows.length, 2);
});
