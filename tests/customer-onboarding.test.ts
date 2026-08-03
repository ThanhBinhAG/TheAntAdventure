import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_CUSTOMER_FORM } from '../lib/customers/customer-form';
import {
  buildCustomerFromForm,
  buildInquiryComm,
  buildInquiryLead,
  createInquiryLeadForCustomer,
  findDuplicateCustomerByEmail,
  formatDuplicateEmailMessage,
  isCustomerEmailAvailable,
  nextCustomerId,
  nextLeadId,
  registerNewCustomer,
  resolveAgentId,
  salesOwnerFromForm,
} from '../lib/customers/customer-onboarding';
import type { Agent, Customer, Lead } from '../lib/types';

const sampleAgents: Agent[] = [
  {
    id: 'AGT-002',
    name: 'ILV',
    country: 'Belgium',
    tier: 'Silver',
    commissionPct: 12,
    contactName: 'Charu',
    email: 'charu@ilv.be',
    phone: '',
    currency: 'EUR',
    status: 'Active',
    notes: '',
  },
  {
    id: 'AGT-004',
    name: 'Abercrombie & Kent',
    country: 'USA',
    tier: 'Platinum',
    commissionPct: 20,
    contactName: '',
    email: '',
    phone: '',
    currency: 'USD',
    status: 'Active',
    notes: '',
  },
  {
    id: 'AGT-005',
    name: 'Virtuoso',
    country: 'USA',
    tier: 'Gold',
    commissionPct: 15,
    contactName: '',
    email: '',
    phone: '',
    currency: 'USD',
    status: 'Active',
    notes: '',
  },
];

const seedCustomers: Customer[] = [
  {
    id: 'CUS-26-001',
    name: 'James Miller',
    email: 'j.miller@gmail.com',
    phone: '',
    country: 'USA',
    nat: 'American',
    source: 'Referral',
    style: 'Luxury',
    lang: 'English',
    notes: '',
    bookings: [],
  },
  {
    id: 'CUS-26-026',
    name: 'Mrs. Thu',
    email: 'thu@example.com',
    phone: '',
    country: 'Australia',
    nat: 'Australian',
    source: 'Direct',
    style: 'Luxury',
    lang: 'English',
    notes: '',
    bookings: [],
  },
];

const seedLeads: Lead[] = [
  { id: 'LD-004', custId: 'CUS-26-002', tour: 'Test', pax: 1, value: 100, month: 'Jun 2026', stage: 'Inquiry', owner: 'Tai' },
  { id: 'LD-T23', custId: 'CUS-26-024', tour: 'Test', pax: 1, value: 100, month: 'Sep 2026', stage: 'Inquiry', owner: 'Tai' },
];

describe('nextCustomerId', () => {
  it('returns CUS-YY-NNN with next sequence for current year', () => {
    const year = 2026;
    const id = nextCustomerId(seedCustomers, year);
    assert.equal(id, 'CUS-26-027');
  });

  it('starts at 001 when no customers for year', () => {
    const id = nextCustomerId([], 2026);
    assert.equal(id, 'CUS-26-001');
  });
});

describe('findDuplicateCustomerByEmail', () => {
  it('finds duplicate case-insensitively', () => {
    const dup = findDuplicateCustomerByEmail(seedCustomers, 'J.MILLER@Gmail.com');
    assert.equal(dup?.id, 'CUS-26-001');
  });

  it('excludes current customer when editing', () => {
    const dup = findDuplicateCustomerByEmail(seedCustomers, 'j.miller@gmail.com', 'CUS-26-001');
    assert.equal(dup, undefined);
  });
});

describe('isCustomerEmailAvailable', () => {
  it('returns false when email is taken', () => {
    assert.equal(isCustomerEmailAvailable(seedCustomers, 'thu@example.com'), false);
  });

  it('returns true for new email', () => {
    assert.equal(isCustomerEmailAvailable(seedCustomers, 'brand.new@example.com'), true);
  });
});

describe('formatDuplicateEmailMessage', () => {
  it('includes existing customer name and id', () => {
    const msg = formatDuplicateEmailMessage(seedCustomers[0]);
    assert.match(msg, /James Miller/);
    assert.match(msg, /CUS-26-001/);
  });
});

describe('resolveAgentId', () => {
  it('matches exact agent name', () => {
    assert.equal(resolveAgentId('ILV', sampleAgents), 'AGT-002');
  });

  it('matches datalist label to agent', () => {
    assert.equal(resolveAgentId('Virtuoso', sampleAgents), 'AGT-005');
  });

  it('matches partial alias Abercrombie', () => {
    assert.equal(resolveAgentId('Abercrombie & Kent', sampleAgents), 'AGT-004');
  });

  it('returns undefined for unknown agent', () => {
    assert.equal(resolveAgentId('Unknown Agency', sampleAgents), undefined);
  });
});

