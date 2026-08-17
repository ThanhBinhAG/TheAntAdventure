import type { Attraction, Booking, Hotel, Product } from '../../types';
import {
  assembleAttractions,
  assembleBookings,
  assembleHotels,
  assembleProducts,
  attractionPhotoRows,
  attractionToRow,
  bookingToRow,
  hotelToRow,
  productPhotoRows,
  productToRow,
  roomToRow,
} from '../mappers';
import {
  buildOrphanSkipWarning,
  shouldSkipOrphanDelete,
  type SyncTableOptions,
  type SyncTableResult,
} from '../sync-policy';
import { deleteOrphans, supabase, type Row } from './shared';

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

export async function syncBookings(rows: Row[], options: SyncTableOptions = {}): Promise<SyncTableResult> {
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

export async function getHotels(): Promise<Hotel[]> {
  const client = supabase();
  if (!client) return [];

  const { data, error } = await client.from('hotels').select('*, hotel_rooms(*)');
  if (error) throw error;

  const hotelRows: Row[] = [];
  const roomRows: Row[] = [];
  for (const raw of (data ?? []) as Row[]) {
    const rooms = (raw.hotel_rooms as Row[] | undefined) ?? [];
    const { hotel_rooms: _rooms, ...hotel } = raw;
    void _rooms;
    hotelRows.push(hotel);
    roomRows.push(...rooms);
  }

  return assembleHotels(hotelRows, roomRows) as unknown as Hotel[];
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

export async function getProducts(): Promise<Product[]> {
  const client = supabase();
  if (!client) return [];

  const { data, error } = await client.from('products').select('*, product_photos(*)');
  if (error) throw error;

  const baseRows: Row[] = [];
  const linkRows: Row[] = [];
  for (const raw of (data ?? []) as Row[]) {
    const links = (raw.product_photos as Row[] | undefined) ?? [];
    const { product_photos: _links, ...base } = raw;
    void _links;
    baseRows.push(base);
    linkRows.push(...links);
  }

  return assembleProducts(baseRows, linkRows) as unknown as Product[];
}

export async function syncProducts(rows: Row[], options: SyncTableOptions = {}): Promise<SyncTableResult> {
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

export async function getAttractions(): Promise<Attraction[]> {
  const client = supabase();
  if (!client) return [];

  const { data, error } = await client.from('attractions').select('*, attraction_photos(*)');
  if (error) throw error;

  const baseRows: Row[] = [];
  const linkRows: Row[] = [];
  for (const raw of (data ?? []) as Row[]) {
    const links = (raw.attraction_photos as Row[] | undefined) ?? [];
    const { attraction_photos: _links, ...base } = raw;
    void _links;
    baseRows.push(base);
    linkRows.push(...links);
  }

  return assembleAttractions(baseRows, linkRows) as unknown as Attraction[];
}

export async function syncAttractions(rows: Row[], options: SyncTableOptions = {}): Promise<SyncTableResult> {
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

export async function syncHotels(rows: Row[], options: SyncTableOptions = {}): Promise<SyncTableResult> {
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

export async function getBookings(): Promise<Booking[]> {
  const client = supabase();
  if (!client) return [];

  const { data, error } = await client
    .from('bookings')
    .select('*, booking_itinerary(*, booking_activities(*))');
  if (error) throw error;

  const bookingRows: Row[] = [];
  const itineraryRows: Row[] = [];
  const activityRows: Row[] = [];

  for (const raw of (data ?? []) as Row[]) {
    const days = (raw.booking_itinerary as Row[] | undefined) ?? [];
    const { booking_itinerary: _itin, ...booking } = raw;
    void _itin;
    bookingRows.push(booking);

    for (const day of days) {
      const activities = (day.booking_activities as Row[] | undefined) ?? [];
      const { booking_activities: _acts, ...itin } = day;
      void _acts;
      itineraryRows.push(itin);
      activityRows.push(...activities);
    }
  }

  return assembleBookings(bookingRows, itineraryRows, activityRows);
}
