import 'server-only';
import { withPhotoCacheBust } from '@/lib/gallery/gallery-helpers';
import { FEATURED_WEEKLY_IDS, WEATHER_DESTINATIONS, type WeatherRegion } from './coordinates';
import { getWeatherAdminClient } from './supabase-admin';
import type { WeatherDestinationMeta } from './types';

export type DestinationInput = {
  id?: string;
  name: string;
  region: WeatherRegion;
  emoji?: string | null;
  latitude: number;
  longitude: number;
  elevationM?: number | null;
  sortOrder?: number;
  description?: string | null;
  notes?: string | null;
  coverPhotoId?: string | null;
  isFeatured?: boolean;
};

type DestRow = {
  id: string;
  name: string;
  region: WeatherRegion;
  emoji: string | null;
  latitude: number;
  longitude: number;
  elevation_m: number | null;
  sort_order: number;
  description?: string | null;
  notes?: string | null;
  cover_photo_id?: string | null;
  is_featured?: boolean | null;
  active: boolean;
};

function slugifyId(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 32);
  return base || `dest${Date.now().toString(36)}`;
}

const SELECT_BASE =
  'id, name, region, emoji, latitude, longitude, elevation_m, sort_order, active';
const SELECT_FULL =
  'id, name, region, emoji, latitude, longitude, elevation_m, sort_order, description, notes, cover_photo_id, is_featured, active';

function isMissingColumnError(message: string): boolean {
  return /cover_photo_id|is_featured|description|notes|schema cache/i.test(message);
}

function thumbUrlFromDisplay(displayUrl: string | null | undefined): string | null {
  if (!displayUrl) return null;
  const base = displayUrl.split('?')[0] ?? displayUrl;
  if (!base.endsWith('/display.webp')) return null;
  return `${base.slice(0, -'/display.webp'.length)}thumb.webp`;
}

function mapRow(
  row: DestRow,
  photo?: { url: string | null; thumb_url: string | null; display_bytes?: number | null } | null,
  featuredFallback?: boolean
): WeatherDestinationMeta {
  const featuredIds = new Set<string>(FEATURED_WEEKLY_IDS);
  const cacheVersion = photo?.display_bytes ?? row.cover_photo_id ?? null;
  const coverUrl = photo?.url ? withPhotoCacheBust(photo.url, cacheVersion) : null;
  const thumbPath = photo?.thumb_url ?? thumbUrlFromDisplay(photo?.url);
  const coverThumbUrl = thumbPath ? withPhotoCacheBust(thumbPath, cacheVersion) : null;
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    emoji: row.emoji,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    elevationM: row.elevation_m != null ? Number(row.elevation_m) : null,
    sortOrder: row.sort_order ?? 0,
    description: row.description ?? null,
    notes: row.notes ?? null,
    coverPhotoId: row.cover_photo_id ?? null,
    coverUrl,
    coverThumbUrl,
    isFeatured:
      row.is_featured != null
        ? Boolean(row.is_featured)
        : featuredFallback ?? featuredIds.has(row.id),
    active: row.active !== false,
  };
}

async function attachCoverPhotos(rows: DestRow[]): Promise<WeatherDestinationMeta[]> {
  const client = getWeatherAdminClient();
  const ids = [...new Set(rows.map((r) => r.cover_photo_id).filter(Boolean))] as string[];
  const byId = new Map<string, { url: string | null; thumb_url: string | null; display_bytes: number | null }>();

  if (client && ids.length) {
    const { data } = await client.from('photos').select('id, url, thumb_url, display_bytes').in('id', ids);
    for (const p of data ?? []) {
      byId.set(p.id as string, {
        url: p.url as string | null,
        thumb_url: p.thumb_url as string | null,
        display_bytes: p.display_bytes != null ? Number(p.display_bytes) : null,
      });
    }
  }

  return rows.map((row) => mapRow(row, row.cover_photo_id ? byId.get(row.cover_photo_id) : null));
}

