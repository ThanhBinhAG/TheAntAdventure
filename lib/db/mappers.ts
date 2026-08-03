import type {
  Agent,
  Booking,
  BookingActivity,
  BookingItineraryDay,
  ChatMessage,
  ChatMessages,
  Comm,
  Customer,
  Guide,
  Lead,
  Product,
  ProductPricing,
  StaffMember,
  TourDraft,
  TourOutlineDay,
} from '../types';
import { normalizeMoneyUSD } from '../core/money';
import { getExperienceOverridesFromBriefJson } from '../tour-design/tour-draft-utils';

type Row = Record<string, unknown>;

const money = (v: unknown) => normalizeMoneyUSD(Number(v ?? 0));
const moneyAbs = (v: unknown) => normalizeMoneyUSD(Number(v ?? 0), { absolute: true });

/** Empty string → null for optional FK columns (Postgres rejects '' as FK). */
export function fkOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

export function rowToCustomer(r: Row): Customer {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    email: String(r.email ?? ''),
    phone: String(r.phone ?? ''),
    country: String(r.country ?? ''),
    nat: String(r.nationality ?? ''),
    source: String(r.source ?? ''),
    style: String(r.travel_style ?? ''),
    lang: String(r.language ?? ''),
    notes: String(r.notes ?? ''),
    bookings: [],
    clientType: (r.client_type as Customer['clientType']) ?? undefined,
    agentId: r.agent_id ? String(r.agent_id) : undefined,
    salesperson: r.salesperson ? String(r.salesperson) : undefined,
    whatsapp: r.whatsapp ? String(r.whatsapp) : undefined,
    hotelTier: r.hotel_tier ? String(r.hotel_tier) : undefined,
    budget: r.budget ? String(r.budget) : undefined,
    travelMonth: r.travel_month ? String(r.travel_month) : undefined,
    children: r.children != null ? Number(r.children) : undefined,
    adults: r.adults != null ? Number(r.adults) : undefined,
    firstTime: r.first_time ? String(r.first_time) : undefined,
    intlFlights: r.intl_flights ? String(r.intl_flights) : undefined,
    childAges: r.child_ages ? String(r.child_ages) : undefined,
    childDiet: r.child_diet ? String(r.child_diet) : undefined,
    childPrefs: r.child_prefs ? String(r.child_prefs) : undefined,
    flights: r.flights ? String(r.flights) : undefined,
    visaStatus: r.visa_status ? String(r.visa_status) : undefined,
    interests: r.interests ? String(r.interests) : undefined,
    donts: r.donts ? String(r.donts) : undefined,
  };
}

export function customerToRow(c: Customer): Row {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    whatsapp: c.whatsapp ?? null,
    country: c.country,
    nationality: c.nat,
    source: c.source,
    travel_style: c.style,
    language: c.lang,
    client_type: c.clientType ?? 'b2c',
    agent_id: c.agentId ?? null,
    salesperson: c.salesperson ?? null,
    hotel_tier: c.hotelTier ?? null,
    budget: c.budget ?? null,
    travel_month: c.travelMonth ?? null,
    children: c.children ?? 0,
    adults: c.adults ?? 2,
    first_time: c.firstTime ?? null,
    intl_flights: c.intlFlights ?? null,
    child_ages: c.childAges ?? null,
    child_diet: c.childDiet ?? null,
    child_prefs: c.childPrefs ?? null,
    flights: c.flights ?? null,
    visa_status: c.visaStatus ?? null,
    interests: c.interests ?? null,
    donts: c.donts ?? null,
    notes: c.notes,
  };
}

export function rowToAgent(r: Row): Agent {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    country: String(r.country ?? ''),
    tier: String(r.tier ?? ''),
    commissionPct: Number(r.commission_pct ?? 0),
    contactName: String(r.contact_name ?? ''),
    email: String(r.email ?? ''),
    phone: String(r.phone ?? ''),
    currency: String(r.currency ?? 'USD'),
    status: String(r.status ?? 'Active'),
    notes: String(r.notes ?? ''),
  };
}

export function agentToRow(a: Agent): Row {
  return {
    id: a.id,
    name: a.name,
    country: a.country,
    tier: a.tier,
    commission_pct: a.commissionPct,
    contact_name: a.contactName,
    email: a.email,
    phone: a.phone,
    currency: a.currency,
    status: a.status,
    notes: a.notes,
  };
}

