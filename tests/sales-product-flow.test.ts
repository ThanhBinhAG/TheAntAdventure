import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_CUSTOMER_FORM, type CustomerFormData } from '../lib/customers/customer-form';
import { registerNewCustomer } from '../lib/customers/customer-onboarding';
import { isExperiencesBlocked } from '../lib/tour-design/tour-design-gate';
import {
  applyOutlineWorkflowPatch,
  patchOutlineApproved,
  patchOutlineSent,
} from '../lib/tour-design/tour-outline-workflow';
import { ensureTourDesignLead } from '../lib/tour-design/tour-design-lead';
import { DEFAULT_TOUR_BRIEF } from '../lib/tour-design/tour-design-types';
import { STAGE_PROB_V22 } from '../lib/constants';
import { getLeadWeightedValue } from '../lib/sales/sales-lead-utils';
import { sumSellForProducts } from '../lib/tour-design/tour-pricing';
import { ensureBookingForConfirmedLead } from '../lib/sales/booking-from-lead';
import { useStore } from '../lib/store';
import type { Lead, ProductPricing, TourDraft } from '../lib/types';

/**
 * End-to-end domain flow (no React):
 * Customer register → Inquiry lead → Outline send/approve → Designing
 * → product sell sum as pipeline value.
 */
test('Sales & Product cross-flow: register → outline → designing value', () => {
  const form: CustomerFormData = {
    ...EMPTY_CUSTOMER_FORM,
    name: 'Flow Client',
    email: 'flow-client@example.com',
    phone: '+84 90',
    style: 'Luxury',
    adults: '2',
    travelMonth: '2026-10',
    salesperson: 'Tai Pham',
    source: 'Website',
  };

  const registered = registerNewCustomer({
    form,
    customers: [],
    agents: [],
    leads: [],
    flagTourDesign: true,
  });
  assert.equal(registered.ok, true);
  if (!registered.ok) return;

  assert.ok(registered.customer.id.startsWith('CUS-'));
  assert.ok(registered.lead);
  assert.equal(registered.lead!.stage, 'Inquiry');
  assert.equal(registered.lead!.probability, 10);
  assert.equal(registered.lead!.needsTourDesign, true);
  assert.ok(registered.comm);

  let lead: Lead = registered.lead!;
  let draft: TourDraft = {
    id: `TD-${lead.id}`,
    leadId: lead.id,
    custId: registered.customer.id,
    outlineStatus: 'draft',
    outlineRevision: 0,
    currentStep: 1,
  };

  assert.equal(isExperiencesBlocked(lead.id, 3, draft.outlineStatus), true);

  const sentPatch = patchOutlineSent(
    draft,
    registered.customer.id,
    registered.customer.name,
    form.salesperson
  );
  draft = applyOutlineWorkflowPatch(lead.id, draft, sentPatch, {
    upsertTourDraft: (d) => {
      draft = d;
    },
    updateLead: (_id, data) => {
      lead = { ...lead, ...data };
    },
  });
  assert.equal(draft.outlineStatus, 'sent');
  assert.equal(lead.stage, 'Pending');
  assert.equal(lead.probability, STAGE_PROB_V22.Pending);
  assert.equal(isExperiencesBlocked(lead.id, 3, draft.outlineStatus), true);

  const approvedPatch = patchOutlineApproved(
    draft,
    registered.customer.id,
    registered.customer.name,
    form.salesperson
  );
  draft = applyOutlineWorkflowPatch(lead.id, draft, approvedPatch, {
    upsertTourDraft: (d) => {
      draft = d;
    },
    updateLead: (_id, data) => {
      lead = { ...lead, ...data };
    },
  });
  assert.equal(draft.outlineStatus, 'approved');
  assert.equal(lead.stage, 'Designing');
  assert.equal(lead.probability, STAGE_PROB_V22.Designing);
  assert.equal(isExperiencesBlocked(lead.id, 3, draft.outlineStatus), false);

  const brief = {
    ...DEFAULT_TOUR_BRIEF,
    pax: 2,
    duration: '7D6N',
    region: 'North',
    travelMonth: 'Oct 2026',
    startDate: '2026-10-01',
    salesperson: 'Tai Pham',
  };
  const designLead = ensureTourDesignLead({
    custId: registered.customer.id,
    customer: registered.customer,
    brief,
    clientType: 'b2c',
    leads: [lead],
  });
  assert.equal(designLead.id, lead.id);

  const pricing: ProductPricing = {
    productCode: 'AA-FLOW-01',
    stdCost: 40,
    p1: 200,
    p2: 150,
    p3: 120,
    p4: 100,
    p5: 90,
    p6: 80,
    p7: 70,
    p8: 65,
    p9: 60,
    p10: 55,
    c1: 100,
    c2: 80,
    c3: 70,
    c4: 60,
    c5: 55,
    c6: 50,
    c7: 45,
    c8: 42,
    c9: 40,
    c10: 38,
    incl: { g: true, tr: true, tk: false, w: true, m: true },
  };
  useStore.setState({ productPricing: [pricing] });
  const estimatedValue = sumSellForProducts(['AA-FLOW-01'], 2) * 2;
  lead = {
    ...lead,
    tour: 'North 7D outline',
    value: estimatedValue,
    needsTourDesign: false,
    stage: 'Designing',
    probability: 25,
  };

  assert.equal(lead.value, 300);
  assert.equal(getLeadWeightedValue(lead), 75);
});

test('Confirmed lead auto-creates booking via ensureBookingForConfirmedLead', () => {
  const confirmed: Lead = {
    id: 'LD-CONF',
    custId: 'CUS-99',
    tour: 'Confirmed tour',
    pax: 2,
    value: 5000,
    month: 'Nov 2026',
    stage: 'Confirmed',
    owner: 'Tai',
    probability: 90,
  };
  useStore.setState({ bookings: [], leads: [confirmed] });
  const created = ensureBookingForConfirmedLead(confirmed, useStore.getState().bookings);
  assert.ok(created);
  useStore.getState().addBooking(created!);
  assert.equal(useStore.getState().bookings.length, 1);
  assert.equal(useStore.getState().bookings[0].leadId, 'LD-CONF');

  const again = ensureBookingForConfirmedLead(confirmed, useStore.getState().bookings);
  assert.equal(again, null);
  assert.equal(useStore.getState().bookings.length, 1);
});
