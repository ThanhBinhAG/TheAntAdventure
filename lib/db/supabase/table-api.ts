import { type SyncArrayTable } from '../sync-config';
import { type SyncTableOptions } from '../sync-policy';
import { getSimpleRows, getTaggedRows, syncSimpleTable, syncTaggedTable } from './generic-sync';
import {
  getAttractions,
  getBookings,
  getHotels,
  getProducts,
  syncAttractions,
  syncBookings,
  syncHotels,
  syncProducts,
} from './nested-sync';
import { countTable, HANDLERS, supabase, type Row } from './shared';

export function makeTableApi(table: SyncArrayTable) {
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
