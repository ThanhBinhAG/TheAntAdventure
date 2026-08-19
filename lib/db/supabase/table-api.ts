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
        await executeDeleteAndVerify(supabase(), 'bookings', 'id', id);
      },
      count: () => countTable('bookings'),
    };
  }

  if (table === 'hotels') {
    return {
      getAll: () => getHotels(),
      syncTable: (rows: Row[], options?: SyncTableOptions) => syncHotels(rows, options),
      deleteRemote: async (id: string) => {
        await executeDeleteAndVerify(supabase(), 'hotels', 'id', id);
      },
      count: () => countTable('hotels'),
    };
  }

  if (table === 'attractions') {
    return {
      getAll: () => getAttractions(),
      syncTable: (rows: Row[], options?: SyncTableOptions) => syncAttractions(rows, options),
      deleteRemote: async (id: string) => {
        await executeDeleteAndVerify(supabase(), 'attractions', 'id', id);
      },
      count: () => countTable('attractions'),
    };
  }

  if (table === 'products') {
    return {
      getAll: () => getProducts(),
      syncTable: (rows: Row[], options?: SyncTableOptions) => syncProducts(rows, options),
      deleteRemote: async (id: string) => {
        await executeDeleteAndVerify(supabase(), 'products', 'code', id);
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
      await executeDeleteAndVerify(supabase(), handler.table, handler.pk, id);
    },
    count: () => countTable(handler.table),
  };
}

async function executeDeleteAndVerify(
  client: ReturnType<typeof supabase>,
  table: string,
  pkName: string,
  id: string
): Promise<void> {
  if (!client) return;
  const { data, error } = await client.from(table).delete().eq(pkName, id).select(pkName);
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Bạn không có quyền thực hiện thao tác này hoặc bản ghi không tồn tại.');
  }
}