export function rowToAttraction(r: Row): Row {
  return {
    id: String(r.id),
    region: String(r.region ?? 'north'),
    type: String(r.type ?? ''),
    name: String(r.name ?? ''),
    dest: String(r.dest ?? ''),
    hours: String(r.hours ?? ''),
    closed: String(r.closed ?? ''),
    admission: String(r.admission ?? ''),
    duration: Number(r.duration ?? 0),
    best_time: String(r.best_time ?? ''),
    crowd: String(r.crowd ?? ''),
    book_req: Boolean(r.book_req),
    seasonal: String(r.seasonal ?? ''),
    notes: String(r.notes ?? ''),
    alert: String(r.alert ?? ''),
    phone: String(r.phone ?? ''),
    photoIds: [],
    linkedPhotoIds: [],
  };
}

export function attractionToRow(a: Row): Row {
  return {
    id: a.id,
    region: a.region,
    type: a.type,
    name: a.name,
    dest: a.dest,
    hours: a.hours ?? null,
    closed: a.closed ?? null,
    admission: a.admission ?? null,
    duration: a.duration ?? 0,
    best_time: a.best_time ?? null,
    crowd: a.crowd ?? null,
    book_req: Boolean(a.book_req),
    seasonal: a.seasonal ?? null,
    notes: a.notes ?? null,
    alert: a.alert ?? null,
    phone: a.phone ?? '',
  };
}

export function assembleAttractions(baseRows: Row[], linkRows: Row[]): Row[] {
  const photosByAttraction = new Map<
    string,
    { photoId: string; sortOrder: number; isFeatured: boolean }[]
  >();
  for (const link of linkRows) {
    const attId = String(link.attraction_id);
    if (!photosByAttraction.has(attId)) photosByAttraction.set(attId, []);
    photosByAttraction.get(attId)!.push({
      photoId: String(link.photo_id),
      sortOrder: Number(link.sort_order ?? 0),
      isFeatured: Boolean(link.is_featured),
    });
  }

  return baseRows.map((r) => {
    const base = rowToAttraction(r);
    const links = photosByAttraction.get(String(base.id)) ?? [];
    links.sort((a, b) => a.sortOrder - b.sortOrder);
    const linkedPhotoIds = links.map((l) => l.photoId);
    const featuredLinks = links.filter((l) => l.isFeatured);
    const photoIds =
      featuredLinks.length > 0
        ? featuredLinks.map((l) => l.photoId).slice(0, 4)
        : linkedPhotoIds.slice(0, 4);
    return { ...base, linkedPhotoIds, photoIds };
  });
}

/** Build junction rows for Supabase sync from an attraction's pool + featured sets. */
export function attractionPhotoRows(attraction: {
  id: string;
  photoIds?: string[];
  linkedPhotoIds?: string[];
}): Row[] {
  const linked =
    attraction.linkedPhotoIds?.length
      ? attraction.linkedPhotoIds
      : (attraction.photoIds ?? []);
  const featured = (attraction.photoIds ?? []).filter((id) => linked.includes(id)).slice(0, 4);
  const featuredSet = new Set(featured);
  const poolOnly = linked.filter((id) => !featuredSet.has(id));

  return [
    ...featured.map((photoId, i) => ({
      attraction_id: attraction.id,
      photo_id: photoId,
      sort_order: i,
      is_featured: true,
    })),
    ...poolOnly.map((photoId, i) => ({
      attraction_id: attraction.id,
      photo_id: photoId,
      sort_order: featured.length + i,
      is_featured: false,
    })),
  ];
}

export function rowToLead(r: Row): Lead {
  return {
    id: String(r.id),
    custId: String(r.cust_id ?? ''),
    tour: String(r.tour ?? ''),
    pax: r.pax != null ? Number(r.pax) : 1,
    value: money(r.value),
    month: String(r.month ?? ''),
    stage: String(r.stage ?? 'Inquiry'),
    owner: String(r.owner ?? ''),
    followUpDate: r.follow_up_date ? String(r.follow_up_date) : undefined,
    nextAction: r.next_action ? String(r.next_action) : undefined,
    probability: r.probability != null ? Number(r.probability) : undefined,
    clientType: r.client_type ? String(r.client_type) : undefined,
    currency: r.currency ? String(r.currency) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    needsTourDesign: r.needs_tour_design != null ? Boolean(r.needs_tour_design) : undefined,
    tourDesignAcked: r.tour_design_acked != null ? Boolean(r.tour_design_acked) : undefined,
  };
}

export function leadToRow(l: Lead): Row {
  return {
    id: l.id,
    cust_id: l.custId,
    tour: l.tour,
    pax: l.pax,
    value: money(l.value),
    currency: l.currency ?? 'USD',
    month: l.month,
    stage: l.stage,
    owner: l.owner,
    follow_up_date: l.followUpDate ?? null,
    next_action: l.nextAction ?? null,
    probability: l.probability ?? null,
    client_type: l.clientType ?? null,
    notes: l.notes ?? null,
    needs_tour_design: l.needsTourDesign ?? false,
    tour_design_acked: l.tourDesignAcked ?? false,
  };
}

