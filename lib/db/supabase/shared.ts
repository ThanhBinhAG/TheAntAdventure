import { getSupabaseClient } from '../../supabase';
import {
  agentToRow,
  apToRow,
  arToRow,
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
  photoToRow,
  photoFolderToRow,
  productToRow,
  productPricingToRow,
  restaurantToRow,
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
  rowToPhotoFolder,
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
} from '../mappers';
import { type SyncArrayTable } from '../sync-config';

export type Row = Record<string, unknown>;

export const supabase = () => getSupabaseClient();

export type TableHandler = {
  table: string;
  pk: string;
  toRow: (r: Row) => Row;
  fromRow: (r: Row, tags?: string[]) => Row;
  tagTable?: string;
  tagParentKey?: string;
};

export const HANDLERS: Record<SyncArrayTable, TableHandler> = {
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
  photo_folders: {
    table: 'photo_folders',
    pk: 'id',
    toRow: photoFolderToRow,
    fromRow: (r) => rowToPhotoFolder(r),
  },
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

export async function countTable(table: string): Promise<number> {
  const client = supabase();
  if (!client) return 0;
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function deleteOrphans(table: string, pk: string, localIds: string[]) {
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
