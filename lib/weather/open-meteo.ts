import type { WeatherDestinationCoord } from './coordinates';
import { toTravelRating } from './rating';
import type { WeatherForecastCacheRow } from './types';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const CACHE_TTL_HOURS = 24;
/** Parallel per-destination fetches when batch parse fails. */
const FALLBACK_CONCURRENCY = 5;

type OpenMeteoDaily = {
  time: string[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_sum: (number | null)[];
  weathercode: (number | null)[];
  windspeed_10m_max: (number | null)[];
};

type OpenMeteoLocation = {
  latitude?: number;
  longitude?: number;
  daily?: OpenMeteoDaily;
};

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;
  daily?: OpenMeteoDaily;
  /** Multi-location batch responses use numeric string keys */
  [key: string]: unknown;
};

function buildForecastUrl(destinations: WeatherDestinationCoord[]): string {
  const lats = destinations.map((d) => d.latitude).join(',');
  const lngs = destinations.map((d) => d.longitude).join(',');
  const elevations = destinations.some((d) => d.elevationM != null)
    ? destinations.map((d) => d.elevationM ?? '').join(',')
    : null;

  const params = new URLSearchParams({
    latitude: lats,
    longitude: lngs,
    daily:
      'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max',
    timezone: TIMEZONE,
    forecast_days: '7',
  });
  if (elevations) params.set('elevation', elevations);

  return `${OPEN_METEO_URL}?${params.toString()}`;
}

function parseLocationDaily(
  dest: WeatherDestinationCoord,
  daily: OpenMeteoDaily,
  fetchedAt: Date
): WeatherForecastCacheRow[] {
  const expiresAt = new Date(fetchedAt.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000);
  const rows: WeatherForecastCacheRow[] = [];

  for (let i = 0; i < daily.time.length; i++) {
    const tempMax = daily.temperature_2m_max[i] ?? 0;
    const tempMin = daily.temperature_2m_min[i] ?? tempMax;
    const precip = daily.precipitation_sum[i] ?? 0;
    const code = daily.weathercode[i] ?? 0;
    const wind = daily.windspeed_10m_max[i];

    rows.push({
      destination_id: dest.id,
      forecast_date: daily.time[i],
      temp_min_c: tempMin,
      temp_max_c: tempMax,
      precip_mm: precip,
      wind_kmh: wind,
      weather_code: code,
      travel_rating: toTravelRating(code, precip, tempMax, tempMin),
      fetched_at: fetchedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  }

  return rows;
}

function isDaily(value: unknown): value is OpenMeteoDaily {
  if (!value || typeof value !== 'object') return false;
  const d = value as OpenMeteoDaily;
  return Array.isArray(d.time) && Array.isArray(d.temperature_2m_max);
}

function extractLocations(json: unknown): OpenMeteoLocation[] {
  if (Array.isArray(json)) {
    return json as OpenMeteoLocation[];
  }

  if (!json || typeof json !== 'object') return [];

  const obj = json as OpenMeteoResponse;

  if (isDaily(obj.daily)) {
    return [{ daily: obj.daily, latitude: obj.latitude, longitude: obj.longitude }];
  }

  const numericKeys = Object.keys(obj)
    .filter((k) => /^\d+$/.test(k))
    .sort((a, b) => Number(a) - Number(b));

  if (numericKeys.length > 0) {
    return numericKeys.map((key) => obj[key] as OpenMeteoLocation);
  }

  return [];
}

/** Normalize Open-Meteo response — single or multi-location array / keyed object. */
export function parseOpenMeteoResponse(
  json: unknown,
  destinations: WeatherDestinationCoord[],
  fetchedAt: Date = new Date()
): WeatherForecastCacheRow[] {
  const locations = extractLocations(json);
  const rows: WeatherForecastCacheRow[] = [];

  locations.forEach((loc, idx) => {
    const dest = destinations[idx];
    if (dest && isDaily(loc?.daily)) {
      rows.push(...parseLocationDaily(dest, loc.daily, fetchedAt));
    }
  });

  return rows;
}

async function fetchOneDestination(
  dest: WeatherDestinationCoord,
  fetchedAt: Date
): Promise<WeatherForecastCacheRow[]> {
  const url = buildForecastUrl([dest]);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Open-Meteo HTTP ${res.status} for ${dest.id}`);
  }
  const json = await res.json();
  return parseOpenMeteoResponse(json, [dest], fetchedAt);
}

/** Run async work over items with limited concurrency. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function run(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

export async function fetchWeeklyForecastFromApi(
  destinations: WeatherDestinationCoord[]
): Promise<WeatherForecastCacheRow[]> {
  if (!destinations.length) return [];

  const fetchedAt = new Date();

  try {
    const url = buildForecastUrl(destinations);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }

    const json = await res.json();
    const rows = parseOpenMeteoResponse(json, destinations, fetchedAt);
    // Expect at least one day per destination
    if (rows.length >= destinations.length) return rows;
  } catch {
    /* fall through to parallel per-destination fetch */
  }

  const chunks = await mapPool(destinations, FALLBACK_CONCURRENCY, (dest) =>
    fetchOneDestination(dest, fetchedAt)
  );
  return chunks.flat();
}
