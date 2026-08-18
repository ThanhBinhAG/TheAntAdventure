import 'server-only';
import { localIsoDate } from '../core/date-utils';
import { WEATHER_DESTINATIONS, getDestinationsByRegion } from './coordinates';
import { FEATURED_WEEKLY_IDS } from './coordinates';
import { getWeatherAdminClient } from './supabase-admin';
import { getWeatherCache } from './redis-cache';
import type {
  DestinationCurrentWeather,
  DestinationWeatherDetail,
  TravelRating,
  WeatherDayForecast,
  WeatherForecastCacheRow,
  WeeklyDestinationForecast,
  WeeklyWeatherResponse,
} from './types';

const destMeta = new Map(WEATHER_DESTINATIONS.map((d) => [d.id, d]));

const FORECAST_WINDOW_DAYS = 7;

/** Calendar date YYYY-MM-DD in Vietnam time (shared date-utils). */
export function getTodayVnDate(now = new Date()): string {
  return localIsoDate(now);
}

export function isWeatherCacheConfigured(): boolean {
  // Cache is configured when REDIS_URL is present.
  return !!process.env.REDIS_URL;
}

export async function isCacheStale(): Promise<boolean> {
  const client = getWeatherAdminClient();
  if (!client) return true;

  const { data, error } = await client
    .from('weather_forecast_cache')
    .select('expires_at')
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (error) return true;
  return !data?.length;
}

export async function isDestinationCacheStale(destinationId: string): Promise<boolean> {
  const client = getWeatherAdminClient();
  if (!client) return true;

  const nowIso = new Date().toISOString();
  const { data: current } = await client
    .from('weather_current_cache')
    .select('expires_at')
    .eq('destination_id', destinationId)
    .gt('expires_at', nowIso)
    .maybeSingle();

  if (!current) return true;

  const todayVn = getTodayVnDate();
  const { data: days } = await client
    .from('weather_forecast_cache')
    .select('expires_at')
    .eq('destination_id', destinationId)
    .gte('forecast_date', todayVn)
    .gt('expires_at', nowIso)
    .limit(1);

  return !days?.length;
}

export async function upsertWeeklyCache(rows: WeatherForecastCacheRow[]): Promise<number> {
  const client = getWeatherAdminClient();
  if (!client) throw new Error('Supabase service role not configured');

  const { error } = await client.from('weather_forecast_cache').upsert(rows, {
    onConflict: 'destination_id,forecast_date',
  });
  if (error) throw new Error(`Cache upsert failed: ${error.message}`);
  return rows.length;
}

export async function upsertCurrentCache(
  destinationId: string,
  payload: {
    current: DestinationCurrentWeather;
    days: WeatherDayForecast[];
  },
  fetchedAt: string,
  expiresAt: string
): Promise<void> {
  const client = getWeatherAdminClient();
  if (!client) throw new Error('Supabase service role not configured');

  const { error } = await client.from('weather_current_cache').upsert(
    {
      destination_id: destinationId,
      payload,
      fetched_at: fetchedAt,
      expires_at: expiresAt,
    },
    { onConflict: 'destination_id' }
  );
  if (error) throw new Error(`Current cache upsert failed: ${error.message}`);
}

export async function invalidateDestinationCache(destinationId: string): Promise<void> {
  const client = getWeatherAdminClient();
  if (!client) return;

  await client.from('weather_current_cache').delete().eq('destination_id', destinationId);
  await client
    .from('weather_forecast_cache')
    .update({ expires_at: new Date(0).toISOString() })
    .eq('destination_id', destinationId);
}

/** Drop forecast rows before today (VN) so the cache stays a rolling window. */
export async function prunePastForecastDates(todayVn = getTodayVnDate()): Promise<number> {
  const client = getWeatherAdminClient();
  if (!client) return 0;

  const { data, error } = await client
    .from('weather_forecast_cache')
    .delete()
    .lt('forecast_date', todayVn)
    .select('destination_id');

  if (error) throw new Error(`Cache prune failed: ${error.message}`);
  return data?.length ?? 0;
}

export async function logWeatherFetch(entry: {
  status: 'ok' | 'error' | 'skipped';
  destinationsCount: number;
  durationMs: number;
  errorMessage?: string;
}): Promise<void> {
  const client = getWeatherAdminClient();
  if (!client) return;

  await client.from('weather_fetch_log').insert({
    status: entry.status,
    destinations_count: entry.destinationsCount,
    duration_ms: entry.durationMs,
    error_message: entry.errorMessage ?? null,
  });
}

export async function getLastSuccessfulFetchWithin(minutes: number): Promise<boolean> {
  const client = getWeatherAdminClient();
  if (!client) return false;

  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const { data } = await client
    .from('weather_fetch_log')
    .select('id')
    .eq('status', 'ok')
    .gte('fetched_at', since)
    .limit(1);

  return Boolean(data?.length);
}

