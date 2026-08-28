import { bookingDateForDb } from '@/lib/bookings/booking-dates';
import type {
  Agent,
  Booking,
  BookingActivity,
  BookingItineraryDay,
  Comm,
  Customer,
  Lead,
} from '../../types';
import { fkOrNull, money, moneyAbs, type Row } from './shared';

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
    start_date: bookingDateForDb(b.start),
    end_date: bookingDateForDb(b.end),
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
