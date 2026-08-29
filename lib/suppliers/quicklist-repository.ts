import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  cruiseToRow,
  restaurantToRow,
  rowToCruise,
  rowToRestaurant,
  rowToTransport,
  transportToRow,
} from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import type {
  CruiseSupplier,
  RestaurantSupplier,
  TransportSupplier,
} from '@/lib/types';
import { nextSupplierId } from './supplier-utils';
import { SupplierRepositoryError } from './supplier-errors';
import {
  inputToCruise,
  inputToRestaurant,
  inputToTransport,
  type CruiseInput,
  type CruiseListItem,
  type RestaurantInput,
  type RestaurantListItem,
  type TransportInput,
  type TransportListItem,
} from './quicklist-input';

export { SupplierRepositoryError } from './supplier-errors';
export type { CruiseListItem, RestaurantListItem, TransportListItem } from './quicklist-input';

type QuickKind = 'transport' | 'restaurants' | 'cruises';

const QUICK_CONFIG = {
  transport: {
    table: 'transport' as const,
    prefix: 'TRN-',
    toRow: transportToRow,
    fromRow: rowToTransport,
    notFound: 'Không tìm thấy nhà xe.',
    conflict: (id: string) => `Transport id ${id} đã tồn tại.`,
  },
  restaurants: {
    table: 'restaurants' as const,
    prefix: 'RST-',
    toRow: restaurantToRow,
    fromRow: rowToRestaurant,
    notFound: 'Không tìm thấy nhà hàng.',
    conflict: (id: string) => `Restaurant id ${id} đã tồn tại.`,
  },
  cruises: {
    table: 'cruises' as const,
    prefix: 'CRU-',
    toRow: cruiseToRow,
    fromRow: rowToCruise,
    notFound: 'Không tìm thấy du thuyền.',
    conflict: (id: string) => `Cruise id ${id} đã tồn tại.`,
  },
} as const;

async function listQuickRows<T>(
  supabase: SupabaseClient,
  kind: QuickKind,
): Promise<T[]> {
  const cfg = QUICK_CONFIG[kind];
  const { data, error } = await supabase.from(cfg.table).select('*').order('id');
  if (error) throw new SupplierRepositoryError(error.message);
  return ((data ?? []) as Row[]).map((r) => cfg.fromRow(r) as unknown as T);
}

async function getQuickById<T>(
  supabase: SupabaseClient,
  kind: QuickKind,
  id: string,
): Promise<T> {
  const cfg = QUICK_CONFIG[kind];
  const { data, error } = await supabase
    .from(cfg.table)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new SupplierRepositoryError(error.message);
  if (!data) throw new SupplierRepositoryError(cfg.notFound, 'not_found');
  return cfg.fromRow(data as Row) as unknown as T;
}

async function createQuickRow<T extends { id: string }>(
  supabase: SupabaseClient,
  kind: QuickKind,
  entity: T,
): Promise<T> {
  const cfg = QUICK_CONFIG[kind];
  const existing = await listQuickRows<{ id: string }>(supabase, kind);
  if (existing.some((row) => row.id === entity.id)) {
    throw new SupplierRepositoryError(cfg.conflict(entity.id), 'conflict');
  }
  const { error } = await supabase
    .from(cfg.table)
    .insert(cfg.toRow(entity as unknown as Row));
  if (error) throw new SupplierRepositoryError(error.message);
  return getQuickById<T>(supabase, kind, entity.id);
}

async function updateQuickRow<T extends { id: string }>(
  supabase: SupabaseClient,
  kind: QuickKind,
  entity: T,
): Promise<T> {
  const cfg = QUICK_CONFIG[kind];
  await getQuickById(supabase, kind, entity.id);
  const { data, error } = await supabase
    .from(cfg.table)
    .update(cfg.toRow(entity as unknown as Row))
    .eq('id', entity.id)
    .select('id')
    .maybeSingle();
  if (error) throw new SupplierRepositoryError(error.message);
  if (!data) throw new SupplierRepositoryError(cfg.notFound, 'not_found');
  return getQuickById<T>(supabase, kind, entity.id);
}

