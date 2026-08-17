import { fkOrNull, money, moneyAbs, type Row } from './shared';

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