export async function listDestinations(options?: {
  activeOnly?: boolean;
}): Promise<WeatherDestinationMeta[]> {
  const client = getWeatherAdminClient();
  if (!client) return [];

  const run = async (cols: string) => {
    let query = client
      .from('weather_destinations')
      .select(cols)
      .order('sort_order', { ascending: true });
    if (options?.activeOnly !== false) {
      query = query.eq('active', true);
    }
    return query;
  };

  let { data, error } = await run(SELECT_FULL);
  let usedFallback = false;
  if (error && isMissingColumnError(error.message)) {
    usedFallback = true;
    ({ data, error } = await run(SELECT_BASE));
  }
  if (error) throw new Error(`List destinations failed: ${error.message}`);

  const rows = (data ?? []) as unknown as DestRow[];
  const mapped = await attachCoverPhotos(rows);
  if (!usedFallback) return mapped;
  return mapped.map((m) => ({
    ...m,
    isFeatured: (FEATURED_WEEKLY_IDS as readonly string[]).includes(m.id) || m.isFeatured,
  }));
}

export async function getDestinationById(id: string): Promise<WeatherDestinationMeta | null> {
  const client = getWeatherAdminClient();
  if (!client) return null;

  let { data, error } = await client
    .from('weather_destinations')
    .select(SELECT_FULL)
    .eq('id', id)
    .maybeSingle();

  if (error && isMissingColumnError(error.message)) {
    ({ data, error } = await client
      .from('weather_destinations')
      .select(SELECT_BASE)
      .eq('id', id)
      .maybeSingle());
  }

  if (error) throw new Error(`Get destination failed: ${error.message}`);
  if (!data) return null;
  const [mapped] = await attachCoverPhotos([data as unknown as DestRow]);
  if (!mapped) return null;
  if (mapped.isFeatured) return mapped;
  if ((FEATURED_WEEKLY_IDS as readonly string[]).includes(mapped.id)) {
    return { ...mapped, isFeatured: true };
  }
  return mapped;
}

export async function listFeaturedDestinations(): Promise<WeatherDestinationMeta[]> {
  const all = await listDestinations({ activeOnly: true });
  const featured = all.filter((d) => d.isFeatured);
  if (featured.length) return featured;
  // Fallback to seed featured ids if DB not flagged yet
  return all.filter((d) => (FEATURED_WEEKLY_IDS as readonly string[]).includes(d.id));
}

export function validateCoords(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return 'Latitude must be between -90 and 90.';
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return 'Longitude must be between -180 and 180.';
  return null;
}

