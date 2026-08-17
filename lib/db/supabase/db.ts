import type { ChatMessages } from '../../types';
import { messagesFromRows, messagesToRows } from '../mappers';
import {
  HEALTH_CHILD_COUNT_TABLES,
  HEALTH_COUNT_TABLES,
  MESSAGES_TABLE,
  SYNC_ARRAY_TABLES,
  type SyncArrayTable,
} from '../sync-config';
import { type SyncTableOptions, type SyncTableResult } from '../sync-policy';
import { countTable, deleteOrphans, supabase, type Row } from './shared';
import { makeTableApi } from './table-api';

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

      const { data, error } = await client
        .from('chat_messages')
        .select('*, chat_reactions(*)');
      if (error) throw error;

      const msgRows: Row[] = [];
      const rxRows: Row[] = [];
      for (const raw of (data ?? []) as Row[]) {
        const reactions = (raw.chat_reactions as Row[] | undefined) ?? [];
        const { chat_reactions: _rx, ...msg } = raw;
        void _rx;
        msgRows.push(msg);
        rxRows.push(...reactions);
      }

      const messages = messagesFromRows(msgRows, rxRows);
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

      const childCountSet = new Set<string>(HEALTH_CHILD_COUNT_TABLES);

      const counts = await Promise.all(
        HEALTH_COUNT_TABLES.map(async (t) => {
          if (t === MESSAGES_TABLE) return [t, await db.messages.count()] as const;
          if (childCountSet.has(t)) {
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
