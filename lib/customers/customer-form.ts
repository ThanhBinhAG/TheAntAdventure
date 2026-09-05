import { normalizeMoneyUSD, parseMoneyInput } from '@/lib/core/money';
import type { Customer } from '../types';

export type CustomerFormData = {
  name: string;
  email: string;
  phone: string;
  country: string;
  nat: string;
  source: string;
  style: string;
  lang: string;
  notes: string;
  clientType: 'b2b' | 'b2c';
  agentName: string;
  salesperson: string;
  whatsapp: string;
  hotelTier: string;
  budget: string;
  /** Optional USD amount as typed string (empty = unset). */
  revenue: string;
  cost: string;
  /** Auto-derived from revenue − cost; empty when both unset. */
  profit: string;
  travelMonth: string;
  adults: string;
  firstTime: string;
  flights: string;
  intlFlights: string;
  visaStatus: string;
  interests: string;
  donts: string;
  numChildren: string;
  childAges: string;
  childDiet: string;
  childPrefs: string;
};

export const EMPTY_CUSTOMER_FORM: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  country: 'USA',
  nat: '',
  source: 'Direct',
  style: 'Luxury',
  lang: 'English',
  notes: '',
  clientType: 'b2c',
  agentName: '',
  salesperson: '',
  whatsapp: '',
  hotelTier: '',
  budget: '$2,000–$3,500/pax',
  revenue: '',
  cost: '',
  profit: '',
  travelMonth: '',
  adults: '2',
  firstTime: '',
  flights: 'yes',
  intlFlights: 'not-included',
  visaStatus: 'exempt',
  interests: '',
  donts: '',
  numChildren: '0',
  childAges: '',
  childDiet: '',
  childPrefs: '',
};

export const AGENT_DATALIST = [
  'Black Tomato',
  'About Asia Travel',
  'Pelorus',
  'Original Travel',
  'Virtuoso',
  'Abercrombie & Kent',
  'Artisans of Leisure',
  'Scott Dunn',
  'Audley Travel',
  'Cox & Kings',
  'Journeys Within',
  'Remote Lands',
  'Ker & Downey',
  'Kuoni',
];

export const SALES_PEOPLE = ['Tai Pham', 'Linh N.', 'Minh T.', 'Huong L.', 'Khoa V.'];

export const CUSTOMER_SOURCES = [
  'Referral',
  'Website',
  'Agent',
  'Virtuoso',
  'Abercrombie',
  'Social Media',
  'Walk-in',
  'Direct',
] as const;

export const CUSTOMER_LANGUAGES = ['English', 'French', 'German', 'Spanish', 'Italian'] as const;

export const CUSTOMER_BUDGET_RANGES = [
  'Under $1,000/pax',
  '$1,000–$2,000/pax',
  '$2,000–$3,500/pax',
  '$3,500–$6,000/pax',
  '$6,000+/pax',
] as const;

function moneyToFormField(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  return String(value);
}

/** Empty string → undefined; otherwise parsed USD (non-negative). */
export function parseOptionalFormMoney(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return parseMoneyInput(trimmed);
}

/** Recompute profit from revenue/cost; empty when both unset. */
export function withAutoProfit(form: CustomerFormData): CustomerFormData {
  const revRaw = form.revenue.trim();
  const costRaw = form.cost.trim();
  if (!revRaw && !costRaw) {
    return { ...form, profit: '' };
  }
  const revenue = parseMoneyInput(revRaw);
  const cost = parseMoneyInput(costRaw);
  const profit = normalizeMoneyUSD(revenue - cost, { allowNegative: true });
  return { ...form, profit: String(profit) };
}

/**
 * Active Value for Clients table: customer revenue when set, else lead pipeline value.
 */
export function customerListActiveValue(
  revenue: number | undefined | null,
  pipelineValue: number,
): number {
  if (revenue != null && revenue > 0) return revenue;
  return pipelineValue > 0 ? pipelineValue : 0;
}

export function customerToForm(c: Customer): CustomerFormData {
  return withAutoProfit({
    name: c.name,
    email: c.email,
    phone: c.phone || '',
    country: c.country || 'USA',
    nat: c.nat || '',
    source: c.source || 'Direct',
    style: c.style || 'Luxury',
    lang: c.lang || 'English',
    notes: c.notes || '',
    clientType: c.clientType || 'b2c',
    agentName: c.agentName || '',
    salesperson: c.salesperson || '',
    whatsapp: c.whatsapp || '',
    hotelTier: c.hotelTier || '',
    budget: c.budget || '$2,000–$3,500/pax',
    revenue: moneyToFormField(c.revenue),
    cost: moneyToFormField(c.cost),
    profit: moneyToFormField(c.profit),
    travelMonth: c.travelMonth || '',
    adults: String(c.adults ?? 2),
    firstTime: !c.firstTime || c.firstTime === 'unknown' ? '' : c.firstTime,
    flights: c.flights || 'yes',
    intlFlights: c.intlFlights || 'not-included',
    visaStatus: c.visaStatus || 'exempt',
    interests: c.interests || '',
    donts: c.donts || '',
    numChildren: String(c.children || 0),
    childAges: c.childAges || '',
    childDiet: c.childDiet || '',
    childPrefs: c.childPrefs || '',
  });
}

export function formToCustomer(
  form: CustomerFormData,
  id: string,
  bookings: string[] = [],
  agentId?: string
): Customer {
  const childNote =
    Number(form.numChildren) > 0 && !form.childAges && !form.childDiet && !form.childPrefs
      ? `\nChildren: ${form.numChildren}`
      : '';
  const notes = [form.notes, childNote].filter(Boolean).join('').trim();
  const synced = withAutoProfit(form);
  const revenue = parseOptionalFormMoney(synced.revenue);
  const cost = parseOptionalFormMoney(synced.cost);
  const profit =
    synced.profit.trim() === ''
      ? undefined
      : normalizeMoneyUSD(parseMoneyInput(synced.profit), { allowNegative: true });

  return {
    id,
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    country: form.country,
    nat: form.nat.trim() || form.country,
    source: form.source,
    style: form.style,
    lang: form.lang,
    notes,
    bookings,
    clientType: form.clientType,
    agentName: form.clientType === 'b2b' ? form.agentName.trim() : undefined,
    agentId: form.clientType === 'b2b' ? agentId : undefined,
    salesperson: form.salesperson || undefined,
    whatsapp: form.whatsapp.trim() || undefined,
    hotelTier: form.hotelTier,
    budget: form.budget,
    revenue,
    cost,
    profit,
    travelMonth: form.travelMonth || undefined,
    children: Number(form.numChildren) || 0,
    adults: Number(form.adults) || 2,
    firstTime: form.firstTime || undefined,
    intlFlights: form.intlFlights || undefined,
    childAges: form.childAges.trim() || undefined,
    childDiet: form.childDiet.trim() || undefined,
    childPrefs: form.childPrefs.trim() || undefined,
    flights: form.flights,
    visaStatus: form.visaStatus,
    interests: form.interests.trim() || undefined,
    donts: form.donts.trim() || undefined,
  };
}
