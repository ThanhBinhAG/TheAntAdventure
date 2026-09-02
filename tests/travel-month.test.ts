import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { formatTravelMonth, isIsoTravelMonth, travelMonthInputValue } from '@/lib/core/travel-month';
import { buildBriefSummaryHtml } from '@/lib/tour-design/tour-brief-summary';
import { DEFAULT_TOUR_BRIEF } from '@/lib/tour-design/tour-design-types';
import { resolveTravelStart } from '@/lib/tour-design/tour-itinerary';
import { formatLeadTravelMonth } from '@/lib/sales/sales-lead-utils';

test('stores and displays an exact travel month while preserving a legacy month-only value', () => {
  assert.equal(isIsoTravelMonth('2027-10'), true);
  assert.equal(formatTravelMonth('2027-10'), 'Oct 2027');
  assert.equal(formatTravelMonth('Jan'), 'Jan');
  assert.equal(formatLeadTravelMonth('2027-10'), 'Oct 2027');
  assert.equal(formatLeadTravelMonth('Jan'), 'Jan');
  assert.equal(travelMonthInputValue('2027-10'), '2027-10');
});

test('Tour Design derives itinerary dates only from a travel month that includes a year', () => {
  assert.equal(resolveTravelStart('', 'Jan').date, null);
  const exact = resolveTravelStart('', '2027-10');
  assert.equal(exact.date?.getFullYear(), 2027);
  assert.equal(exact.date?.getMonth(), 9);
  assert.equal(exact.isEstimate, true);
});

test('Tour Design summaries and the Customer form show the precise selected year', () => {
  const summary = buildBriefSummaryHtml({ ...DEFAULT_TOUR_BRIEF, travelMonth: '2027-10' }, 'b2c');
  assert.match(summary, /Oct 2027/);
  assert.doesNotMatch(summary, /2026/);

  const customerForm = readFileSync(join(process.cwd(), 'components/customers/CustomerFormModal.tsx'), 'utf8');
  const briefForm = readFileSync(join(process.cwd(), 'components/tour-design/ClientBriefStep.tsx'), 'utf8');
  const proposalAssembler = readFileSync(join(process.cwd(), 'lib/proposals/proposal-assembler.ts'), 'utf8');
  assert.match(customerForm, /type="month"/);
  assert.match(briefForm, /type="month"/);
  assert.doesNotMatch(customerForm, /TravelMonthPicker/);
  assert.doesNotMatch(briefForm, /TravelMonthPicker/);
  assert.match(proposalAssembler, /formatTravelMonth\(travelMonth\)/);
});
