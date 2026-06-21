import { getSupabaseClient } from '../supabase';
import type { Booking, ChatMessages } from '../types';
import {
  agentToRow,
  apToRow,
  arToRow,
  assembleBookings,
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
  leadToRow,
  messagesFromRows,
  messagesToRows,
  photoToRow,
  productToRow,
  restaurantToRow,
  rowToAgent,
  rowToAp,
  rowToAr,
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
  rowToRestaurant,
  rowToStaffExtended,
  rowToSupplier,
  rowToTask,
  rowToTax,
  staffToRowExtended,
  supplierToRow,
  taskToRow,
  taxToRow,
  transportToRow,
} from './mappers';
import {
  HEALTH_COUNT_TABLES,
  MESSAGES_TABLE,
  SYNC_ARRAY_TABLES,
  type SyncArrayTable,
} from './sync-config';

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
  bookings: { table: 'bookings', pk: 'id', toRow: (r) => bookingToRow(r as never), fromRow: (r) => r },
  agents: { table: 'agents', pk: 'id', toRow: (r) => agentToRow(r as never), fromRow: (r) => ({ ...rowToAgent(r) }) },
  guides: { table: 'guides', pk: 'id', toRow: (r) => guideToRow(r as never), fromRow: (r) => ({ ...rowToGuide(r) }) },
  products: { table: 'products', pk: 'code', toRow: (r) => productToRow(r as never), fromRow: (r) => ({ ...rowToProduct(r) }) },
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
  transport: { table: 'transport', pk: 'id', toRow: transportToRow, fromRow: (r) => r },
  restaurants: { table: 'restaurants', pk: 'id', toRow: restaurantToRow, fromRow: rowToRestaurant },
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

async function syncTaggedTable(handler: TableHandler, rows: Row[]) {
  const client = supabase();
  if (!client) return;

  const localIds = rows.map((r, i) => String(r.id ?? `${handler.table}-${i}`));
  const baseRows = rows.map((r) => {
    const mapped = handler.toRow(r);
    const { tags: _tags, ...rest } = mapped;
    return rest;
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

  await deleteOrphans(handler.table, handler.pk, localIds);
}

async function syncSimpleTable(handler: TableHandler, rows: Row[]) {
  const client = supabase();
  if (!client) return;

  const localIds = rows.map((r, i) => {
    if (handler.pk === 'code' && r.code != null) return String(r.code);
    return String(r.id ?? `${handler.table}-${i}`);
  });

  const mapped = rows.map((r) => handler.toRow(r));
  if (mapped.length) {
    const { error } = await client.from(handler.table).upsert(mapped, { onConflict: handler.pk });
    if (error) throw error;
  }

  await deleteOrphans(handler.table, handler.pk, localIds);
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

async function syncBookings(rows: Row[]) {
  const client = supabase();
  if (!client) return;

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

  await deleteOrphans('bookings', 'id', localIds);
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
      syncTable: (rows: Row[]) => syncBookings(rows),
      count: () => countTable('bookings'),
    };
  }

  const getAll = handler.tagTable ? () => getTaggedRows(handler) : () => getSimpleRows(handler);
  const syncTable = handler.tagTable
    ? (rows: Row[]) => syncTaggedTable(handler, rows)
    : (rows: Row[]) => syncSimpleTable(handler, rows);

  return {
    getAll,
    syncTable,
    count: () => countTable(handler.table),
  };
}

async function syncMessages(messages: ChatMessages) {
  const client = supabase();
  if (!client) return;

  const { messages: msgRows, reactions } = messagesToRows(messages);
  const localMsgIds = msgRows.map((m) => String(m.id));

  if (msgRows.length) {
    const { error } = await client.from('chat_messages').upsert(msgRows, { onConflict: 'id' });
    if (error) throw error;
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

export const legacyDb = {
  customers: db.customers,
  leads: db.leads,
  bookings: db.bookings,
  agents: db.agents,
  guides: db.guides,
};
