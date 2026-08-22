import 'server-only';

import { STAGE_ORDER } from '@/lib/constants';
import {
  buildInquiryComm,
  buildInquiryLead,
  nextCustomerId,
  nextLeadId,
  resolveAgentId,
} from '@/lib/customers/customer-onboarding';
import type { CustomerFormData } from '@/lib/customers/customer-form';
import { formToCustomer } from '@/lib/customers/customer-form';
import {
  customerDeleteBlockedMessage,
  type CustomerDeleteBlockReason,
} from '@/lib/customers/customer-delete';
import type {
  CustomerCreateBody,
  CustomerListItem,
  CustomerListQuery,
  CustomerPageResponse,
  CustomerPatchBody,
} from '@/lib/customers/customer-list-input';
import {
  commToRow,
  customerToRow,
  leadToRow,
  rowToAgent,
  rowToCustomer,
  rowToLead,
} from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import type { Agent, Comm, Customer, Lead } from '@/lib/types';

export class CustomerRepositoryError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'config'
      | 'query'
      | 'not_found'
      | 'duplicate_email'
      | 'blocked'
      | 'conflict' = 'query',
    readonly existing?: Customer,
  ) {
    super(message);
    this.name = 'CustomerRepositoryError';
  }
}

type CustomerSupabaseClient = Awaited<
  ReturnType<typeof createCustomerServerClient>
>;

