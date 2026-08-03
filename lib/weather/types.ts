import type { WeatherRegion } from './coordinates';

export type TravelRating = 'E' | 'G' | 'F' | 'P';

export type WeatherForecastCacheRow = {
  destination_id: string;
  forecast_date: string;
  temp_min_c: number;
  temp_max_c: number;
  precip_mm: number;
  wind_kmh: number | null;
  weather_code: number;
  travel_rating: TravelRating;
  fetched_at: string;
  expires_at: string;
};

export type WeatherDayForecast = {
  date: string;
  tempMin: number;
  tempMax: number;
  precipMm: number;
  windKmh: number | null;
  weatherCode: number;
  rating: TravelRating;
};

export type WeeklyDestinationForecast = {
  id: string;
  name: string;
  region: WeatherRegion;
  emoji: string;
  days: WeatherDayForecast[];
};

export type WeeklyWeatherResponse = {
  fetchedAt: string | null;
  expiresAt: string | null;
  stale: boolean;
  destinations: WeeklyDestinationForecast[];
  /** Set by GET /weekly when cache is stale — client soft-refreshes in background. */
  needsBackgroundRefresh?: boolean;
  refreshError?: string | null;
};

export type RefreshResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  destinationsCount?: number;
  rowsUpserted?: number;
  fetchedAt?: string;
  durationMs?: number;
  error?: string;
};
