import type { Customer } from './types';

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
  hotelTier: 'Boutique 4★',
  budget: '$2,000–$3,500/pax',
  travelMonth: '',
  adults: '2',
  firstTime: 'unknown',
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

export function customerToForm(c: Customer): CustomerFormData {
  return {
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
    hotelTier: c.hotelTier || 'Boutique 4★',
    budget: c.budget || '$2,000–$3,500/pax',
    travelMonth: c.travelMonth || '',
    adults: '2',
    firstTime: 'unknown',
    flights: c.flights || 'yes',
    intlFlights: 'not-included',
    visaStatus: c.visaStatus || 'exempt',
    interests: c.interests || '',
    donts: c.donts || '',
    numChildren: String(c.children || 0),
    childAges: '',
    childDiet: '',
    childPrefs: '',
  };
}

export function formToCustomer(form: CustomerFormData, id: string, bookings: string[] = []): Customer {
  const childNote =
    Number(form.numChildren) > 0
      ? `\nChildren: ${form.numChildren}${form.childAges ? ` (${form.childAges})` : ''}${form.childDiet ? ` · Diet: ${form.childDiet}` : ''}${form.childPrefs ? ` · Prefs: ${form.childPrefs}` : ''}`
      : '';
  const notes = [form.notes, childNote].filter(Boolean).join('').trim();

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
    salesperson: form.salesperson || undefined,
    whatsapp: form.whatsapp.trim() || undefined,
    hotelTier: form.hotelTier,
    budget: form.budget,
    travelMonth: form.travelMonth || undefined,
    children: Number(form.numChildren) || 0,
    flights: form.flights,
    visaStatus: form.visaStatus,
    interests: form.interests.trim() || undefined,
    donts: form.donts.trim() || undefined,
  };
}

export function nextCustomerId(customers: Customer[]): string {
  const nums = customers.map((c) => parseInt(c.id.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `CU-${String(next).padStart(3, '0')}`;
}