async function deleteQuickRow(
  supabase: SupabaseClient,
  kind: QuickKind,
  id: string,
): Promise<void> {
  const cfg = QUICK_CONFIG[kind];
  const { data, error } = await supabase
    .from(cfg.table)
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw new SupplierRepositoryError(error.message);
  if (!data) throw new SupplierRepositoryError(cfg.notFound, 'not_found');
}

export async function listTransportServer(
  supabase: SupabaseClient,
): Promise<TransportListItem[]> {
  return listQuickRows<TransportListItem>(supabase, 'transport');
}

export async function getTransportByIdServer(
  supabase: SupabaseClient,
  id: string,
): Promise<TransportListItem> {
  return getQuickById<TransportListItem>(supabase, 'transport', id);
}

export async function createTransportServer(
  supabase: SupabaseClient,
  input: TransportInput,
): Promise<TransportListItem> {
  const existing = await listTransportServer(supabase);
  const id = input.id?.trim() || nextSupplierId(QUICK_CONFIG.transport.prefix, existing);
  const entity = inputToTransport(input, id);
  return createQuickRow<TransportSupplier>(supabase, 'transport', entity);
}

export async function updateTransportServer(
  supabase: SupabaseClient,
  input: TransportInput & { id: string },
): Promise<TransportListItem> {
  return updateQuickRow(
    supabase,
    'transport',
    inputToTransport(input, input.id),
  );
}

export async function deleteTransportServer(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  return deleteQuickRow(supabase, 'transport', id);
}

export async function listRestaurantsServer(
  supabase: SupabaseClient,
): Promise<RestaurantListItem[]> {
  return listQuickRows<RestaurantListItem>(supabase, 'restaurants');
}

export async function getRestaurantByIdServer(
  supabase: SupabaseClient,
  id: string,
): Promise<RestaurantListItem> {
  return getQuickById<RestaurantListItem>(supabase, 'restaurants', id);
}

export async function createRestaurantServer(
  supabase: SupabaseClient,
  input: RestaurantInput,
): Promise<RestaurantListItem> {
  const existing = await listRestaurantsServer(supabase);
  const id =
    input.id?.trim() || nextSupplierId(QUICK_CONFIG.restaurants.prefix, existing);
  const entity = inputToRestaurant(input, id);
  return createQuickRow<RestaurantSupplier>(supabase, 'restaurants', entity);
}

export async function updateRestaurantServer(
  supabase: SupabaseClient,
  input: RestaurantInput & { id: string },
): Promise<RestaurantListItem> {
  return updateQuickRow(
    supabase,
    'restaurants',
    inputToRestaurant(input, input.id),
  );
}

export async function deleteRestaurantServer(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  return deleteQuickRow(supabase, 'restaurants', id);
}

export async function listCruisesServer(
  supabase: SupabaseClient,
): Promise<CruiseListItem[]> {
  return listQuickRows<CruiseListItem>(supabase, 'cruises');
}

export async function getCruiseByIdServer(
  supabase: SupabaseClient,
  id: string,
): Promise<CruiseListItem> {
  return getQuickById<CruiseListItem>(supabase, 'cruises', id);
}

export async function createCruiseServer(
  supabase: SupabaseClient,
  input: CruiseInput,
): Promise<CruiseListItem> {
  const existing = await listCruisesServer(supabase);
  const id = input.id?.trim() || nextSupplierId(QUICK_CONFIG.cruises.prefix, existing);
  const entity = inputToCruise(input, id);
  return createQuickRow<CruiseSupplier>(supabase, 'cruises', entity);
}

export async function updateCruiseServer(
  supabase: SupabaseClient,
  input: CruiseInput & { id: string },
): Promise<CruiseListItem> {
  return updateQuickRow(supabase, 'cruises', inputToCruise(input, input.id));
}

export async function deleteCruiseServer(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  return deleteQuickRow(supabase, 'cruises', id);
}