export function assembleBookings(
  bookingRows: Row[],
  itineraryRows: Row[],
  activityRows: Row[]
): Booking[] {
  const itinByBooking = new Map<string, Row[]>();
  for (const it of itineraryRows) {
    const bid = String(it.booking_id);
    if (!itinByBooking.has(bid)) itinByBooking.set(bid, []);
    itinByBooking.get(bid)!.push(it);
  }

  const actByItin = new Map<string, BookingActivity[]>();
  for (const a of activityRows) {
    const iid = String(a.itinerary_id);
    if (!actByItin.has(iid)) actByItin.set(iid, []);
    actByItin.get(iid)!.push({ name: String(a.name), cat: String(a.category ?? '') });
  }

  return bookingRows.map((r) => {
    const id = String(r.id);
    const days = (itinByBooking.get(id) ?? [])
      .sort((a, b) => Number(a.day_number) - Number(b.day_number))
      .map((it) => ({
        day: Number(it.day_number),
        dest: String(it.destination ?? ''),
        hotel: String(it.hotel ?? ''),
        activities: actByItin.get(String(it.id)) ?? [],
      })) as BookingItineraryDay[];

    return {
      id,
      custId: String(r.cust_id ?? ''),
      leadId: r.lead_id != null && String(r.lead_id) ? String(r.lead_id) : undefined,
      tour: String(r.tour ?? ''),
      pax: Number(r.pax ?? 1),
      start: r.start_date ? String(r.start_date) : '',
      end: r.end_date ? String(r.end_date) : '',
      total: moneyAbs(r.total),
      deposit: moneyAbs(r.deposit),
      status: String(r.status ?? ''),
      guide: String(r.guide_name ?? ''),
      hotel: String(r.hotel ?? ''),
      changes: [],
      guideAlertPending: Boolean(r.guide_alert_pending),
      itinerary: days.length ? days : undefined,
    };
  });
}

export function bookingToRow(b: Booking): Row {
  return {
    id: b.id,
    cust_id: fkOrNull(b.custId),
    lead_id: fkOrNull(b.leadId),
    tour: b.tour,
    pax: b.pax,
    start_date: b.start || null,
    end_date: b.end || null,
    total: moneyAbs(b.total),
    deposit: moneyAbs(b.deposit),
    status: b.status,
    guide_name: b.guide,
    hotel: b.hotel,
    guide_alert_pending: b.guideAlertPending,
  };
}

export function rowToComm(r: Row): Comm {
  return {
    id: String(r.id),
    cid: String(r.cust_id ?? ''),
    date: String(r.comm_date ?? ''),
    type: String(r.type ?? ''),
    dir: (r.direction as Comm['dir']) ?? 'outbound',
    subj: String(r.subject ?? ''),
    body: String(r.body ?? ''),
    author: String(r.author ?? ''),
  };
}

export function commToRow(c: Comm): Row {
  return {
    id: c.id,
    cust_id: c.cid,
    comm_date: c.date,
    type: c.type,
    direction: c.dir,
    subject: c.subj,
    body: c.body,
    author: c.author,
  };
}

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

export function rowToProduct(r: Row): Product {
  return {
    code: String(r.code),
    name: String(r.name ?? ''),
    logic: String(r.logic ?? ''),
    dur: String(r.duration ?? ''),
    cat: String(r.category ?? ''),
    dest: String(r.destination ?? ''),
    lvl: String(r.level ?? ''),
    desc: String(r.description ?? ''),
    usp: String(r.usp ?? ''),
    notesToSales: String(r.notes_to_sales ?? ''),
    price: String(r.price_from ?? ''),
    region: String(r.region ?? ''),
    photoIds: [],
    linkedPhotoIds: [],
  };
}

export function productToRow(p: Product): Row {
  return {
    code: p.code,
    name: p.name,
    logic: p.logic,
    duration: p.dur,
    category: p.cat,
    destination: p.dest,
    level: p.lvl,
    description: p.desc,
    usp: p.usp,
    notes_to_sales: p.notesToSales ?? '',
    price_from: p.price,
    region: p.region,
  };
}