describe('buildCustomerFromForm', () => {
  it('sets agentId for B2B clients', () => {
    const form = {
      ...EMPTY_CUSTOMER_FORM,
      name: 'Charu Group',
      email: 'charu@ilv.be',
      clientType: 'b2b' as const,
      agentName: 'ILV',
      salesperson: 'Tai Pham',
    };
    const customer = buildCustomerFromForm(form, seedCustomers, sampleAgents, { mode: 'add' });
    assert.equal(customer.agentId, 'AGT-002');
    assert.equal(customer.agentName, 'ILV');
    assert.match(customer.id, /^CUS-26-/);
  });
});

describe('registerNewCustomer', () => {
  it('creates customer, inquiry lead, and comm by default', () => {
    const form = {
      ...EMPTY_CUSTOMER_FORM,
      name: 'New Traveler',
      email: 'new.traveler@example.com',
      source: 'Website',
      travelMonth: 'Oct',
      salesperson: 'Linh N.',
    };

    const result = registerNewCustomer({
      form,
      customers: seedCustomers,
      agents: sampleAgents,
      leads: seedLeads,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.customer.email, 'new.traveler@example.com');
    assert.equal(result.lead?.stage, 'Inquiry');
    assert.equal(result.lead?.custId, result.customer.id);
    assert.equal(result.lead?.owner, 'Linh');
    assert.equal(result.comm?.dir, 'inbound');
    assert.equal(result.comm?.cid, result.customer.id);
  });

  it('flags tour design when requested from Sales Pipeline', () => {
    const form = {
      ...EMPTY_CUSTOMER_FORM,
      name: 'Pipeline Client',
      email: 'pipeline@example.com',
    };

    const result = registerNewCustomer({
      form,
      customers: seedCustomers,
      agents: sampleAgents,
      leads: seedLeads,
      flagTourDesign: true,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.lead?.needsTourDesign, true);
    assert.equal(result.lead?.tourDesignAcked, false);
    assert.match(result.lead?.nextAction ?? '', /tour design/i);
  });

  it('createInquiryLeadForCustomer builds inquiry for existing client', () => {
    const customer = seedCustomers[0];
    const lead = createInquiryLeadForCustomer(customer, seedLeads);
    assert.equal(lead.custId, customer.id);
    assert.equal(lead.stage, 'Inquiry');
    assert.equal(lead.id, nextLeadId(seedLeads));
    assert.match(lead.notes ?? '', /Auto-created on customer registration/);
  });

  it('createInquiryLeadForCustomer supports tour design flag', () => {
    const customer = seedCustomers[0];
    const lead = createInquiryLeadForCustomer(customer, seedLeads, { flagTourDesign: true });
    assert.equal(lead.needsTourDesign, true);
    assert.match(lead.nextAction ?? '', /tour design/i);
  });

  it('rejects duplicate email', () => {
    const form = {
      ...EMPTY_CUSTOMER_FORM,
      name: 'Copy',
      email: 'thu@example.com',
    };

    const result = registerNewCustomer({
      form,
      customers: seedCustomers,
      agents: sampleAgents,
      leads: seedLeads,
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, 'duplicate_email');
    assert.equal(result.existing.id, 'CUS-26-026');
  });

  it('skips comm when logInquiry is false', () => {
    const form = {
      ...EMPTY_CUSTOMER_FORM,
      name: 'Quiet Client',
      email: 'quiet@example.com',
    };

    const result = registerNewCustomer({
      form,
      customers: seedCustomers,
      agents: sampleAgents,
      leads: seedLeads,
      logInquiry: false,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.lead?.stage, 'Inquiry');
    assert.equal(result.comm, undefined);
  });
});

describe('nextLeadId', () => {
  it('increments beyond highest numeric suffix', () => {
    assert.equal(nextLeadId(seedLeads), 'LD-024');
  });
});

describe('salesOwnerFromForm', () => {
  it('uses first name of salesperson', () => {
    assert.equal(salesOwnerFromForm({ ...EMPTY_CUSTOMER_FORM, salesperson: 'Tai Pham' }), 'Tai');
  });

  it('defaults to Tai when empty', () => {
    assert.equal(salesOwnerFromForm(EMPTY_CUSTOMER_FORM), 'Tai');
  });
});

describe('buildInquiryComm', () => {
  it('uses Web Form type for website source', () => {
    const customer: Customer = {
      ...seedCustomers[0],
      id: 'CUS-26-099',
      name: 'Web Lead',
      email: 'web@example.com',
    };
    const comm = buildInquiryComm(customer, { ...EMPTY_CUSTOMER_FORM, source: 'Website' });
    assert.equal(comm.type, 'Web Form');
    assert.match(comm.subj, /Website/);
  });
});

describe('buildInquiryLead', () => {
  it('builds tour title from style and pax', () => {
    const customer: Customer = {
      ...seedCustomers[0],
      id: 'CUS-26-099',
    };
    const lead = buildInquiryLead(
      customer,
      { ...EMPTY_CUSTOMER_FORM, style: 'Adventure', adults: '4', travelMonth: 'Nov' },
      'LD-999'
    );
    assert.equal(lead.tour, 'Adventure inquiry — 4 pax');
    assert.equal(lead.month, `Nov ${new Date().getFullYear()}`);
  });
});
