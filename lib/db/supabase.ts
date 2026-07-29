import { getSupabaseClient } from '../supabase';
import type { Booking, ChatMessages, Hotel, Attraction, Product } from '../types';
import {
  agentToRow,
  apToRow,
  arToRow,
  assembleAttractions,
  assembleBookings,
  assembleHotels,
  assembleProducts,
  attractionPhotoRows,
  attractionToRow,
  bookingToRow,
  calEventToRow,
  commToRow,
  contractToRow,
  cruiseToRow,
  customerToRow,
  devNoteToRow,
  feedbackToRow,
  financeToRow,
  guideToRow,
  hotelToRow,
  leadToRow,
  messagesFromRows,
  messagesToRows,
  photoToRow,
  productPhotoRows,
  productToRow,
  productPricingToRow,
  restaurantToRow,
  roomToRow,
  rowToAgent,
  rowToAp,
  rowToAr,
  rowToAttraction,
  rowToCalEvent,
  rowToComm,
  rowToContract,
  rowToCruise,
  rowToCustomer,
  rowToDevNote,
  rowToFeedback,
  rowToFinance,
  rowToGuide,
  rowToLead,
  rowToPhoto,
  rowToProduct,
  rowToProductPricing,
  rowToRestaurant,
  rowToStaffExtended,
  rowToSupplier,
  rowToTask,
  rowToTax,
  rowToTourDraft,
  rowToTourOutlineDay,
  rowToTransport,
  staffToRowExtended,
  supplierToRow,
  taskToRow,
  taxToRow,
  tourDraftToRow,
  tourOutlineDayToRow,
  transportToRow,
} from './mappers';
import {
  HEALTH_COUNT_TABLES,
  MESSAGES_TABLE,
  SYNC_ARRAY_TABLES,
  type SyncArrayTable,
} from './sync-config';
import {
  buildOrphanSkipWarning,
  shouldSkipOrphanDelete,
  type SyncTableOptions,
  type SyncTableResult,
} from './sync-policy';

type Row = Record<string, unknown>;

const supabase = () => getSupabaseClient();

type TableHandler = {
  table: string;
  pk: string;
  toRow: (r: Row) => Row;
  fromRow: (r: Row, tags?: string[]) => Row;
  tagTable?: string;
  tagParentKey?: string;
};

const HANDLERS: Record<SyncArrayTable, TableHandler> = {
  customers: { table: 'customers', pk: 'id', toRow: (r) => customerToRow(r as never), fromRow: (r) => ({ ...rowToCustomer(r) }) },
  comms: { table: 'comms', pk: 'id', toRow: (r) => commToRow(r as never), fromRow: (r) => ({ ...rowToComm(r) }) },
  leads: { table: 'leads', pk: 'id', toRow: (r) => leadToRow(r as never), fromRow: (r) => ({ ...rowToLead(r) }) },
  tour_drafts: {
    table: 'tour_drafts',
    pk: 'id',
    toRow: (r) => tourDraftToRow(r as never),
    fromRow: (r) => ({ ...rowToTourDraft(r) }),
  },
  tour_outline_days: {
    table: 'tour_outline_days',
    pk: 'id',
    toRow: (r) => tourOutlineDayToRow(r as never),
    fromRow: (r) => ({ ...rowToTourOutlineDay(r) }),
  },
  bookings: { table: 'bookings', pk: 'id', toRow: (r) => bookingToRow(r as never), fromRow: (r) => r },
  agents: { table: 'agents', pk: 'id', toRow: (r) => agentToRow(r as never), fromRow: (r) => ({ ...rowToAgent(r) }) },
  attractions: { table: 'attractions', pk: 'id', toRow: attractionToRow, fromRow: (r) => rowToAttraction(r) },
  guides: { table: 'guides', pk: 'id', toRow: (r) => guideToRow(r as never), fromRow: (r) => ({ ...rowToGuide(r) }) },
  products: { table: 'products', pk: 'code', toRow: (r) => productToRow(r as never), fromRow: (r) => ({ ...rowToProduct(r) }) },
  product_pricing: {
    table: 'product_pricing',
    pk: 'product_code',
    toRow: (r) => productPricingToRow(r as never),
    fromRow: (r) => ({ ...rowToProductPricing(r) }),
  },
  finance: { table: 'finance', pk: 'id', toRow: financeToRow, fromRow: rowToFinance },
  accounts_receivable: { table: 'accounts_receivable', pk: 'id', toRow: arToRow, fromRow: rowToAr },
  accounts_payable: { table: 'accounts_payable', pk: 'id', toRow: apToRow, fromRow: rowToAp },
  tax_reports: { table: 'tax_reports', pk: 'id', toRow: taxToRow, fromRow: rowToTax },
  staff: { table: 'staff', pk: 'id', toRow: (r) => staffToRowExtended(r as never), fromRow: (r) => ({ ...rowToStaffExtended(r) }) },
  tasks: { table: 'tasks', pk: 'id', toRow: taskToRow, fromRow: rowToTask },
  feedback: { table: 'feedback', pk: 'id', toRow: feedbackToRow, fromRow: rowToFeedback },
  contracts: { table: 'contracts', pk: 'id', toRow: contractToRow, fromRow: rowToContract },
  photos: {
    table: 'photos',
    pk: 'id',
    toRow: photoToRow,
    fromRow: (r, tags = []) => rowToPhoto(r, tags),
    tagTable: 'photo_tags',
    tagParentKey: 'photo_id',
  },
  cal_events: { table: 'cal_events', pk: 'id', toRow: calEventToRow, fromRow: rowToCalEvent },
  dev_notes: { table: 'dev_notes', pk: 'id', toRow: devNoteToRow, fromRow: rowToDevNote },
  cruises: { table: 'cruises', pk: 'id', toRow: cruiseToRow, fromRow: rowToCruise },
  transport: { table: 'transport', pk: 'id', toRow: transportToRow, fromRow: rowToTransport },
  restaurants: { table: 'restaurants', pk: 'id', toRow: restaurantToRow, fromRow: rowToRestaurant },
  hotels: { table: 'hotels', pk: 'id', toRow: hotelToRow, fromRow: (r) => r },
  suppliers: {
    table: 'suppliers',
    pk: 'id',
    toRow: supplierToRow,
    fromRow: (r, tags = []) => rowToSupplier(r, tags),
    tagTable: 'supplier_tags',
    tagParentKey: 'supplier_id',
  },
};

