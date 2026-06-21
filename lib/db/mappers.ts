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
  StaffMember,
} from '../types';

type Row = Record<string, unknown>;

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

export function rowToLead(r: Row): Lead {
  return {
    id: String(r.id),
    custId: String(r.cust_id ?? ''),
    tour: String(r.tour ?? ''),
    pax: r.pax != null ? Number(r.pax) : 1,
    value: Number(r.value ?? 0),
    month: String(r.month ?? ''),
    stage: String(r.stage ?? 'Inquiry'),
    owner: String(r.owner ?? ''),
    followUpDate: r.follow_up_date ? String(r.follow_up_date) : undefined,
    nextAction: r.next_action ? String(r.next_action) : undefined,
    probability: r.probability != null ? Number(r.probability) : undefined,
    clientType: r.client_type ? String(r.client_type) : undefined,
    currency: r.currency ? String(r.currency) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
  };
}

export function leadToRow(l: Lead): Row {
  return {
    id: l.id,
    cust_id: l.custId,
    tour: l.tour,
    pax: l.pax,
    value: l.value,
    currency: l.currency ?? 'USD',
    month: l.month,
    stage: l.stage,
    owner: l.owner,
    follow_up_date: l.followUpDate ?? null,
    next_action: l.nextAction ?? null,
    probability: l.probability ?? null,
    client_type: l.clientType ?? null,
    notes: l.notes ?? null,
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
      tour: String(r.tour ?? ''),
      pax: Number(r.pax ?? 1),
      start: r.start_date ? String(r.start_date) : '',
      end: r.end_date ? String(r.end_date) : '',
      total: Number(r.total ?? 0),
      deposit: Number(r.deposit ?? 0),
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
    cust_id: b.custId,
    tour: b.tour,
    pax: b.pax,
    start_date: b.start || null,
    end_date: b.end || null,
    total: b.total,
    deposit: b.deposit,
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
    rate: Number(r.daily_rate ?? 0),
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
    daily_rate: g.rate,
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
    price: String(r.price_from ?? ''),
    region: String(r.region ?? ''),
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
    price_from: p.price,
    region: p.region,
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

export function rowToLoose(r: Row): Row {
  return { ...r, id: String(r.id) };
}

export function financeToRow(r: Row): Row {
  return {
    id: r.id,
    booking_id: r.bkid ?? r.booking_id ?? null,
    cust_name: r.custName ?? r.cust_name,
    type: r.type,
    txn_date: r.date ?? r.txn_date ?? null,
    month: r.month,
    revenue: r.rev ?? r.revenue ?? 0,
    cost: r.cost ?? 0,
    cash_in: r.cashIn ?? r.cash_in ?? 0,
    cash_out: r.cashOut ?? r.cash_out ?? 0,
    status: r.status,
    invoice_ref: r.inv ?? r.invoice_ref ?? null,
    notes: r.notes ?? null,
  };
}

export function arToRow(r: Row): Row {
  return {
    id: r.id,
    finance_id: r.finId ?? r.finance_id ?? null,
    cust_name: r.custName ?? r.cust_name,
    tour: r.tour,
    invoice_amount: r.invoiceAmt ?? r.invoice_amount ?? 0,
    deposit_paid: r.depositPaid ?? r.deposit_paid ?? 0,
    due_date: r.dueDate ?? r.due_date ?? null,
    status: r.status,
  };
}

export function apToRow(r: Row): Row {
  return {
    id: r.id,
    supplier: r.supplier,
    description: r.description,
    amount: r.amount ?? 0,
    due_date: r.dueDate ?? r.due_date ?? null,
    status: r.status,
    category: r.category ?? null,
  };
}

export function taxToRow(r: Row): Row {
  return {
    id: r.id,
    period: r.period,
    revenue: r.rev ?? r.revenue ?? 0,
    expenses: r.expenses ?? 0,
    vat_output: r.vat_out ?? r.vat_output ?? 0,
    vat_input: r.vat_in ?? r.vat_input ?? 0,
    corp_tax: r.corp_tax ?? 0,
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
    product_code: r.product ?? r.product_code ?? null,
    url: r.url ?? null,
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
    rev: r.revenue,
    cost: r.cost,
    cashIn: r.cash_in,
    cashOut: r.cash_out,
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
    invoiceAmt: r.invoice_amount,
    depositPaid: r.deposit_paid,
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
    amount: r.amount,
    dueDate: r.due_date,
    status: r.status,
    category: r.category,
  };
}

export function rowToTax(r: Row): Row {
  return {
    id: r.id,
    period: r.period,
    rev: r.revenue,
    expenses: r.expenses,
    vat_out: r.vat_output,
    vat_in: r.vat_input,
    corp_tax: r.corp_tax,
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
    product: r.product_code,
    url: r.url,
    tags,
  };
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
    guide_id: r.guideId ?? r.guide_id ?? null,
    booking_id: r.bookingCode ?? r.booking_id ?? null,
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
    booking_id: r.bkid ?? r.booking_id ?? null,
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
    total: r.total ?? 0,
    deposit_pct: r.depositPct ?? r.deposit_pct ?? 30,
    deposit_amount: r.depositAmt ?? r.deposit_amount ?? 0,
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
    total: r.total,
    depositPct: r.deposit_pct,
    depositAmt: r.deposit_amount,
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
  return { ...r, valid: r.valid_until };
}

export function transportToRow(r: Row): Row {
  return {
    id: r.id,
    name: r.name,
    region: r.region ?? null,
    vehicles: r.vehicles ?? null,
    rate: r.rate ?? null,
    notes: r.notes ?? null,
  };
}

export function restaurantToRow(r: Row): Row {
  return {
    id: r.id,
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
  return { ...r, set: r.set_menu, cap: r.capacity };
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
