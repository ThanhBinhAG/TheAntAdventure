import type { Booking, Customer, Lead } from '../types';
import { STAGE_ORDER } from '../constants';

export interface GetClientLeadsOptions {
  includeLost?: boolean;
}

function stageSortIndex(stage: string): number {
  const idx = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
  return idx === -1 ? STAGE_ORDER.length : idx;
}

export function getClientLeads(
  custId: string,
  leads: Lead[],
  options: GetClientLeadsOptions = {}
): Lead[] {
  const { includeLost = false } = options;
  return leads
    .filter((l) => l.custId === custId && (includeLost || l.stage !== 'Lost'))
    .sort((a, b) => {
      const stageDiff = stageSortIndex(a.stage) - stageSortIndex(b.stage);
      if (stageDiff !== 0) return stageDiff;
      return a.id.localeCompare(b.id);
    });
}

/** Prefer bookings.cust_id; also include legacy customer.bookings[] IDs. */
export function getCustomerBookings(
  customer: Pick<Customer, 'id' | 'bookings'>,
  bookings: Booking[]
): Booking[] {
  const byCust = bookings.filter((b) => b.custId === customer.id);
  const seen = new Set(byCust.map((b) => b.id));
  const legacyIds = customer.bookings ?? [];
  const legacy = legacyIds
    .map((id) => bookings.find((b) => b.id === id))
    .filter((b): b is Booking => b != null && !seen.has(b.id));
  return [...byCust, ...legacy];
}

export function customerMatchesSearch(customer: Customer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    customer.name,
    customer.email,
    customer.phone,
    customer.whatsapp,
    customer.id,
    customer.agentName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function getClientPipeline(custId: string, leads: Lead[]) {
  const allLeads = leads.filter((l) => l.custId === custId);
  const active = allLeads.filter((l) => l.stage !== 'Lost');
  if (!active.length) return { stage: null as string | null, value: 0, count: 0 };

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

export function getCustomerName(customers: Customer[], custId: string): string {
  return customers.find((c) => c.id === custId)?.name || custId;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function strColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hues = ['#2E7D52', '#1565C0', '#6B21A8', '#C9A84C', '#C0392B', '#D97706'];
  return hues[Math.abs(hash) % hues.length];
}