export async function createDestination(input: DestinationInput): Promise<WeatherDestinationMeta> {
  const client = getWeatherAdminClient();
  if (!client) throw new Error('Supabase service role not configured');

  const name = input.name.trim();
  if (!name) throw new Error('Name is required.');

  const coordErr = validateCoords(input.latitude, input.longitude);
  if (coordErr) throw new Error(coordErr);

  const id = (input.id?.trim() || slugifyId(name)).toLowerCase();

  const { data: byId } = await client
    .from('weather_destinations')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (byId) throw new Error(`Destination id "${id}" already exists.`);

  const { data: byName } = await client
    .from('weather_destinations')
    .select('id')
    .ilike('name', name)
    .eq('active', true)
    .limit(1);
  if (byName?.length) throw new Error(`Destination "${name}" already exists.`);

  await assertCanSetFeatured({ wantFeatured: Boolean(input.isFeatured) });

  const { data: maxSort } = await client
    .from('weather_destinations')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const sortOrder = input.sortOrder ?? ((maxSort?.[0]?.sort_order as number | undefined) ?? 0) + 1;

  const row = {
    id,
    name,
    region: input.region,
    emoji: input.emoji ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    elevation_m: input.elevationM ?? null,
    sort_order: sortOrder,
    description: input.description?.trim() || null,
    notes: input.notes?.trim() || null,
    cover_photo_id: input.coverPhotoId?.trim() || null,
    is_featured: Boolean(input.isFeatured),
    active: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('weather_destinations').insert(row);
  if (error) throw new Error(`Create destination failed: ${error.message}`);

  const created = await getDestinationById(id);
  if (!created) throw new Error('Create destination failed: row missing after insert.');
  return created;
}

export async function updateDestination(
  id: string,
  patch: Partial<DestinationInput> & { active?: boolean }
): Promise<WeatherDestinationMeta> {
  const client = getWeatherAdminClient();
  if (!client) throw new Error('Supabase service role not configured');

  const existing = await getDestinationById(id);
  if (!existing) throw new Error('Destination not found.');

  if (patch.name != null) {
    const name = patch.name.trim();
    if (!name) throw new Error('Name is required.');
    const { data: dupes } = await client
      .from('weather_destinations')
      .select('id')
      .ilike('name', name)
      .neq('id', id)
      .eq('active', true)
      .limit(1);
    if (dupes?.length) throw new Error(`Destination "${name}" already exists.`);
  }

  const lat = patch.latitude ?? existing.latitude;
  const lng = patch.longitude ?? existing.longitude;
  const coordErr = validateCoords(lat, lng);
  if (coordErr) throw new Error(coordErr);

  if (patch.isFeatured === true && !existing.isFeatured) {
    await assertCanSetFeatured({ wantFeatured: true, excludeId: id });
  }

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) row.name = patch.name.trim();
  if (patch.region != null) row.region = patch.region;
  if (patch.emoji !== undefined) row.emoji = patch.emoji;
  if (patch.latitude != null) row.latitude = patch.latitude;
  if (patch.longitude != null) row.longitude = patch.longitude;
  if (patch.elevationM !== undefined) row.elevation_m = patch.elevationM;
  if (patch.sortOrder != null) row.sort_order = patch.sortOrder;
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (patch.notes !== undefined) row.notes = patch.notes?.trim() || null;
  if (patch.coverPhotoId !== undefined) row.cover_photo_id = patch.coverPhotoId?.trim() || null;
  if (patch.isFeatured !== undefined) row.is_featured = patch.isFeatured;
  if (patch.active !== undefined) row.active = patch.active;

  const { error } = await client.from('weather_destinations').update(row).eq('id', id);
  if (error) throw new Error(`Update destination failed: ${error.message}`);

  const updated = await getDestinationById(id);
  if (!updated) throw new Error('Update destination failed: row missing.');
  return updated;
}

export async function softDeleteDestination(id: string): Promise<void> {
  await updateDestination(id, { active: false, isFeatured: false });
}

const MAX_FEATURED = 2;

async function countFeaturedExcluding(excludeId?: string): Promise<number> {
  const all = await listDestinations({ activeOnly: true });
  return all.filter((d) => d.isFeatured && d.id !== excludeId).length;
}

