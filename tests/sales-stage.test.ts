import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KANBAN_STAGES,
  STAGE_COLORS,
  STAGE_ORDER,
  STAGE_PROB_V22,
} from '../lib/constants';
import { getLeadWeightedValue } from '../lib/sales-lead-utils';
import type { Lead } from '../lib/types';

test('KANBAN_STAGES includes On Tour between Confirmed and Completed', () => {
  const stages = [...KANBAN_STAGES];
  assert.ok(stages.includes('On Tour'));
  assert.equal(stages.indexOf('On Tour'), stages.indexOf('Confirmed') + 1);
  assert.equal(stages.indexOf('Completed'), stages.indexOf('On Tour') + 1);
});

test('STAGE_PROB_V22 covers every kanban stage plus Lost', () => {
  for (const stage of KANBAN_STAGES) {
    assert.ok(stage in STAGE_PROB_V22, `missing probability for ${stage}`);
    assert.ok(STAGE_PROB_V22[stage] >= 0 && STAGE_PROB_V22[stage] <= 100);
  }
  assert.equal(STAGE_PROB_V22.Lost, 0);
  assert.equal(STAGE_PROB_V22.Inquiry, 10);
  assert.equal(STAGE_PROB_V22.Pending, 70);
  assert.equal(STAGE_PROB_V22.Designing, 25);
  assert.equal(STAGE_PROB_V22.Confirmed, 90);
  assert.equal(STAGE_PROB_V22['On Tour'], 95);
  assert.equal(STAGE_PROB_V22.Completed, 100);
});

test('STAGE_COLORS defined for kanban stages and Lost', () => {
  for (const stage of [...KANBAN_STAGES, 'Lost']) {
    assert.ok(STAGE_COLORS[stage], `missing color for ${stage}`);
  }
});

test('STAGE_ORDER prefers later pipeline stages first', () => {
  assert.ok(STAGE_ORDER.indexOf('Completed') < STAGE_ORDER.indexOf('Confirmed'));
  assert.ok(STAGE_ORDER.indexOf('On Tour') < STAGE_ORDER.indexOf('Confirmed'));
  assert.ok(STAGE_ORDER.indexOf('Inquiry') > STAGE_ORDER.indexOf('Designing'));
});

test('getLeadWeightedValue uses explicit probability or STAGE_PROB_V22', () => {
  const base: Lead = {
    id: 'LD-1',
    custId: 'CUS-1',
    tour: 'T',
    pax: 2,
    value: 1000,
    month: 'Jun 2026',
    stage: 'Confirmed',
    owner: 'Tai',
  };
  assert.equal(getLeadWeightedValue(base), 900);
  assert.equal(getLeadWeightedValue({ ...base, probability: 50 }), 500);
  assert.equal(getLeadWeightedValue({ ...base, stage: 'On Tour', probability: undefined }), 950);
  assert.equal(getLeadWeightedValue({ ...base, stage: 'Lost', value: 5000 }), 0);
});

/**
 * Documents UI gap: PipeCard stage <select> omits On Tour while KANBAN_STAGES includes it.
 * This test locks the canonical stage list so regressions stay visible.
 */
test('canonical stage list for moveStage probability lookup includes On Tour', () => {
  const moveStageProb = (newStage: string) => STAGE_PROB_V22[newStage] ?? 10;
  assert.equal(moveStageProb('On Tour'), 95);
  assert.equal(moveStageProb('Confirmed'), 90);
});
