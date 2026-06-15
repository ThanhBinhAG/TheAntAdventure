import { getSupabaseClient } from '../supabase';
import type { ChatMessages } from '../types';
import {
  getRowId,
  MESSAGES_ROW_ID,
  MESSAGES_TABLE,
  SYNC_ARRAY_TABLES,
  type SyncArrayTable,
} from './sync-config';

const supabase = () => getSupabaseClient();

function toRows(rows: Record<string, unknown>[], table: SyncArrayTable) {
  return rows.map((row, index) => ({
    id: getRowId(row, table, index),
    data: { ...row, id: getRowId(row, table, index) },
    updated_at: new Date().toISOString(),
  }));
}

function fromRows<T>(rows: { id: string; data: T }[] | null): T[] {
  if (!rows?.length) return [];
  return rows.map((r) => ({ ...(r.data as object), id: r.id } as T));
}

async function upsertMany(table: SyncArrayTable, rows: Record<string, unknown>[]) {
  const client = supabase();
  if (!client || !rows.length) return;
  const { error } = await client.from(table).upsert(toRows(rows, table), { onConflict: 'id' });
  if (error) throw error;
}

/** Upsert local rows + remove remote rows deleted in the app */
async function syncTable(table: SyncArrayTable, rows: Record<string, unknown>[]) {
  const client = supabase();
  if (!client) return;

  const localIds = rows.map((row, index) => getRowId(row, table, index));

  if (rows.length) {
    await upsertMany(table, rows);
  }

  const { data: remote, error: fetchError } = await client.from(table).select('id');
  if (fetchError) throw fetchError;

  const orphanIds = (remote ?? [])
    .map((r) => r.id as string)
    .filter((id) => !localIds.includes(id));

  if (orphanIds.length) {
    const { error: deleteError } = await client.from(table).delete().in('id', orphanIds);
    if (deleteError) throw deleteError;
  }
}

async function getAll<T>(table: SyncArrayTable): Promise<T[]> {
  const client = supabase();
  if (!client) return [];
  const { data, error } = await client.from(table).select('id, data');
  if (error) throw error;
  return fromRows<T>(data as { id: string; data: T }[] | null);
}

async function countTable(table: string): Promise<number> {
  const client = supabase();
  if (!client) return 0;
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

function makeTableApi(table: SyncArrayTable) {
  return {
    getAll: () => getAll<Record<string, unknown>>(table),
    upsertMany: (rows: Record<string, unknown>[]) => upsertMany(table, rows),
    syncTable: (rows: Record<string, unknown>[]) => syncTable(table, rows),
    count: () => countTable(table),
  };
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
      const { data, error } = await client
        .from(MESSAGES_TABLE)
        .select('data')
        .eq('id', MESSAGES_ROW_ID)
        .maybeSingle();
      if (error) throw error;
      return (data?.data as ChatMessages) ?? null;
    },
    upsert: async (messages: ChatMessages) => {
      const client = supabase();
      if (!client) return;
      const { error } = await client.from(MESSAGES_TABLE).upsert(
        {
          id: MESSAGES_ROW_ID,
          data: messages,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
    },
    count: async () => {
      const client = supabase();
      if (!client) return 0;
      const { data, error } = await client
        .from(MESSAGES_TABLE)
        .select('data')
        .eq('id', MESSAGES_ROW_ID)
        .maybeSingle();
      if (error) throw error;
      if (!data?.data || typeof data.data !== 'object') return 0;
      return Object.keys(data.data as object).length;
    },
  },

  /** Fast ping — one request, used on app load */
  quickPing: async (): Promise<{ ok: boolean; latencyMs: number; tables: Record<string, number>; error?: string }> => {
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

  /** Full row counts — use via Test connection button only */
  healthCheck: async (): Promise<{ ok: boolean; latencyMs: number; tables: Record<string, number>; error?: string }> => {
    const client = supabase();
    if (!client) {
      return { ok: false, latencyMs: 0, tables: {}, error: 'Supabase client not configured' };
    }

    const start = Date.now();
    try {
      const { error } = await client.from('customers').select('id', { head: true, count: 'exact' });
      if (error) throw error;

      const counts = await Promise.all([
        ...SYNC_ARRAY_TABLES.map(async (t) => [t, await countTable(t)] as const),
        db.messages.count().then((c) => [MESSAGES_TABLE, c] as const),
      ]);
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

// Legacy aliases (existing code may reference these)
export const legacyDb = {
  customers: db.customers,
  leads: db.leads,
  bookings: db.bookings,
  agents: db.agents,
  guides: db.guides,
};
