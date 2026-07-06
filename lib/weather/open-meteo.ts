import type { WeatherDestinationCoord } from './coordinates';
import { toTravelRating } from './rating';
import type { WeatherForecastCacheRow } from './types';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const CACHE_TTL_HOURS = 24;

type OpenMeteoDaily = {
  time: string[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_sum: (number | null)[];
  weathercode: (number | null)[];
  windspeed_10m_max: (number | null)[];
};

type OpenMeteoLocation = {
  latitude: number;
  longitude: number;
  daily: OpenMeteoDaily;
};

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;
  daily?: OpenMeteoDaily;
  /** Multi-location batch responses */
  0?: OpenMeteoLocation;
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
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max',
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

/** Normalize Open-Meteo response — single or multi-location array. */
export function parseOpenMeteoResponse(
  json: OpenMeteoResponse,
  destinations: WeatherDestinationCoord[],
  fetchedAt: Date = new Date()
): WeatherForecastCacheRow[] {
  const rows: WeatherForecastCacheRow[] = [];

  if (Array.isArray(json)) {
    (json as OpenMeteoLocation[]).forEach((loc, idx) => {
      const dest = destinations[idx];
      if (dest && loc?.daily) rows.push(...parseLocationDaily(dest, loc.daily, fetchedAt));
    });
    return rows;
  }

  if (json.daily && destinations.length === 1) {
    rows.push(...parseLocationDaily(destinations[0], json.daily, fetchedAt));
    return rows;
  }

  const keys = Object.keys(json).filter((k) => /^\d+$/.test(k));
  if (keys.length > 0) {
    keys.sort((a, b) => Number(a) - Number(b)).forEach((key, idx) => {
      const loc = json[key] as OpenMeteoLocation;
      const dest = destinations[idx];
      if (dest && loc?.daily) rows.push(...parseLocationDaily(dest, loc.daily, fetchedAt));
    });
    return rows;
  }

  return rows;
}

export async function fetchWeeklyForecastFromApi(
  destinations: WeatherDestinationCoord[]
): Promise<WeatherForecastCacheRow[]> {
  if (!destinations.length) return [];

  try {
    const url = buildForecastUrl(destinations);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }

    const json = await res.json();
    const fetchedAt = new Date();
    const rows = Array.isArray(json)
      ? parseOpenMeteoResponse(json as unknown as OpenMeteoResponse, destinations, fetchedAt)
      : parseOpenMeteoResponse(json as OpenMeteoResponse, destinations, fetchedAt);

    if (rows.length >= destinations.length) return rows;
  } catch {
    /* fall through to per-destination fetch */
  }

  const fetchedAt = new Date();
  const allRows: WeatherForecastCacheRow[] = [];
  for (const dest of destinations) {
    const url = buildForecastUrl([dest]);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status} for ${dest.id}`);
    }
    const json = (await res.json()) as OpenMeteoResponse;
    allRows.push(...parseOpenMeteoResponse(json, [dest], fetchedAt));
  }
  return allRows;
}