/** Replace featured set — at most 2 ids. Clears is_featured on everyone else. */
export async function setFeaturedDestinationIds(ids: string[]): Promise<WeatherDestinationMeta[]> {
  const client = getWeatherAdminClient();
  if (!client) throw new Error('Supabase service role not configured');

  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length > MAX_FEATURED) {
    throw new Error(`Chỉ được chọn tối đa ${MAX_FEATURED} điểm nổi bật.`);
  }
  if (unique.length < 1) {
    throw new Error('Cần ít nhất 1 điểm nổi bật.');
  }

  for (const id of unique) {
    const row = await getDestinationById(id);
    if (!row || !row.active) throw new Error(`Destination "${id}" not found.`);
  }

  const { error: clearErr } = await client
    .from('weather_destinations')
    .update({ is_featured: false, updated_at: new Date().toISOString() })
    .eq('is_featured', true);
  if (clearErr) {
    if (isMissingColumnError(clearErr.message)) {
      throw new Error(
        'Cột is_featured chưa có trên database. Chạy migration weather-destinations-redesign.'
      );
    }
    throw new Error(`Clear featured failed: ${clearErr.message}`);
  }

  for (const id of unique) {
    const { error } = await client
      .from('weather_destinations')
      .update({ is_featured: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Set featured ${id} failed: ${error.message}`);
  }

  return listDestinations({ activeOnly: true });
}

export async function assertCanSetFeatured(options: {
  wantFeatured: boolean;
  excludeId?: string;
}): Promise<void> {
  if (!options.wantFeatured) return;
  const count = await countFeaturedExcluding(options.excludeId);
  if (count >= MAX_FEATURED) {
    throw new Error(
      'Đã có 2 điểm nổi bật. Dùng “Chỉnh 2 điểm nổi bật” trên trang Weather để đổi slot.'
    );
  }
}

type SeedExisting = {
  id: string;
  description?: string | null;
  notes?: string | null;
  cover_photo_id?: string | null;
  is_featured?: boolean | null;
};

/** In-process memo — same Node process seeds at most once (retries after failure). */
let seedPromise: Promise<void> | null = null;

/**
 * Seed / upsert catalog from coordinates.ts (preserves cover/description if already set).
 * One select + one upsert batch instead of per-row round-trips.
 */
export async function ensureDestinationsSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = seedDestinationsOnce().catch((err) => {
    seedPromise = null;
    throw err;
  });
  return seedPromise;
}

async function seedDestinationsOnce(): Promise<void> {
  const client = getWeatherAdminClient();
  if (!client) return;

  const featured = new Set<string>(FEATURED_WEEKLY_IDS);
  const seedIds = WEATHER_DESTINATIONS.map((d) => d.id);
  const updatedAt = new Date().toISOString();

  const byId = new Map<string, SeedExisting>();
  const fullSelect = await client
    .from('weather_destinations')
    .select('id, description, notes, cover_photo_id, is_featured')
    .in('id', seedIds);

  if (!fullSelect.error && fullSelect.data) {
    for (const row of fullSelect.data as SeedExisting[]) {
      byId.set(row.id, row);
    }
  } else if (fullSelect.error && !isMissingColumnError(fullSelect.error.message)) {
    // Non-schema errors: still attempt upsert with defaults (empty map).
  } else if (fullSelect.error && isMissingColumnError(fullSelect.error.message)) {
    const baseSelect = await client.from('weather_destinations').select('id').in('id', seedIds);
    if (!baseSelect.error && baseSelect.data) {
      for (const row of baseSelect.data as { id: string }[]) {
        byId.set(row.id, { id: row.id });
      }
    }
  }

  const fullRows = WEATHER_DESTINATIONS.map((d) => {
    const existing = byId.get(d.id);
    return {
      id: d.id,
      name: d.name,
      region: d.region,
      emoji: d.emoji,
      latitude: d.latitude,
      longitude: d.longitude,
      elevation_m: d.elevationM ?? null,
      sort_order: d.sortOrder,
      active: true,
      updated_at: updatedAt,
      is_featured: existing?.is_featured ?? featured.has(d.id),
      description: existing?.description ?? null,
      notes: existing?.notes ?? null,
      cover_photo_id: existing?.cover_photo_id ?? null,
    };
  });

  const { error: fullErr } = await client
    .from('weather_destinations')
    .upsert(fullRows, { onConflict: 'id' });

  if (!fullErr) return;

  if (!isMissingColumnError(fullErr.message)) {
    throw new Error(`Seed destinations failed: ${fullErr.message}`);
  }

  const baseRows = WEATHER_DESTINATIONS.map((d) => ({
    id: d.id,
    name: d.name,
    region: d.region,
    emoji: d.emoji,
    latitude: d.latitude,
    longitude: d.longitude,
    elevation_m: d.elevationM ?? null,
    sort_order: d.sortOrder,
    active: true,
    updated_at: updatedAt,
  }));

  const { error: baseErr } = await client
    .from('weather_destinations')
    .upsert(baseRows, { onConflict: 'id' });
  if (baseErr) throw new Error(`Seed destinations failed: ${baseErr.message}`);
}

export function metaToCoord(meta: WeatherDestinationMeta) {
  return {
    id: meta.id,
    name: meta.name,
    region: meta.region,
    emoji: meta.emoji ?? '',
    latitude: meta.latitude,
    longitude: meta.longitude,
    elevationM: meta.elevationM ?? undefined,
    sortOrder: meta.sortOrder,
  };
}
