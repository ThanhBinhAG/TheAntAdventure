import type { Guide, StaffMember } from '../../types';
import { money, type Row } from './shared';

export function rowToGuide(r: Row): Guide {
  return {
    id: String(r.id),
    fullname: String(r.full_name ?? ''),
    ename: String(r.english_name ?? ''),
    region: String(r.region ?? ''),
    langs: String(r.languages ?? ''),
    specialty: String(r.specialty ?? ''),
    license: String(r.license_number ?? ''),
    rate: money(r.daily_rate),
    rating: String(r.rating ?? ''),
    status: String(r.status ?? ''),
    photo: String(r.photo_url ?? ''),
    years: Number(r.years_exp ?? 0),
    location: String(r.location ?? ''),
    phone: String(r.phone ?? ''),
    email: String(r.email ?? ''),
    shirtSize: String(r.shirt_size ?? ''),
    bankAccount: String(r.bank_account ?? ''),
    address: String(r.address ?? ''),
    bio: String(r.bio ?? ''),
    reviews: [],
  };
}

export function guideToRow(g: Guide): Row {
  return {
    id: g.id,
    full_name: g.fullname,
    english_name: g.ename,
    region: g.region,
    languages: g.langs,
    specialty: g.specialty,
    license_number: g.license,
    daily_rate: money(g.rate),
    rating: g.rating,
    status: g.status,
    photo_url: g.photo,
    years_exp: g.years,
    location: g.location,
    phone: g.phone,
    email: g.email,
    shirt_size: g.shirtSize,
    bank_account: g.bankAccount,
    address: g.address,
    bio: g.bio,
  };
}

export function rowToStaff(r: Row): StaffMember {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    ename: r.english_name ? String(r.english_name) : undefined,
    dept: String(r.department ?? ''),
    pos: String(r.position ?? ''),
    status: String(r.status ?? ''),
    email: r.email ? String(r.email) : undefined,
    phone: r.phone ? String(r.phone) : undefined,
  };
}

export function staffToRow(s: StaffMember): Row {
  return {
    id: s.id,
    name: s.name,
    english_name: s.ename ?? null,
    department: s.dept,
    position: s.pos,
    phone: s.phone ?? null,
    email: s.email ?? null,
    status: s.status,
  };
}

export function supplierToRow(r: Row): Row {
  return {
    id: r.id,
    category: r.cat ?? r.category,
    subcategory: r.subcat ?? r.subcategory ?? null,
    name: r.name,
    english_name: r.ename ?? r.english_name ?? null,
    contact_name: r.contact ?? r.contact_name ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    location: r.location ?? null,
    region: r.region ?? null,
    rate: r.rate ?? null,
    currency: r.currency ?? 'USD',
    payment_terms: r.payment ?? r.payment_terms ?? null,
    has_contract: r.contract === 'yes' || r.contract === true || r.has_contract === true,
    cancellation_policy: r.cancel ?? r.cancellation_policy ?? null,
    insurance_info: r.insurance ?? r.insurance_info ?? null,
    availability: r.avail ?? r.availability ?? null,
    description: r.desc ?? r.description ?? null,
    notes: r.notes ?? null,
    rating: r.rating ?? null,
    status: r.status ?? 'Active',
  };
}

export function rowToSupplier(r: Row, tags: string[] = []): Row {
  return {
    id: r.id,
    cat: r.category,
    subcat: r.subcategory,
    name: r.name,
    ename: r.english_name,
    contact: r.contact_name,
    phone: r.phone,
    email: r.email,
    location: r.location,
    region: r.region,
    rate: r.rate,
    currency: r.currency,
    payment: r.payment_terms,
    contract: r.has_contract ? 'yes' : 'no',
    cancel: r.cancellation_policy,
    insurance: r.insurance_info,
    avail: r.availability,
    desc: r.description,
    notes: r.notes,
    rating: r.rating,
    status: r.status,
    tags,
  };
}

export function staffToRowExtended(s: StaffMember & Row): Row {
  return {
    ...staffToRow(s),
    start_date: s.start ?? s.start_date ?? null,
    contract_type: s.contract ?? s.contract_type ?? 'Full-time',
    base_salary: s.baseSalary ?? s.base_salary ?? 0,
  };
}

export function rowToStaffExtended(r: Row): StaffMember & Row {
  const base = rowToStaff(r);
  return {
    ...base,
    start: r.start_date,
    contract: r.contract_type,
    baseSalary: r.base_salary,
  };
}