async function countTable(table: string): Promise<number> {
  const client = supabase();
  if (!client) return 0;
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

async function deleteOrphans(table: string, pk: string, localIds: string[]) {
  const client = supabase();
  if (!client) return;

  const { data: remote, error } = await client.from(table).select(pk);
  if (error) throw error;

  const orphanIds = (remote ?? [])
    .map((r) => String((r as unknown as Row)[pk]))
    .filter((id) => !localIds.includes(id));

  if (orphanIds.length) {
    const { error: delErr } = await client.from(table).delete().in(pk, orphanIds);
    if (delErr) throw delErr;
  }
}

async function syncTaggedTable(
  table: SyncArrayTable,
  handler: TableHandler,
  rows: Row[],
  options: SyncTableOptions = {}
): Promise<SyncTableResult> {
  const client = supabase();
  if (!client) return { skippedOrphanDelete: false };

  const localIds = rows.map((r, i) => String(r.id ?? `${handler.table}-${i}`));
  const baseRows = rows.map((r) => {
    const mapped = handler.toRow(r);
    delete mapped.tags;
    return mapped;
  });

  if (baseRows.length) {
    const { error } = await client.from(handler.table).upsert(baseRows, { onConflict: handler.pk });
    if (error) throw error;
  }

  if (handler.tagTable && handler.tagParentKey) {
    if (localIds.length) {
      const { error: tagDelErr } = await client
        .from(handler.tagTable)
        .delete()
        .in(handler.tagParentKey, localIds);
      if (tagDelErr) throw tagDelErr;
    }

    const tagRows: Row[] = [];
    for (const r of rows) {
      const id = String(r.id);
      for (const tag of (r.tags as string[] | undefined) ?? []) {
        tagRows.push({ [handler.tagParentKey]: id, tag });
      }
    }
    if (tagRows.length) {
      const { error: tagInsErr } = await client.from(handler.tagTable).insert(tagRows);
      if (tagInsErr) throw tagInsErr;
    }
  }

  const skipOrphans = shouldSkipOrphanDelete(table, localIds.length, options.force);
  if (!skipOrphans) {
    await deleteOrphans(handler.table, handler.pk, localIds);
    return { skippedOrphanDelete: false };
  }

  return {
    skippedOrphanDelete: true,
    warning: buildOrphanSkipWarning(table, localIds.length),
  };
}

async function syncSimpleTable(
  table: SyncArrayTable,
  handler: TableHandler,
  rows: Row[],
  options: SyncTableOptions = {}
): Promise<SyncTableResult> {
  const client = supabase();
  if (!client) return { skippedOrphanDelete: false };

  const mapped = rows.map((r) => handler.toRow(r));
  const localIds = mapped.map((row, i) => {
    const pkVal = row[handler.pk];
    if (pkVal != null && String(pkVal).length > 0) return String(pkVal);
    return `${handler.table}-${i}`;
  });
  if (mapped.length) {
    const { error } = await client.from(handler.table).upsert(mapped, { onConflict: handler.pk });
    if (error) throw error;
  }

  const skipOrphans = shouldSkipOrphanDelete(table, localIds.length, options.force);
  if (!skipOrphans) {
    await deleteOrphans(handler.table, handler.pk, localIds);
    return { skippedOrphanDelete: false };
  }

  return {
    skippedOrphanDelete: true,
    warning: buildOrphanSkipWarning(table, localIds.length),
  };
}

async function syncBookingItinerary(booking: Booking) {
  const client = supabase();
  if (!client) return;

  const bookingId = booking.id;
  const { data: existing, error: fetchErr } = await client
    .from('booking_itinerary')
    .select('id')
    .eq('booking_id', bookingId);
  if (fetchErr) throw fetchErr;

  const itinIds = (existing ?? []).map((r) => String(r.id));
  if (itinIds.length) {
    const { error: actDelErr } = await client
      .from('booking_activities')
      .delete()
      .in('itinerary_id', itinIds);
    if (actDelErr) throw actDelErr;
  }

  const { error: itinDelErr } = await client
    .from('booking_itinerary')
    .delete()
    .eq('booking_id', bookingId);
  if (itinDelErr) throw itinDelErr;

  const days = booking.itinerary ?? [];
  for (const day of days) {
    const itinId = crypto.randomUUID();
    const { error: itinInsErr } = await client.from('booking_itinerary').insert({
      id: itinId,
      booking_id: bookingId,
      day_number: day.day,
      destination: day.dest,
      hotel: day.hotel,
      sort_order: day.day,
    });
    if (itinInsErr) throw itinInsErr;

    const activities = (day.activities ?? []).map((act, i) => ({
      itinerary_id: itinId,
      name: act.name,
      category: act.cat,
      sort_order: i,
    }));
    if (activities.length) {
      const { error: actInsErr } = await client.from('booking_activities').insert(activities);
      if (actInsErr) throw actInsErr;
    }
  }
}

async function syncBookings(rows: Row[], options: SyncTableOptions = {}): Promise<SyncTableResult> {
  const client = supabase();
  if (!client) return { skippedOrphanDelete: false };

  const bookings = rows as unknown as Booking[];
  const localIds = bookings.map((b) => b.id);

  if (bookings.length) {
    const { error } = await client
      .from('bookings')
      .upsert(bookings.map(bookingToRow), { onConflict: 'id' });
    if (error) throw error;

    for (const b of bookings) {
      await syncBookingItinerary(b);
    }
  }

  const skipOrphans = shouldSkipOrphanDelete('bookings', localIds.length, options.force);
  if (!skipOrphans) {
    await deleteOrphans('bookings', 'id', localIds);
    return { skippedOrphanDelete: false };
  }

  return {
    skippedOrphanDelete: true,
    warning: buildOrphanSkipWarning('bookings', localIds.length),
  };
}

async function getTaggedRows(handler: TableHandler): Promise<Row[]> {
  const client = supabase();
  if (!client) return [];

  const { data: base, error } = await client.from(handler.table).select('*');
  if (error) throw error;
  if (!base?.length) return [];

  const ids = base.map((r) => String((r as unknown as Row)[handler.pk]));
  const tagsByParent = new Map<string, string[]>();

  if (handler.tagTable && handler.tagParentKey) {
    const { data: tags, error: tagErr } = await client
      .from(handler.tagTable)
      .select('*')
      .in(handler.tagParentKey, ids);
    if (tagErr) throw tagErr;
    for (const t of tags ?? []) {
      const parentId = String((t as unknown as Row)[handler.tagParentKey!]);
      if (!tagsByParent.has(parentId)) tagsByParent.set(parentId, []);
      tagsByParent.get(parentId)!.push(String((t as unknown as Row).tag));
    }
  }

  return base.map((r) => {
    const row = r as Row;
    const id = String(row[handler.pk]);
    return handler.fromRow(row, tagsByParent.get(id) ?? []);
  });
}

async function getSimpleRows(handler: TableHandler): Promise<Row[]> {
  const client = supabase();
  if (!client) return [];
  const { data, error } = await client.from(handler.table).select('*');
  if (error) throw error;
  return (data ?? []).map((r) => handler.fromRow(r as unknown as Row));
}

async function getHotels(): Promise<Hotel[]> {
  const client = supabase();
  if (!client) return [];

  const [hotelRes, roomRes] = await Promise.all([
    client.from('hotels').select('*'),
    client.from('hotel_rooms').select('*'),
  ]);
  if (hotelRes.error) throw hotelRes.error;
  if (roomRes.error) throw roomRes.error;

  return assembleHotels((hotelRes.data ?? []) as Row[], (roomRes.data ?? []) as Row[]) as unknown as Hotel[];
}

async function syncHotelRooms(hotel: Hotel) {
  const client = supabase();
  if (!client) return;

  const { data: existing, error: fetchErr } = await client
    .from('hotel_rooms')
    .select('id')
    .eq('hotel_id', hotel.id);
  if (fetchErr) throw fetchErr;

  const localRoomIds = hotel.rooms.map((room, i) => String(room.id ?? `${hotel.id}-R${i + 1}`));
  const remoteIds = (existing ?? []).map((r) => String(r.id));
  const orphanIds = remoteIds.filter((id) => !localRoomIds.includes(id));

  if (orphanIds.length) {
    const { error: delErr } = await client.from('hotel_rooms').delete().in('id', orphanIds);
    if (delErr) throw delErr;
  }

  const roomRows = hotel.rooms.map((room, i) => roomToRow(hotel.id, room as unknown as Row, i));
  if (roomRows.length) {
    const { error: upsertErr } = await client.from('hotel_rooms').upsert(roomRows, { onConflict: 'id' });
    if (upsertErr) throw upsertErr;
  }
}

async function syncProductPhotos(product: Product) {
  const client = supabase();
  if (!client) return;

  const { error: delErr } = await client
    .from('product_photos')
    .delete()
    .eq('product_code', product.code);
  if (delErr) throw delErr;

  const rows = productPhotoRows(product);
  if (!rows.length) return;

  const { error: insErr } = await client.from('product_photos').insert(rows);
  if (insErr) throw insErr;
}

async function getProducts(): Promise<Product[]> {
  const client = supabase();
  if (!client) return [];

  const [prodRes, linkRes] = await Promise.all([
    client.from('products').select('*'),
    client.from('product_photos').select('*'),
  ]);
  if (prodRes.error) throw prodRes.error;
  if (linkRes.error) throw linkRes.error;

  return assembleProducts(
    (prodRes.data ?? []) as Row[],
    (linkRes.data ?? []) as Row[]
  ) as unknown as Product[];
}

async function syncProducts(rows: Row[], options: SyncTableOptions = {}): Promise<SyncTableResult> {
  const client = supabase();
  if (!client) return { skippedOrphanDelete: false };

  const products = rows as unknown as Product[];
  const localIds = products.map((p) => p.code);

  if (products.length) {
    const { error } = await client.from('products').upsert(
      products.map((p) => productToRow(p)),
      { onConflict: 'code' }
    );
    if (error) throw error;

    for (const product of products) {
      await syncProductPhotos(product);
    }
  }

  const skipOrphans = shouldSkipOrphanDelete('products', localIds.length, options.force);
  if (!skipOrphans) {
    await deleteOrphans('products', 'code', localIds);
    return { skippedOrphanDelete: false };
  }

  return {
    skippedOrphanDelete: true,
    warning: buildOrphanSkipWarning('products', localIds.length),
  };
}

async function syncAttractionPhotos(attraction: Attraction) {
  const client = supabase();
  if (!client) return;

  const { error: delErr } = await client
    .from('attraction_photos')
    .delete()
    .eq('attraction_id', attraction.id);
  if (delErr) throw delErr;

  const rows = attractionPhotoRows(attraction);
  if (!rows.length) return;

  const { error: insErr } = await client.from('attraction_photos').insert(rows);
  if (insErr) throw insErr;
}

async function getAttractions(): Promise<Attraction[]> {
  const client = supabase();
  if (!client) return [];

  const [attRes, linkRes] = await Promise.all([
    client.from('attractions').select('*'),
    client.from('attraction_photos').select('*'),
  ]);
  if (attRes.error) throw attRes.error;
  if (linkRes.error) throw linkRes.error;

  return assembleAttractions(
    (attRes.data ?? []) as Row[],
    (linkRes.data ?? []) as Row[]
  ) as unknown as Attraction[];
}

async function syncAttractions(rows: Row[], options: SyncTableOptions = {}): Promise<SyncTableResult> {
  const client = supabase();
  if (!client) return { skippedOrphanDelete: false };

  const attractions = rows as unknown as Attraction[];
  const localIds = attractions.map((a) => a.id);

  if (attractions.length) {
    const { error } = await client.from('attractions').upsert(
      attractions.map((a) => attractionToRow(a as unknown as Row)),
      { onConflict: 'id' }
    );
    if (error) throw error;

    for (const attraction of attractions) {
      await syncAttractionPhotos(attraction);
    }
  }

  const skipOrphans = shouldSkipOrphanDelete('attractions', localIds.length, options.force);
  if (!skipOrphans) {
    await deleteOrphans('attractions', 'id', localIds);
    return { skippedOrphanDelete: false };
  }

  return {
    skippedOrphanDelete: true,
    warning: buildOrphanSkipWarning('attractions', localIds.length),
  };
}

async function syncHotels(rows: Row[], options: SyncTableOptions = {}): Promise<SyncTableResult> {
  const client = supabase();
  if (!client) return { skippedOrphanDelete: false };

  const hotels = rows as unknown as Hotel[];
  const localIds = hotels.map((h) => h.id);

  if (hotels.length) {
    const { error } = await client.from('hotels').upsert(hotels.map((h) => hotelToRow(h as unknown as Row)), {
      onConflict: 'id',
    });
    if (error) throw error;

    for (const hotel of hotels) {
      await syncHotelRooms(hotel);
    }
  }

  const skipOrphans = shouldSkipOrphanDelete('hotels', localIds.length, options.force);
  if (!skipOrphans) {
    await deleteOrphans('hotels', 'id', localIds);
    return { skippedOrphanDelete: false };
  }

  return {
    skippedOrphanDelete: true,
    warning: buildOrphanSkipWarning('hotels', localIds.length),
  };
}

async function getBookings(): Promise<Booking[]> {
  const client = supabase();
  if (!client) return [];

  const [bookRes, itinRes, actRes] = await Promise.all([
    client.from('bookings').select('*'),
    client.from('booking_itinerary').select('*'),
    client.from('booking_activities').select('*'),
  ]);
  if (bookRes.error) throw bookRes.error;
  if (itinRes.error) throw itinRes.error;
  if (actRes.error) throw actRes.error;

  return assembleBookings(
    (bookRes.data ?? []) as Row[],
    (itinRes.data ?? []) as Row[],
    (actRes.data ?? []) as Row[]
  );
}

function makeTableApi(table: SyncArrayTable) {
  const handler = HANDLERS[table];

  if (table === 'bookings') {
    return {
      getAll: () => getBookings(),
      syncTable: (rows: Row[], options?: SyncTableOptions) => syncBookings(rows, options),
      deleteRemote: async (id: string) => {
        const client = supabase();
        if (!client) return;
        const { error } = await client.from('bookings').delete().eq('id', id);
        if (error) throw error;
      },
      count: () => countTable('bookings'),
    };
  }

  if (table === 'hotels') {
    return {
      getAll: () => getHotels(),
      syncTable: (rows: Row[], options?: SyncTableOptions) => syncHotels(rows, options),
      deleteRemote: async (id: string) => {
        const client = supabase();
        if (!client) return;
        const { error } = await client.from('hotels').delete().eq('id', id);
        if (error) throw error;
      },
      count: () => countTable('hotels'),
    };
  }

  if (table === 'attractions') {
    return {
      getAll: () => getAttractions(),
      syncTable: (rows: Row[], options?: SyncTableOptions) => syncAttractions(rows, options),
      deleteRemote: async (id: string) => {
        const client = supabase();
        if (!client) return;
        const { error } = await client.from('attractions').delete().eq('id', id);
        if (error) throw error;
      },
      count: () => countTable('attractions'),
    };
  }

  if (table === 'products') {
    return {
      getAll: () => getProducts(),
      syncTable: (rows: Row[], options?: SyncTableOptions) => syncProducts(rows, options),
      deleteRemote: async (id: string) => {
        const client = supabase();
        if (!client) return;
        const { error } = await client.from('products').delete().eq('code', id);
        if (error) throw error;
      },
      count: () => countTable('products'),
    };
  }

  const getAll = handler.tagTable ? () => getTaggedRows(handler) : () => getSimpleRows(handler);
  const syncTable = handler.tagTable
    ? (rows: Row[], options?: SyncTableOptions) => syncTaggedTable(table, handler, rows, options)
    : (rows: Row[], options?: SyncTableOptions) => syncSimpleTable(table, handler, rows, options);

  return {
    getAll,
    syncTable,
    deleteRemote: async (id: string) => {
      const client = supabase();
      if (!client) return;
      const { error } = await client.from(handler.table).delete().eq(handler.pk, id);
      if (error) throw error;
    },
    count: () => countTable(handler.table),
  };
}

async function syncMessages(messages: ChatMessages, options: SyncTableOptions = {}): Promise<SyncTableResult> {
  // Messages retain the generic sync-table signature; options do not affect message rows.
  void options;
  const client = supabase();
  if (!client) return { skippedOrphanDelete: false };

  const { messages: msgRows, reactions } = messagesToRows(messages);
  const localMsgIds = msgRows.map((m) => String(m.id));

  if (msgRows.length) {
    const { error } = await client.from('chat_messages').upsert(msgRows, { onConflict: 'id' });
    if (error) throw error;
  }

  if (localMsgIds.length === 0) {
    return {
      skippedOrphanDelete: true,
      warning: 'chat_messages: local=0 — skipped orphan delete',
    };
  }

  await deleteOrphans('chat_messages', 'id', localMsgIds);

  if (localMsgIds.length) {
    const { error: rxDelErr } = await client
      .from('chat_reactions')
      .delete()
      .in('message_id', localMsgIds);
    if (rxDelErr) throw rxDelErr;
  }

  if (reactions.length) {
    const { error: rxInsErr } = await client.from('chat_reactions').insert(reactions);
    if (rxInsErr) throw rxInsErr;
  }

  return { skippedOrphanDelete: false };
}

export const db = {
  ...Object.fromEntries(SYNC_ARRAY_TABLES.map((t) => [t, makeTableApi(t)])) as Record<
    SyncArrayTable,
    ReturnType<typeof makeTableApi>
  >,

  messages: {
    get: async (): Promise<ChatMessages | null> => {
      const client = supabase();
      if (!client) return null;

      const [msgRes, rxRes] = await Promise.all([
        client.from('chat_messages').select('*'),
        client.from('chat_reactions').select('*'),
      ]);
      if (msgRes.error) throw msgRes.error;
      if (rxRes.error) throw rxRes.error;

      const messages = messagesFromRows(
        (msgRes.data ?? []) as Row[],
        (rxRes.data ?? []) as Row[]
      );
      return Object.keys(messages).length ? messages : null;
    },
    upsert: syncMessages,
    count: () => countTable('chat_messages'),
  },

  quickPing: async (): Promise<{
    ok: boolean;
    latencyMs: number;
    tables: Record<string, number>;
    error?: string;
  }> => {
    const client = supabase();
    if (!client) {
      return { ok: false, latencyMs: 0, tables: {}, error: 'Supabase client not configured' };
    }

    const start = Date.now();
    try {
      const { count, error } = await client
        .from('customers')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return {
        ok: true,
        latencyMs: Date.now() - start,
        tables: { customers: count ?? 0 },
      };
    } catch (e) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        tables: {},
        error: e instanceof Error ? e.message : 'Connection failed',
      };
    }
  },

  healthCheck: async (): Promise<{
    ok: boolean;
    latencyMs: number;
    tables: Record<string, number>;
    error?: string;
  }> => {
    const client = supabase();
    if (!client) {
      return { ok: false, latencyMs: 0, tables: {}, error: 'Supabase client not configured' };
    }

    const start = Date.now();
    try {
      const { error } = await client.from('customers').select('id', { head: true, count: 'exact' });
      if (error) throw error;

      const counts = await Promise.all(
        HEALTH_COUNT_TABLES.map(async (t) => {
          if (t === MESSAGES_TABLE) return [t, await db.messages.count()] as const;
          if (t === 'booking_itinerary' || t === 'booking_activities') {
            return [t, await countTable(t)] as const;
          }
          const syncTable = t as SyncArrayTable;
          return [t, await db[syncTable].count()] as const;
        })
      );

      return {
        ok: true,
        latencyMs: Date.now() - start,
        tables: Object.fromEntries(counts),
      };
    } catch (e) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        tables: {},
        error: e instanceof Error ? e.message : 'Connection failed',
      };
    }
  },
};