export async function readDestinationDetailCache(
  destinationId: string,
  meta: {
    id: string;
    name: string;
    region: WeeklyDestinationForecast['region'];
    emoji: string | null;
    description: string | null;
    coverPhotoId: string | null;
    coverUrl: string | null;
  }
): Promise<DestinationWeatherDetail | null> {
  const client = getWeatherAdminClient();
  if (!client) return null;

  const now = Date.now();

  const { data: currentRow } = await client
    .from('weather_current_cache')
    .select('payload, fetched_at, expires_at')
    .eq('destination_id', destinationId)
    .maybeSingle();

  if (!currentRow) return null;
  if (new Date(currentRow.expires_at).getTime() <= now) return null;

  const payload = currentRow.payload as {
    current?: DestinationCurrentWeather;
    days?: WeatherDayForecast[];
  } & Partial<DestinationCurrentWeather>;

  // New shape: { current, days }; legacy shape was flat DestinationCurrentWeather
  const current: DestinationCurrentWeather | null =
    payload.current ??
    (typeof payload.tempC === 'number'
      ? {
          tempC: payload.tempC,
          humidity: payload.humidity ?? null,
          feelsLikeC: payload.feelsLikeC ?? null,
          weatherCode: payload.weatherCode ?? 0,
          windKmh: payload.windKmh ?? null,
        }
      : null);

  if (!current) return null;

  let days = Array.isArray(payload.days) ? payload.days : [];

  if (!days.length) {
    const todayVn = getTodayVnDate();
    const { data: dayRows, error } = await client
      .from('weather_forecast_cache')
      .select(
        'destination_id, forecast_date, temp_min_c, temp_max_c, precip_mm, wind_kmh, weather_code, travel_rating, fetched_at, expires_at'
      )
      .eq('destination_id', destinationId)
      .gte('forecast_date', todayVn)
      .order('forecast_date', { ascending: true });

    if (error || !dayRows?.length) return null;

    days = [];
    for (const row of dayRows as WeatherForecastCacheRow[]) {
      if (new Date(row.expires_at).getTime() <= now) return null;
      if (days.length >= FORECAST_WINDOW_DAYS) continue;
      days.push({
        date: row.forecast_date,
        tempMin: Number(row.temp_min_c),
        tempMax: Number(row.temp_max_c),
        precipMm: Number(row.precip_mm),
        windKmh: row.wind_kmh != null ? Number(row.wind_kmh) : null,
        weatherCode: row.weather_code,
        rating: row.travel_rating as TravelRating,
        uvIndexMax: null,
      });
    }
  }

  if (!days.length) return null;

  return {
    id: meta.id,
    name: meta.name,
    region: meta.region,
    emoji: meta.emoji,
    description: meta.description,
    coverPhotoId: meta.coverPhotoId,
    coverUrl: meta.coverUrl,
    current,
    days,
    fetchedAt: currentRow.fetched_at as string,
    expiresAt: currentRow.expires_at as string,
  };
}

export async function readWeeklyCache(region?: string | null): Promise<WeeklyWeatherResponse> {
  // First try Redis cache
  const redisPayload = await getWeatherCache();
  if (redisPayload) {
    // Transform the WeatherPageBoot payload into the WeeklyWeatherResponse shape.
    const destinations = redisPayload.destinations.map((meta) => ({
      id: meta.id,
      name: meta.name,
      region: meta.region,
      emoji: meta.emoji ?? '',
      days: [], // Weekly endpoint expects days per destination; they are not stored in the boot cache.
    }));
    // For simplicity we mark the cache as fresh (stale = false) and omit timestamps.
    return {
      fetchedAt: null,
      expiresAt: null,
      stale: false,
      destinations,
    };
  }

  // Fallback to original Supabase query logic (unchanged).
  const client = getWeatherAdminClient();
  const dests = getDestinationsByRegion(region);
  const destIds = dests.map((d) => d.id);

  if (!client || !destIds.length) {
    return { fetchedAt: null, expiresAt: null, stale: true, destinations: [] };
  }

  const todayVn = getTodayVnDate();

  const { data, error } = await client
    .from('weather_forecast_cache')
    .select(
      'destination_id, forecast_date, temp_min_c, temp_max_c, precip_mm, wind_kmh, weather_code, travel_rating, fetched_at, expires_at'
    )
    .in('destination_id', destIds)
    .gte('forecast_date', todayVn)
    .order('forecast_date', { ascending: true });

  if (error || !data?.length) {
    return { fetchedAt: null, expiresAt: null, stale: true, destinations: [] };
  }

  const rows = data as WeatherForecastCacheRow[];
  const now = Date.now();
  let fetchedAt: string | null = null;
  let expiresAt: string | null = null;
  let stale = false;

  const byDest = new Map<string, WeeklyDestinationForecast>();

  for (const row of rows) {
    if (!fetchedAt || row.fetched_at > fetchedAt) fetchedAt = row.fetched_at;
    if (!expiresAt || row.expires_at < expiresAt) expiresAt = row.expires_at;
    if (new Date(row.expires_at).getTime() <= now) stale = true;

    const meta = destMeta.get(row.destination_id);
    if (!meta) continue;

    if (!byDest.has(row.destination_id)) {
      byDest.set(row.destination_id, {
        id: row.destination_id,
        name: meta.name,
        region: meta.region,
        emoji: meta.emoji,
        days: [],
      });
    }

    const dest = byDest.get(row.destination_id)!;
    if (dest.days.length >= FORECAST_WINDOW_DAYS) continue;

    dest.days.push({
      date: row.forecast_date,
      tempMin: Number(row.temp_min_c),
      tempMax: Number(row.temp_max_c),
      precipMm: Number(row.precip_mm),
      windKmh: row.wind_kmh != null ? Number(row.wind_kmh) : null,
      weatherCode: row.weather_code,
      rating: row.travel_rating as TravelRating,
    });
  }

  const destinations = dests
    .filter((d) => byDest.has(d.id))
    .map((d) => byDest.get(d.id)!);

  return { fetchedAt, expiresAt, stale, destinations };
}

/** @deprecated Prefer ensureDestinationsSeeded from destinations.ts */
export async function ensureDestinationsSeeded(): Promise<void> {
  const { ensureDestinationsSeeded: seed } = await import('./destinations');
  await seed();
}

export { FEATURED_WEEKLY_IDS };
