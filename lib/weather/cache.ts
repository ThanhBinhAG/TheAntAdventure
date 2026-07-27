import 'server-only';
import { WEATHER_DESTINATIONS, getDestinationsByRegion } from './coordinates';
import { getWeatherAdminClient } from './supabase-admin';
import type {
  TravelRating,
  WeatherForecastCacheRow,
  WeeklyDestinationForecast,
  WeeklyWeatherResponse,
} from './types';

const destMeta = new Map(WEATHER_DESTINATIONS.map((d) => [d.id, d]));

const TIMEZONE = 'Asia/Ho_Chi_Minh';
const FORECAST_WINDOW_DAYS = 7;

/** Calendar date YYYY-MM-DD in Vietnam time. */
export function getTodayVnDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isWeatherCacheConfigured(): boolean {
  return getWeatherAdminClient() !== null;
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

export async function upsertWeeklyCache(rows: WeatherForecastCacheRow[]): Promise<number> {
  const client = getWeatherAdminClient();
  if (!client) throw new Error('Supabase service role not configured');

  const { error } = await client.from('weather_forecast_cache').upsert(rows, {
    onConflict: 'destination_id,forecast_date',
  });
  if (error) throw new Error(`Cache upsert failed: ${error.message}`);
  return rows.length;
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

export async function readWeeklyCache(region?: string | null): Promise<WeeklyWeatherResponse> {
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

export async function ensureDestinationsSeeded(): Promise<void> {
  const client = getWeatherAdminClient();
  if (!client) return;

  const rows = WEATHER_DESTINATIONS.map((d) => ({
    id: d.id,
    name: d.name,
    region: d.region,
    emoji: d.emoji,
    latitude: d.latitude,
    longitude: d.longitude,
    elevation_m: d.elevationM ?? null,
    sort_order: d.sortOrder,
    active: true,
  }));

  await client.from('weather_destinations').upsert(rows, { onConflict: 'id' });
}
