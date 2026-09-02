import type { Agent, Comm, Customer, Lead } from '../types';
import { localTodayIso } from '../core/date-utils';
import { formatTravelMonth } from '../core/travel-month';
import { formatLeadTravelMonth } from '../sales/sales-lead-utils';
import { AGENT_DATALIST, customerToForm, type CustomerFormData, formToCustomer } from './customer-form';

/** Map free-text agent / datalist labels → agents.id */
const AGENT_ALIASES: Record<string, string[]> = {
  'AGT-002': ['ilv', 'charu'],
  'AGT-003': ['tnktj'],
  'AGT-004': ['abercrombie', 'abercrombie & kent', 'a&k'],
  'AGT-005': ['virtuoso'],
  'AGT-006': ['artisans of leisure', 'artisans'],
};

export type RegisterNewCustomerInput = {
  form: CustomerFormData;
  customers: Customer[];
  agents: Agent[];
  leads: Lead[];
  logInquiry?: boolean;
  createLead?: boolean;
  flagTourDesign?: boolean;
};

export type RegisterNewCustomerResult =
  | { ok: true; customer: Customer; lead?: Lead; comm?: Comm }
  | { ok: false; error: 'duplicate_email'; existing: Customer };

export function nextCustomerId(customers: Customer[], year = new Date().getFullYear()): string {
  const yy = String(year).slice(-2);
  const prefix = `CUS-${yy}-`;
  const nums = customers
    .filter((c) => c.id.startsWith(prefix))
    .map((c) => parseInt(c.id.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export function findDuplicateCustomerByEmail(
  customers: Customer[],
  email: string,
  excludeId?: string
): Customer | undefined {
  const norm = email.trim().toLowerCase();
  if (!norm) return undefined;
  return customers.find((c) => c.id !== excludeId && c.email.trim().toLowerCase() === norm);
}

export function formatDuplicateEmailMessage(existing: Customer): string {
  return `Email already registered to ${existing.name} (${existing.id}). Use a different email or edit the existing profile. / Email đã được dùng bởi ${existing.name} (${existing.id}).`;
}

export function isCustomerEmailAvailable(
  customers: Customer[],
  email: string,
  excludeId?: string
): boolean {
  return !findDuplicateCustomerByEmail(customers, email, excludeId);
}

export function resolveAgentId(agentName: string, agents: Agent[]): string | undefined {
  const q = agentName.trim().toLowerCase();
  if (!q) return undefined;

  const exact = agents.find((a) => a.name.toLowerCase() === q);
  if (exact) return exact.id;

  const partial = agents.find(
    (a) => q.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(q)
  );
  if (partial) return partial.id;

  for (const agent of agents) {
    const aliases = AGENT_ALIASES[agent.id] ?? [];
    if (aliases.some((alias) => q.includes(alias) || alias.includes(q))) return agent.id;
  }

  const datalistMatch = AGENT_DATALIST.find(
    (label) => label.toLowerCase() === q || q.includes(label.toLowerCase()) || label.toLowerCase().includes(q)
  );
  if (datalistMatch) {
    const fromLabel = agents.find(
      (a) =>
        datalistMatch.toLowerCase().includes(a.name.toLowerCase()) ||
        a.name.toLowerCase().includes(datalistMatch.toLowerCase())
    );
    if (fromLabel) return fromLabel.id;
  }

  return undefined;
}

export function nextLeadId(leads: Lead[]): string {
  let max = 0;
  for (const lead of leads) {
    const n = parseInt(lead.id.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `LD-${String(max + 1).padStart(3, '0')}`;
}

export function salesOwnerFromForm(form: CustomerFormData): string {
  if (!form.salesperson) return 'Tai';
  return form.salesperson.split(' ')[0] || 'Tai';
}

export function buildInquiryLead(
  customer: Customer,
  form: CustomerFormData,
  leadId: string,
  options?: { flagTourDesign?: boolean }
): Lead {
  const month = formatLeadTravelMonth(form.travelMonth);
  const tour = `${form.style || 'General'} inquiry — ${form.adults} pax`;
  const flagTourDesign = options?.flagTourDesign ?? false;

  return {
    id: leadId,
    custId: customer.id,
    tour,
    pax: Number(form.adults) || 2,
    value: 0,
    month,
    stage: 'Inquiry',
    owner: salesOwnerFromForm(form),
    nextAction: flagTourDesign
      ? 'Start tour design — Client Brief'
      : 'Contact client and gather trip requirements',
    probability: 10,
    clientType: form.clientType,
    agentId: customer.agentId,
    notes: `Auto-created on customer registration. Source: ${form.source}`,
    needsTourDesign: flagTourDesign,
    tourDesignAcked: false,
  };
}

export function buildInquiryComm(customer: Customer, form: CustomerFormData): Comm {
  const type = form.source === 'Website' ? 'Web Form' : 'Note';
  return {
    id: `CM-${Date.now()}`,
    cid: customer.id,
    date: localTodayIso(),
    type,
    dir: 'inbound',
    subj: `Initial inquiry — ${form.source}`,
    body: [
      'New client registered via CRM.',
      `Source: ${form.source}`,
      `Style: ${form.style}`,
      `Budget: ${form.budget}`,
      form.travelMonth ? `Travel month: ${formatTravelMonth(form.travelMonth)}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    author: customer.name,
  };
}

export function buildCustomerFromForm(
  form: CustomerFormData,
  customers: Customer[],
  agents: Agent[],
  options: { mode: 'add' | 'edit'; existingId?: string; existingBookings?: string[] }
): Customer {
  const agentId =
    form.clientType === 'b2b' && form.agentName.trim()
      ? resolveAgentId(form.agentName, agents)
      : undefined;

  const id =
    options.mode === 'edit' && options.existingId
      ? options.existingId
      : nextCustomerId(customers);

  const bookings = options.mode === 'edit' ? options.existingBookings ?? [] : [];

  return formToCustomer(form, id, bookings, agentId);
}

export function createInquiryLeadForCustomer(
  customer: Customer,
  leads: Lead[],
  options?: { flagTourDesign?: boolean }
): Lead {
  const form = customerToForm(customer);
  return buildInquiryLead(customer, form, nextLeadId(leads), options);
}

export function registerNewCustomer(input: RegisterNewCustomerInput): RegisterNewCustomerResult {
  const {
    form,
    customers,
    agents,
    leads,
    logInquiry = true,
    createLead = true,
    flagTourDesign = false,
  } = input;

  const duplicate = findDuplicateCustomerByEmail(customers, form.email);
  if (duplicate) {
    return { ok: false, error: 'duplicate_email', existing: duplicate };
  }

  const customer = buildCustomerFromForm(form, customers, agents, { mode: 'add' });

  let lead: Lead | undefined;
  if (createLead) {
    lead = buildInquiryLead(customer, form, nextLeadId(leads), { flagTourDesign });
  }

  let comm: Comm | undefined;
  if (logInquiry) {
    comm = buildInquiryComm(customer, form);
  }

  return { ok: true, customer, lead, comm };
}