export function rowToProductPricing(r: Row): ProductPricing {
  return {
    productCode: String(r.product_code),
    stdCost: money(r.std_cost),
    p1: money(r.p1),
    p2: money(r.p2),
    p3: money(r.p3),
    p4: money(r.p4),
    p5: money(r.p5),
    p6: money(r.p6),
    p7: money(r.p7),
    p8: money(r.p8),
    p9: money(r.p9),
    p10: money(r.p10),
    c1: money(r.c1),
    c2: money(r.c2),
    c3: money(r.c3),
    c4: money(r.c4),
    c5: money(r.c5),
    c6: money(r.c6),
    c7: money(r.c7),
    c8: money(r.c8),
    c9: money(r.c9),
    c10: money(r.c10),
    incl: {
      g: Boolean(r.incl_guide),
      tr: Boolean(r.incl_transport),
      tk: Boolean(r.incl_tickets),
      w: Boolean(r.incl_water),
      m: Boolean(r.incl_meals),
    },
  };
}

export function productPricingToRow(p: ProductPricing): Row {
  return {
    product_code: p.productCode,
    std_cost: money(p.stdCost),
    p1: money(p.p1),
    p2: money(p.p2),
    p3: money(p.p3),
    p4: money(p.p4),
    p5: money(p.p5),
    p6: money(p.p6),
    p7: money(p.p7),
    p8: money(p.p8),
    p9: money(p.p9),
    p10: money(p.p10),
    c1: money(p.c1),
    c2: money(p.c2),
    c3: money(p.c3),
    c4: money(p.c4),
    c5: money(p.c5),
    c6: money(p.c6),
    c7: money(p.c7),
    c8: money(p.c8),
    c9: money(p.c9),
    c10: money(p.c10),
    incl_guide: p.incl.g,
    incl_transport: p.incl.tr,
    incl_tickets: p.incl.tk,
    incl_water: p.incl.w,
    incl_meals: p.incl.m,
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

export function financeToRow(r: Row): Row {
  return {
    id: r.id,
    booking_id: fkOrNull(r.bkid ?? r.booking_id),
    cust_name: r.custName ?? r.cust_name,
    type: r.type,
    txn_date: r.date ?? r.txn_date ?? null,
    month: r.month,
    revenue: moneyAbs(r.rev ?? r.revenue),
    cost: moneyAbs(r.cost),
    cash_in: moneyAbs(r.cashIn ?? r.cash_in),
    cash_out: moneyAbs(r.cashOut ?? r.cash_out),
    status: r.status,
    invoice_ref: r.inv ?? r.invoice_ref ?? null,
    notes: r.notes ?? null,
  };
}

export function arToRow(r: Row): Row {
  return {
    id: r.id,
    finance_id: fkOrNull(r.finId ?? r.finance_id),
    cust_name: r.custName ?? r.cust_name,
    tour: r.tour,
    invoice_amount: moneyAbs(r.invoiceAmt ?? r.invoice_amount),
    deposit_paid: moneyAbs(r.depositPaid ?? r.deposit_paid),
    due_date: r.dueDate ?? r.due_date ?? null,
    status: r.status,
  };
}

export function apToRow(r: Row): Row {
  return {
    id: r.id,
    supplier: r.supplier,
    description: r.description,
    amount: moneyAbs(r.amount),
    due_date: r.dueDate ?? r.due_date ?? null,
    status: r.status,
    category: r.category ?? null,
  };
}

export function taxToRow(r: Row): Row {
  return {
    id: r.id,
    period: r.period,
    revenue: moneyAbs(r.rev ?? r.revenue),
    expenses: moneyAbs(r.expenses),
    vat_output: moneyAbs(r.vat_out ?? r.vat_output),
    vat_input: moneyAbs(r.vat_in ?? r.vat_input),
    corp_tax: moneyAbs(r.corp_tax),
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

export function photoToRow(r: Row): Row {
  return {
    id: r.id,
    caption: r.caption ?? null,
    region: r.region ?? null,
    url: r.url ?? null,
    thumb_url: r.thumbUrl ?? r.thumb_url ?? null,
    storage_path: r.storagePath ?? r.storage_path ?? null,
    display_bytes: r.displayBytes ?? r.display_bytes ?? null,
    folder_id: r.folderId ?? r.folder_id ?? 'PF-unsorted',
  };
}

export function messagesFromRows(msgRows: Row[], reactionRows: Row[]): ChatMessages {
  const reactionsByMsg = new Map<string, string[]>();
  for (const rx of reactionRows) {
    const mid = String(rx.message_id);
    if (!reactionsByMsg.has(mid)) reactionsByMsg.set(mid, []);
    reactionsByMsg.get(mid)!.push(String(rx.emoji));
  }

  const out: ChatMessages = {};
  for (const m of msgRows) {
    const ch = String(m.channel_id);
    if (!out[ch]) out[ch] = [];
    const msg: ChatMessage = {
      id: String(m.id),
      author: String(m.author),
      text: String(m.body),
      time: String(m.sent_at),
      reactions: reactionsByMsg.get(String(m.id)) ?? [],
    };
    out[ch].push(msg);
  }
  return out;
}

export function rowToFinance(r: Row): Row {
  return {
    id: r.id,
    bkid: r.booking_id ?? '',
    custName: r.cust_name,
    type: r.type,
    date: r.txn_date,
    month: r.month,
    rev: money(r.revenue),
    cost: money(r.cost),
    cashIn: money(r.cash_in),
    cashOut: money(r.cash_out),
    status: r.status,
    inv: r.invoice_ref,
    notes: r.notes,
  };
}

export function rowToAr(r: Row): Row {
  return {
    id: r.id,
    finId: r.finance_id,
    custName: r.cust_name,
    tour: r.tour,
    invoiceAmt: money(r.invoice_amount),
    depositPaid: money(r.deposit_paid),
    balance: r.balance,
    dueDate: r.due_date,
    status: r.status,
  };
}

export function rowToAp(r: Row): Row {
  return {
    id: r.id,
    supplier: r.supplier,
    description: r.description,
    amount: money(r.amount),
    dueDate: r.due_date,
    status: r.status,
    category: r.category,
  };
}

export function rowToTax(r: Row): Row {
  return {
    id: r.id,
    period: r.period,
    rev: money(r.revenue),
    expenses: money(r.expenses),
    vat_out: money(r.vat_output),
    vat_in: money(r.vat_input),
    corp_tax: money(r.corp_tax),
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

export function rowToPhoto(r: Row, tags: string[] = []): Row {
  return {
    id: r.id,
    caption: r.caption,
    region: r.region,
    url: r.url,
    thumbUrl: r.thumb_url,
    storagePath: r.storage_path,
    displayBytes: r.display_bytes != null ? Number(r.display_bytes) : undefined,
    createdAt: r.created_at != null ? String(r.created_at) : undefined,
    folderId: r.folder_id != null ? String(r.folder_id) : 'PF-unsorted',
    tags,
  };
}

export function photoFolderToRow(r: Row): Row {
  return {
    id: r.id,
    name: r.name ?? null,
    parent_id: r.parentId ?? r.parent_id ?? null,
    sort_order: r.sortOrder ?? r.sort_order ?? 0,
    is_system: Boolean(r.isSystem ?? r.is_system ?? false),
  };
}

export function rowToPhotoFolder(r: Row): Row {
  return {
    id: r.id,
    name: r.name,
    parentId: r.parent_id != null ? String(r.parent_id) : null,
    sortOrder: Number(r.sort_order ?? 0),
    isSystem: Boolean(r.is_system),
    createdAt: r.created_at != null ? String(r.created_at) : undefined,
  };
}

/** Attach product_photos junction onto product rows (featured + pool). */
export function assembleProducts(baseRows: Row[], linkRows: Row[]): Row[] {
  const photosByProduct = new Map<
    string,
    { photoId: string; sortOrder: number; isFeatured: boolean }[]
  >();
  for (const link of linkRows) {
    const code = String(link.product_code);
    if (!photosByProduct.has(code)) photosByProduct.set(code, []);
    photosByProduct.get(code)!.push({
      photoId: String(link.photo_id),
      sortOrder: Number(link.sort_order ?? 0),
      isFeatured: Boolean(link.is_featured),
    });
  }

  return baseRows.map((r) => {
    const base = rowToProduct(r);
    const links = photosByProduct.get(String(base.code)) ?? [];
    links.sort((a, b) => a.sortOrder - b.sortOrder);
    const linkedPhotoIds = links.map((l) => l.photoId);
    const featuredLinks = links.filter((l) => l.isFeatured);
    const photoIds =
      featuredLinks.length > 0
        ? featuredLinks.map((l) => l.photoId).slice(0, 2)
        : linkedPhotoIds.slice(0, 2);
    return { ...base, linkedPhotoIds, photoIds };
  });
}

/** Build junction rows for Supabase sync from a product's pool + featured sets. */
export function productPhotoRows(product: {
  code: string;
  photoIds?: string[];
  linkedPhotoIds?: string[];
}): Row[] {
  const linked =
    product.linkedPhotoIds?.length
      ? product.linkedPhotoIds
      : (product.photoIds ?? []);
  const featured = (product.photoIds ?? []).filter((id) => linked.includes(id)).slice(0, 2);
  const featuredSet = new Set(featured);
  const poolOnly = linked.filter((id) => !featuredSet.has(id));

  return [
    ...featured.map((photoId, i) => ({
      product_code: product.code,
      photo_id: photoId,
      sort_order: i,
      is_featured: true,
    })),
    ...poolOnly.map((photoId, i) => ({
      product_code: product.code,
      photo_id: photoId,
      sort_order: featured.length + i,
      is_featured: false,
    })),
  ];
}

export function taskToRow(r: Row): Row {
  return {
    id: r.id,
    title: r.title,
    assignee: r.assignee,
    due_date: r.date ?? r.due_date ?? null,
    priority: r.priority ?? 'medium',
    department: r.dept ?? r.department,
    status: r.status ?? 'todo',
    notes: r.notes ?? null,
  };
}

export function rowToTask(r: Row): Row {
  return {
    id: r.id,
    title: r.title,
    assignee: r.assignee,
    date: r.due_date,
    priority: r.priority,
    dept: r.department,
    status: r.status,
    notes: r.notes,
  };
}

export function calEventToRow(r: Row): Row {
  return {
    id: r.id,
    guide_id: fkOrNull(r.guideId ?? r.guide_id),
    booking_id: fkOrNull(r.bookingCode ?? r.booking_id),
    tour: r.tour,
    clients: r.clients,
    start_date: r.start ?? r.start_date ?? null,
    end_date: r.end ?? r.end_date ?? null,
    status: r.status,
    notes: r.notes ?? null,
  };
}

export function rowToCalEvent(r: Row): Row {
  return {
    id: r.id,
    guideId: r.guide_id,
    bookingCode: r.booking_id ?? '',
    tour: r.tour,
    clients: r.clients,
    start: r.start_date,
    end: r.end_date,
    status: r.status,
    notes: r.notes,
  };
}

export function devNoteToRow(r: Row): Row {
  return {
    id: r.id,
    title: r.title,
    priority: r.priority ?? 'medium',
    category: r.category ?? null,
    assignee: r.assignee ?? null,
    status: r.status ?? 'open',
    note_date: r.date ?? r.note_date ?? null,
    author: r.author ?? null,
    body: r.body ?? null,
  };
}

export function rowToDevNote(r: Row): Row {
  return {
    id: r.id,
    title: r.title,
    priority: r.priority,
    category: r.category,
    assignee: r.assignee,
    status: r.status,
    date: r.note_date,
    author: r.author,
    body: r.body,
  };
}

export function feedbackToRow(r: Row): Row {
  return {
    id: r.id,
    type: r.type ?? 'client',
    feedback_date: r.date ?? r.feedback_date ?? null,
    booking_id: fkOrNull(r.bkid ?? r.booking_id),
    client_name: r.client ?? r.client_name,
    nps: r.nps ?? null,
    overall_rating: r.overall ?? r.overall_rating ?? null,
    guide_rating: r.guide_r ?? r.guide_rating ?? null,
    hotel_rating: r.hotel_r ?? r.hotel_rating ?? null,
    best_moment: r.best ?? r.best_moment ?? null,
    improvement: r.improve ?? r.improvement ?? null,
    comments: r.comments ?? null,
    would_return: r.again ?? r.would_return ?? null,
  };
}

export function rowToFeedback(r: Row): Row {
  return {
    id: r.id,
    type: r.type,
    date: r.feedback_date,
    bkid: r.booking_id,
    client: r.client_name,
    nps: r.nps,
    overall: r.overall_rating,
    guide_r: r.guide_rating,
    hotel_r: r.hotel_rating,
    best: r.best_moment,
    improve: r.improvement,
    comments: r.comments,
    again: r.would_return,
  };
}

export function contractToRow(r: Row): Row {
  return {
    id: r.id,
    booking_id: r.bookingId ?? r.booking_id ?? null,
    client_name: r.clientName ?? r.client_name,
    nationality: r.nationality ?? null,
    pax: r.pax ?? 1,
    rooms: r.rooms ?? null,
    tour_name: r.tourName ?? r.tour_name,
    duration: r.duration ?? null,
    departure_date: r.departureDate ?? r.departure_date ?? null,
    return_date: r.returnDate ?? r.return_date ?? null,
    route: r.route ?? null,
    inclusions: r.inclusions ?? null,
    exclusions: r.exclusions ?? null,
    flights_info: r.flights ?? r.flights_info ?? null,
    currency: r.currency ?? 'USD',
    total: moneyAbs(r.total),
    deposit_pct: r.depositPct ?? r.deposit_pct ?? 30,
    deposit_amount: moneyAbs(r.depositAmt ?? r.deposit_amount),
    balance_due_date: r.balanceDueDate ?? r.balance_due_date ?? null,
    status: r.status ?? 'Draft',
    created_at: r.createdAt ?? r.created_at ?? null,
    signed_at: r.signedAt ?? r.signed_at ?? null,
    notes: r.notes ?? null,
  };
}

export function rowToContract(r: Row): Row {
  return {
    id: r.id,
    bookingId: r.booking_id,
    clientName: r.client_name,
    nationality: r.nationality,
    pax: r.pax,
    rooms: r.rooms,
    tourName: r.tour_name,
    duration: r.duration,
    departureDate: r.departure_date,
    returnDate: r.return_date,
    route: r.route,
    inclusions: r.inclusions,
    exclusions: r.exclusions,
    flights: r.flights_info,
    currency: r.currency,
    total: money(r.total),
    depositPct: r.deposit_pct,
    depositAmt: money(r.deposit_amount),
    balanceDueDate: r.balance_due_date,
    status: r.status,
    createdAt: r.created_at,
    signedAt: r.signed_at,
    notes: r.notes,
  };
}

export function cruiseToRow(r: Row): Row {
  return {
    id: r.id,
    supplier_id: fkOrNull(r.supplierId ?? r.supplier_id),
    name: r.name,
    route: r.route ?? null,
    cabins: r.cabins ?? null,
    rate: r.rate ?? null,
    valid_until: r.valid ?? r.valid_until ?? null,
    rating: r.rating ?? null,
    notes: r.notes ?? null,
  };
}

export function rowToCruise(r: Row): Row {
  return {
    id: r.id,
    supplierId: r.supplier_id ?? undefined,
    name: r.name,
    route: r.route,
    cabins: r.cabins,
    rate: r.rate,
    valid: r.valid_until,
    rating: r.rating,
    notes: r.notes,
  };
}

export function transportToRow(r: Row): Row {
  return {
    id: r.id,
    supplier_id: fkOrNull(r.supplierId ?? r.supplier_id),
    name: r.name,
    region: r.region ?? null,
    vehicles: r.vehicles ?? null,
    rate: r.rate ?? null,
    notes: r.notes ?? null,
  };
}

export function rowToTransport(r: Row): Row {
  return {
    id: r.id,
    supplierId: r.supplier_id ?? undefined,
    name: r.name,
    region: r.region,
    vehicles: r.vehicles,
    rate: r.rate,
    notes: r.notes,
  };
}

export function restaurantToRow(r: Row): Row {
  return {
    id: r.id,
    supplier_id: fkOrNull(r.supplierId ?? r.supplier_id),
    name: r.name,
    city: r.city ?? null,
    cuisine: r.cuisine ?? null,
    set_menu: r.set ?? r.set_menu ?? null,
    capacity: r.cap ?? r.capacity ?? null,
    rating: r.rating ?? null,
    notes: r.notes ?? null,
  };
}

export function rowToRestaurant(r: Row): Row {
  return {
    id: r.id,
    supplierId: r.supplier_id ?? undefined,
    name: r.name,
    city: r.city,
    cuisine: r.cuisine,
    set: r.set_menu,
    cap: r.capacity,
    rating: r.rating,
    notes: r.notes,
  };
}

export function hotelToRow(h: Row): Row {
  return {
    id: h.id,
    name: h.name,
    destination: h.dest ?? h.destination,
    category: h.cat ?? h.category ?? null,
    stars: h.stars ?? null,
    region: h.region,
    status: h.status ?? 'Active',
  };
}

export function roomToRow(hotelId: string, room: Row, sortOrder: number): Row {
  return {
    id: room.id ?? `${hotelId}-R${sortOrder + 1}`,
    hotel_id: hotelId,
    room_type: room.type ?? room.room_type,
    view: room.view ?? null,
    sqm: room.sqm ?? null,
    low_mup: room.lm ?? room.low_mup ?? 0,
    high_mup: room.hm ?? room.high_mup ?? 0,
    festive_mup: room.fm ?? room.festive_mup ?? 0,
    peak_mup: room.pm ?? room.peak_mup ?? 0,
    low_net: room.ln ?? room.low_net ?? 0,
    high_net: room.hn ?? room.high_net ?? 0,
    festive_net: room.fn ?? room.festive_net ?? 0,
    peak_net: room.pn ?? room.peak_net ?? 0,
    sort_order: sortOrder,
  };
}

export function rowToRoom(r: Row): Row {
  return {
    id: r.id,
    type: r.room_type,
    view: r.view ?? undefined,
    sqm: r.sqm != null ? Number(r.sqm) : undefined,
    lm: Number(r.low_mup ?? 0),
    hm: Number(r.high_mup ?? 0),
    fm: Number(r.festive_mup ?? 0),
    pm: Number(r.peak_mup ?? 0),
    ln: Number(r.low_net ?? 0),
    hn: Number(r.high_net ?? 0),
    fn: Number(r.festive_net ?? 0),
    pn: Number(r.peak_net ?? 0),
  };
}

export function assembleHotels(hotelRows: Row[], roomRows: Row[]): Row[] {
  const roomsByHotel = new Map<string, Row[]>();
  for (const r of [...roomRows].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))) {
    const hid = String(r.hotel_id);
    if (!roomsByHotel.has(hid)) roomsByHotel.set(hid, []);
    roomsByHotel.get(hid)!.push(rowToRoom(r));
  }
  return hotelRows.map((h) => ({
    id: h.id,
    name: h.name,
    dest: h.destination,
    cat: h.category ?? '',
    stars: h.stars ?? '',
    region: h.region,
    status: h.status ?? 'Active',
    rooms: roomsByHotel.get(String(h.id)) ?? [],
  }));
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

export function rowToTourDraft(r: Row): TourDraft {
  const briefJson = (r.brief_json as Record<string, unknown>) ?? undefined;
  const experienceOverrides = getExperienceOverridesFromBriefJson(briefJson);
  return {
    id: String(r.id),
    leadId: String(r.lead_id ?? ''),
    custId: String(r.cust_id ?? ''),
    briefJson,
    outlineStatus: (r.outline_status as TourDraft['outlineStatus']) ?? 'draft',
    outlineNotes: r.outline_notes ? String(r.outline_notes) : undefined,
    outlineSentAt: r.outline_sent_at ? String(r.outline_sent_at) : undefined,
    outlineApprovedAt: r.outline_approved_at ? String(r.outline_approved_at) : undefined,
    outlineRevision: r.outline_revision != null ? Number(r.outline_revision) : undefined,
    selectedCodes: Array.isArray(r.selected_codes) ? (r.selected_codes as string[]) : undefined,
    selectedPackageId: r.selected_package_id ? String(r.selected_package_id) : null,
    experienceOverrides: Object.keys(experienceOverrides).length ? experienceOverrides : undefined,
    markupPct: r.markup_pct != null ? Number(r.markup_pct) : undefined,
    clientType: (r.client_type as TourDraft['clientType']) ?? undefined,
    currentStep: r.current_step != null ? Number(r.current_step) : undefined,
  };
}

export function tourDraftToRow(d: TourDraft): Row {
  return {
    id: d.id,
    lead_id: fkOrNull(d.leadId),
    cust_id: fkOrNull(d.custId),
    brief_json: d.briefJson ?? null,
    outline_status: d.outlineStatus ?? 'draft',
    outline_notes: d.outlineNotes ?? null,
    outline_sent_at: d.outlineSentAt ?? null,
    outline_approved_at: d.outlineApprovedAt ?? null,
    outline_revision: d.outlineRevision ?? 0,
    selected_codes: d.selectedCodes ?? null,
    selected_package_id: d.selectedPackageId ?? null,
    markup_pct: d.markupPct ?? 30,
    client_type: d.clientType ?? 'b2c',
    current_step: d.currentStep ?? 0,
  };
}

export function rowToTourOutlineDay(r: Row): TourOutlineDay {
  return {
    id: String(r.id),
    draftId: String(r.draft_id ?? ''),
    dayNumber: Number(r.day_number ?? 1),
    date: r.outline_date ? String(r.outline_date) : undefined,
    location: r.location ? String(r.location) : undefined,
    activities: r.activities ? String(r.activities) : undefined,
    hotels: r.hotels ? String(r.hotels) : undefined,
    sortOrder: r.sort_order != null ? Number(r.sort_order) : undefined,
  };
}

export function tourOutlineDayToRow(d: TourOutlineDay): Row {
  return {
    id: d.id,
    draft_id: d.draftId,
    day_number: d.dayNumber,
    outline_date: d.date || null,
    location: d.location ?? null,
    activities: d.activities ?? null,
    hotels: d.hotels ?? null,
    sort_order: d.sortOrder ?? d.dayNumber,
  };
}

export function messagesToRows(messages: ChatMessages): { messages: Row[]; reactions: Row[] } {
  const msgRows: Row[] = [];
  const reactionRows: Row[] = [];
  for (const [channelId, list] of Object.entries(messages)) {
    for (const m of list) {
      msgRows.push({
        id: m.id,
        channel_id: channelId,
        author: m.author,
        body: m.text,
        sent_at: m.time,
      });
      for (const emoji of m.reactions ?? []) {
        reactionRows.push({ message_id: m.id, emoji, added_by: '' });
      }
    }
  }
  return { messages: msgRows, reactions: reactionRows };
}