async function createCustomerServerClient() {
  try {
    return await getServerSupabaseClient();
  } catch (error) {
    throw new CustomerRepositoryError(
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

function pipelineFromLeads(leads: Lead[]): {
  stage: string | null;
  value: number;
  count: number;
} {
  const active = leads.filter((l) => l.stage !== 'Lost');
  if (!active.length) return { stage: null, value: 0, count: 0 };

  let bestStage: string | null = null;
  for (const s of STAGE_ORDER) {
    if (active.find((l) => l.stage === s)) {
      bestStage = s;
      break;
    }
  }

  const openLeads = active.filter((l) => l.stage !== 'Completed');
  const totalVal = openLeads.reduce((s, l) => s + (l.value || 0), 0);
  return { stage: bestStage, value: totalVal, count: active.length };
}

/** Average NPS scores already keyed by customer id (via bookings.cust_id). */
function avgNpsForCustomer(
  custId: string,
  npsByCust: Map<string, number[]>,
): number | null {
  const scores = npsByCust.get(custId);
  if (!scores?.length) return null;
  const sum = scores.reduce((s, n) => s + n, 0);
  return sum / scores.length;
}

/**
 * feedback has booking_id + client_name — no cust_id.
 * Join: feedback.booking_id → bookings.cust_id.
 */
async function loadNpsByCustomerId(
  supabase: CustomerSupabaseClient,
  customerIds: string[],
): Promise<Map<string, number[]>> {
  const npsByCust = new Map<string, number[]>();
  if (!customerIds.length) return npsByCust;

  const { data: bookings, error: bookingError } = await supabase
    .from('bookings')
    .select('id, cust_id')
    .in('cust_id', customerIds);

  if (bookingError) throw new CustomerRepositoryError(bookingError.message);

  const bookingToCust = new Map<string, string>();
  for (const row of bookings ?? []) {
    const bookingId = String(row.id ?? '');
    const custId = String(row.cust_id ?? '');
    if (bookingId && custId) bookingToCust.set(bookingId, custId);
  }

  const bookingIds = [...bookingToCust.keys()];
  if (!bookingIds.length) return npsByCust;

  const { data: feedback, error: feedbackError } = await supabase
    .from('feedback')
    .select('booking_id, nps')
    .in('booking_id', bookingIds)
    .not('nps', 'is', null);

  if (feedbackError) throw new CustomerRepositoryError(feedbackError.message);

  for (const row of feedback ?? []) {
    const custId = bookingToCust.get(String(row.booking_id ?? ''));
    if (!custId || row.nps == null) continue;
    const list = npsByCust.get(custId) ?? [];
    list.push(Number(row.nps));
    npsByCust.set(custId, list);
  }

  return npsByCust;
}

async function loadAgentsMap(
  supabase: CustomerSupabaseClient,
  agentIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(agentIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (!unique.length) return map;

  const { data, error } = await supabase
    .from('agents')
    .select('id, name')
    .in('id', unique);

  if (error) throw new CustomerRepositoryError(error.message);
  for (const row of data ?? []) {
    map.set(String(row.id), String(row.name ?? ''));
  }
  return map;
}

async function resolveStageCustomerIds(
  supabase: CustomerSupabaseClient,
  stage: string,
): Promise<string[] | null> {
  if (stage === 'none') {
    const { data: allCustomers, error: custErr } = await supabase
      .from('customers')
      .select('id');
    if (custErr) throw new CustomerRepositoryError(custErr.message);

    const { data: activeLeads, error: leadErr } = await supabase
      .from('leads')
      .select('cust_id')
      .neq('stage', 'Lost');
    if (leadErr) throw new CustomerRepositoryError(leadErr.message);

    const withActivity = new Set(
      (activeLeads ?? []).map((r) => String(r.cust_id ?? '')).filter(Boolean),
    );
    return (allCustomers ?? [])
      .map((r) => String(r.id))
      .filter((id) => !withActivity.has(id));
  }

  const { data, error } = await supabase
    .from('leads')
    .select('cust_id')
    .eq('stage', stage)
    .neq('stage', 'Lost');
  if (error) throw new CustomerRepositoryError(error.message);

  return [
    ...new Set(
      (data ?? []).map((r) => String(r.cust_id ?? '')).filter(Boolean),
    ),
  ];
}

async function resolveSearchAgentIds(
  supabase: CustomerSupabaseClient,
  q: string,
): Promise<string[]> {
  const pattern = `%${escapeIlike(q)}%`;
  const { data, error } = await supabase
    .from('agents')
    .select('id')
    .ilike('name', pattern);
  if (error) throw new CustomerRepositoryError(error.message);
  return (data ?? []).map((r) => String(r.id));
}

export async function listCustomersPage(
  input: CustomerListQuery,
): Promise<CustomerPageResponse> {
  const supabase = await createCustomerServerClient();

  let stageIds: string[] | null = null;
  if (input.stage) {
    stageIds = await resolveStageCustomerIds(supabase, input.stage);
    if (stageIds.length === 0) {
      return {
        items: [],
        page: input.page,
        pageSize: input.pageSize,
        totalCount: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      };
    }
  }

  let query = supabase.from('customers').select('*', { count: 'exact' });

  if (stageIds) {
    query = query.in('id', stageIds);
  }
  if (input.source) query = query.eq('source', input.source);
  if (input.country) query = query.eq('country', input.country);
  if (input.salesperson) query = query.eq('salesperson', input.salesperson);
  if (input.clientType) query = query.eq('client_type', input.clientType);
  if (input.agentId) query = query.eq('agent_id', input.agentId);

  if (input.q) {
    const safeQ = input.q.replace(/[,()]/g, ' ').trim();
    if (safeQ) {
      const pattern = `%${escapeIlike(safeQ)}%`;
      const agentIds = await resolveSearchAgentIds(supabase, safeQ);
      const orParts = [
        `name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
        `phone.ilike.${pattern}`,
        `whatsapp.ilike.${pattern}`,
        `id.ilike.${pattern}`,
      ];
      if (agentIds.length) {
        orParts.push(`agent_id.in.(${agentIds.join(',')})`);
      }
      query = query.or(orParts.join(','));
    }
  }

  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;

  const { data, error, count } = await query
    .order('id', { ascending: true })
    .range(from, to);

  if (error) throw new CustomerRepositoryError(error.message);

  const rows = (data ?? []) as Row[];
  const totalCount = count ?? 0;
  const totalPages =
    totalCount === 0 ? 0 : Math.ceil(totalCount / input.pageSize);
  const customers = rows.map(rowToCustomer);
  const ids = customers.map((c) => c.id);

  const agentNames = await loadAgentsMap(
    supabase,
    customers.map((c) => c.agentId ?? ''),
  );

  let leadsByCust = new Map<string, Lead[]>();
  let npsByCust = new Map<string, number[]>();

  if (ids.length) {
    const [leadsRes, npsMap] = await Promise.all([
      supabase.from('leads').select('*').in('cust_id', ids),
      loadNpsByCustomerId(supabase, ids),
    ]);
    if (leadsRes.error) throw new CustomerRepositoryError(leadsRes.error.message);

    leadsByCust = new Map();
    for (const row of (leadsRes.data ?? []) as Row[]) {
      const lead = rowToLead(row);
      const list = leadsByCust.get(lead.custId) ?? [];
      list.push(lead);
      leadsByCust.set(lead.custId, list);
    }
    npsByCust = npsMap;
  }

  const items: CustomerListItem[] = customers.map((customer) => {
    const pipe = pipelineFromLeads(leadsByCust.get(customer.id) ?? []);
    return {
      ...customer,
      agentName: customer.agentId
        ? agentNames.get(customer.agentId) ?? customer.agentName
        : customer.agentName,
      pipelineStage: pipe.stage,
      pipelineValue: pipe.value,
      pipelineLeadCount: pipe.count,
      avgNps: avgNpsForCustomer(customer.id, npsByCust),
    };
  });

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

export async function getCustomerById(id: string): Promise<Customer> {
  const supabase = await createCustomerServerClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new CustomerRepositoryError(error.message);
  if (!data) {
    throw new CustomerRepositoryError('Không tìm thấy khách hàng.', 'not_found');
  }

  const customer = rowToCustomer(data as Row);
  if (customer.agentId) {
    const names = await loadAgentsMap(supabase, [customer.agentId]);
    customer.agentName = names.get(customer.agentId) ?? customer.agentName;
  }
  return customer;
}

async function fetchAllCustomers(supabase: CustomerSupabaseClient): Promise<Customer[]> {
  const { data, error } = await supabase.from('customers').select('*');
  if (error) throw new CustomerRepositoryError(error.message);
  return ((data ?? []) as Row[]).map(rowToCustomer);
}

async function fetchAllAgents(supabase: CustomerSupabaseClient): Promise<Agent[]> {
  const { data, error } = await supabase.from('agents').select('*');
  if (error) throw new CustomerRepositoryError(error.message);
  return ((data ?? []) as Row[]).map(rowToAgent);
}

async function fetchAllLeads(supabase: CustomerSupabaseClient): Promise<Lead[]> {
  const { data, error } = await supabase.from('leads').select('id, cust_id');
  if (error) throw new CustomerRepositoryError(error.message);
  return ((data ?? []) as Row[]).map(rowToLead);
}

async function findDuplicateEmail(
  supabase: CustomerSupabaseClient,
  email: string,
  excludeId?: string,
): Promise<Customer | null> {
  const norm = email.trim().toLowerCase();
  if (!norm) return null;

  let query = supabase.from('customers').select('*').ilike('email', norm);
  if (excludeId) query = query.neq('id', excludeId);

  const { data, error } = await query.limit(5);
  if (error) throw new CustomerRepositoryError(error.message);

  return (
    ((data ?? []) as Row[])
      .map(rowToCustomer)
      .find((c) => c.email.trim().toLowerCase() === norm) ?? null
  );
}

export type CreateCustomerResult = {
  customer: Customer;
  lead?: Lead;
  comm?: Comm;
};

export async function createCustomer(
  body: CustomerCreateBody,
): Promise<CreateCustomerResult> {
  const supabase = await createCustomerServerClient();
  const form = body.form as CustomerFormData;

  const duplicate = await findDuplicateEmail(supabase, form.email);
  if (duplicate) {
    throw new CustomerRepositoryError(
      `Email already registered to ${duplicate.name} (${duplicate.id}).`,
      'duplicate_email',
      duplicate,
    );
  }

  const [customers, agents, leads] = await Promise.all([
    fetchAllCustomers(supabase),
    fetchAllAgents(supabase),
    fetchAllLeads(supabase),
  ]);

  const agentId =
    form.clientType === 'b2b' && form.agentName.trim()
      ? resolveAgentId(form.agentName, agents)
      : undefined;

  const id = nextCustomerId(customers);
  const customer = formToCustomer(form, id, [], agentId);

  const { error: insertError } = await supabase
    .from('customers')
    .insert(customerToRow(customer));

  if (insertError) {
    throw new CustomerRepositoryError(insertError.message);
  }

  let lead: Lead | undefined;
  let comm: Comm | undefined;

  try {
    if (body.createLead) {
      lead = buildInquiryLead(customer, form, nextLeadId(leads), {
        flagTourDesign: body.flagTourDesign,
      });
      const { error: leadError } = await supabase
        .from('leads')
        .insert(leadToRow(lead));
      if (leadError) throw new CustomerRepositoryError(leadError.message);
    }

    if (body.logInquiry) {
      comm = buildInquiryComm(customer, form);
      const { error: commError } = await supabase
        .from('comms')
        .insert(commToRow(comm));
      if (commError) throw new CustomerRepositoryError(commError.message);
    }
  } catch (err) {
    await supabase.from('customers').delete().eq('id', customer.id);
    if (lead) await supabase.from('leads').delete().eq('id', lead.id);
    throw err;
  }

  if (customer.agentId) {
    const names = await loadAgentsMap(supabase, [customer.agentId]);
    customer.agentName =
      names.get(customer.agentId) ?? customer.agentName ?? form.agentName;
  }

  return { customer, lead, comm };
}

export async function updateCustomer(
  id: string,
  body: CustomerPatchBody,
): Promise<Customer> {
  const supabase = await createCustomerServerClient();
  const existing = await getCustomerById(id);

  if (body.form) {
    const form = body.form as CustomerFormData;
    const duplicate = await findDuplicateEmail(supabase, form.email, id);
    if (duplicate) {
      throw new CustomerRepositoryError(
        `Email already registered to ${duplicate.name} (${duplicate.id}).`,
        'duplicate_email',
        duplicate,
      );
    }

    const agents = await fetchAllAgents(supabase);
    const agentId =
      form.clientType === 'b2b' && form.agentName.trim()
        ? resolveAgentId(form.agentName, agents)
        : undefined;

    const updated = formToCustomer(form, id, existing.bookings, agentId);
    const { error } = await supabase
      .from('customers')
      .update(customerToRow(updated))
      .eq('id', id);
    if (error) throw new CustomerRepositoryError(error.message);

    if (updated.agentId) {
      const names = await loadAgentsMap(supabase, [updated.agentId]);
      updated.agentName =
        names.get(updated.agentId) ?? updated.agentName ?? form.agentName;
    }
    return updated;
  }

  if (body.notes !== undefined) {
    const { error } = await supabase
      .from('customers')
      .update({ notes: body.notes })
      .eq('id', id);
    if (error) throw new CustomerRepositoryError(error.message);
    return { ...existing, notes: body.notes };
  }

  throw new CustomerRepositoryError('Không có trường nào để cập nhật.', 'conflict');
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = await createCustomerServerClient();

  const { data: customerRow, error: fetchError } = await supabase
    .from('customers')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw new CustomerRepositoryError(fetchError.message);
  if (!customerRow) {
    throw new CustomerRepositoryError('Không tìm thấy khách hàng.', 'not_found');
  }

  const { data: bookings, error: bookingError } = await supabase
    .from('bookings')
    .select('id')
    .eq('cust_id', id)
    .limit(1);

  if (bookingError) throw new CustomerRepositoryError(bookingError.message);
  if (bookings && bookings.length > 0) {
    const reason: CustomerDeleteBlockReason = 'has_bookings';
    throw new CustomerRepositoryError(
      customerDeleteBlockedMessage(reason),
      'blocked',
    );
  }

  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw new CustomerRepositoryError(error.message);
}
