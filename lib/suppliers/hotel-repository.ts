import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  assembleHotels,
  hotelToRow,
  roomToRow,
} from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import type { Hotel } from '@/lib/types';
import { nextSupplierId } from './supplier-utils';
import { SupplierRepositoryError } from './supplier-errors';
import {
  inputToHotel,
  type HotelInput,
  type HotelListItem,
} from './hotel-input';

export type { HotelListItem } from './hotel-input';
export { SupplierRepositoryError } from './supplier-errors';

const HOTEL_SELECT = '*, hotel_rooms(*)';

function flattenHotelRows(data: Row[] | null): {
  hotelRows: Row[];
  roomRows: Row[];
} {
  const hotelRows: Row[] = [];
  const roomRows: Row[] = [];
  for (const raw of data ?? []) {
    const rooms = (raw.hotel_rooms as Row[] | undefined) ?? [];
    const { hotel_rooms: _rooms, ...hotel } = raw;
    void _rooms;
    hotelRows.push(hotel);
    roomRows.push(...rooms);
  }
  return { hotelRows, roomRows };
}

async function syncHotelRooms(
  supabase: SupabaseClient,
  hotel: Hotel,
): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from('hotel_rooms')
    .select('id')
    .eq('hotel_id', hotel.id);
  if (fetchErr) throw new SupplierRepositoryError(fetchErr.message);

  const localRoomIds = hotel.rooms.map((room, i) =>
    String(room.id ?? `${hotel.id}-R${i + 1}`),
  );
  const remoteIds = (existing ?? []).map((r) => String(r.id));
  const orphanIds = remoteIds.filter((id) => !localRoomIds.includes(id));

  if (orphanIds.length) {
    const { error: delErr } = await supabase
      .from('hotel_rooms')
      .delete()
      .in('id', orphanIds);
    if (delErr) throw new SupplierRepositoryError(delErr.message);
  }

  const roomRows = hotel.rooms.map((room, i) =>
    roomToRow(hotel.id, room as unknown as Row, i),
  );
  if (roomRows.length) {
    const { error: upsertErr } = await supabase
      .from('hotel_rooms')
      .upsert(roomRows, { onConflict: 'id' });
    if (upsertErr) throw new SupplierRepositoryError(upsertErr.message);
  }
}

export async function listHotelsServer(
  supabase: SupabaseClient,
): Promise<HotelListItem[]> {
  const { data, error } = await supabase
    .from('hotels')
    .select(HOTEL_SELECT)
    .order('id');
  if (error) throw new SupplierRepositoryError(error.message);

  const flat = flattenHotelRows((data ?? []) as Row[]);
  return assembleHotels(flat.hotelRows, flat.roomRows) as unknown as HotelListItem[];
}

export async function getHotelByIdServer(
  supabase: SupabaseClient,
  id: string,
): Promise<HotelListItem> {
  const { data, error } = await supabase
    .from('hotels')
    .select(HOTEL_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new SupplierRepositoryError(error.message);
  if (!data) {
    throw new SupplierRepositoryError('Không tìm thấy khách sạn.', 'not_found');
  }

  const flat = flattenHotelRows([data as Row]);
  const [hotel] = assembleHotels(flat.hotelRows, flat.roomRows) as unknown as HotelListItem[];
  if (!hotel) {
    throw new SupplierRepositoryError('Không tìm thấy khách sạn.', 'not_found');
  }
  return hotel;
}

export async function createHotelServer(
  supabase: SupabaseClient,
  input: HotelInput,
): Promise<HotelListItem> {
  const existing = await listHotelsServer(supabase);
  const id = input.id?.trim() || nextSupplierId('HTL-', existing);
  if (existing.some((h) => h.id === id)) {
    throw new SupplierRepositoryError(`Hotel id ${id} đã tồn tại.`, 'conflict');
  }

  const hotel = inputToHotel(input, id);
  const { error } = await supabase.from('hotels').insert(hotelToRow(hotel as unknown as Row));
  if (error) throw new SupplierRepositoryError(error.message);

  await syncHotelRooms(supabase, hotel);
  return getHotelByIdServer(supabase, id);
}

export async function updateHotelServer(
  supabase: SupabaseClient,
  input: HotelInput & { id: string },
): Promise<HotelListItem> {
  await getHotelByIdServer(supabase, input.id);
  const hotel = inputToHotel(input, input.id);

  const { data, error } = await supabase
    .from('hotels')
    .update(hotelToRow(hotel as unknown as Row))
    .eq('id', input.id)
    .select('id')
    .maybeSingle();
  if (error) throw new SupplierRepositoryError(error.message);
  if (!data) {
    throw new SupplierRepositoryError('Không tìm thấy khách sạn.', 'not_found');
  }

  await syncHotelRooms(supabase, hotel);
  return getHotelByIdServer(supabase, input.id);
}

export async function deleteHotelServer(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { data: rooms, error: roomFetchErr } = await supabase
    .from('hotel_rooms')
    .select('id')
    .eq('hotel_id', id);
  if (roomFetchErr) throw new SupplierRepositoryError(roomFetchErr.message);

  const roomIds = (rooms ?? []).map((r) => String(r.id));
  if (roomIds.length) {
    const { error: roomDelErr } = await supabase
      .from('hotel_rooms')
      .delete()
      .in('id', roomIds);
    if (roomDelErr) throw new SupplierRepositoryError(roomDelErr.message);
  }

  const { data, error } = await supabase
    .from('hotels')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw new SupplierRepositoryError(error.message);
  if (!data) {
    throw new SupplierRepositoryError('Không tìm thấy khách sạn.', 'not_found');
  }
}
