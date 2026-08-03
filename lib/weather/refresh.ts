import 'server-only';
import { WEATHER_DESTINATIONS } from './coordinates';
import {
  ensureDestinationsSeeded,
  getLastSuccessfulFetchWithin,
  getTodayVnDate,
  isCacheStale,
  logWeatherFetch,
  prunePastForecastDates,
  readWeeklyCache,
  upsertWeeklyCache,
} from './cache';
import { fetchWeeklyForecastFromApi } from './open-meteo';
import type { RefreshResult, WeeklyWeatherResponse } from './types';

const RATE_LIMIT_MINUTES = 5;

export async function refreshWeeklyForecast(options?: {
  force?: boolean;
}): Promise<RefreshResult> {
  const start = Date.now();
  const force = options?.force ?? false;

  try {
    await ensureDestinationsSeeded();

    if (!force) {
      const stale = await isCacheStale();
      if (!stale) {
        await logWeatherFetch({
          status: 'skipped',
          destinationsCount: WEATHER_DESTINATIONS.length,
          durationMs: Date.now() - start,
          errorMessage: 'Cache still fresh',
        });
        return {
          ok: true,
          skipped: true,
          reason: 'Cache still fresh',
          destinationsCount: WEATHER_DESTINATIONS.length,
          durationMs: Date.now() - start,
        };
      }

      const recentOk = await getLastSuccessfulFetchWithin(RATE_LIMIT_MINUTES);
      if (recentOk) {
        return {
          ok: true,
          skipped: true,
          reason: 'Rate limited — wait 5 minutes between refreshes',
          destinationsCount: WEATHER_DESTINATIONS.length,
          durationMs: Date.now() - start,
        };
      }
    }

    const rows = await fetchWeeklyForecastFromApi(WEATHER_DESTINATIONS);
    if (!rows.length) {
      throw new Error('Open-Meteo returned no forecast rows');
    }

    const upserted = await upsertWeeklyCache(rows);
    await prunePastForecastDates(getTodayVnDate());
    const fetchedAt = rows[0]?.fetched_at ?? new Date().toISOString();
    const durationMs = Date.now() - start;

    await logWeatherFetch({
      status: 'ok',
      destinationsCount: WEATHER_DESTINATIONS.length,
      durationMs,
    });

    return {
      ok: true,
      destinationsCount: WEATHER_DESTINATIONS.length,
      rowsUpserted: upserted,
      fetchedAt,
      durationMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - start;

    await logWeatherFetch({
      status: 'error',
      destinationsCount: WEATHER_DESTINATIONS.length,
      durationMs,
      errorMessage: message,
    });

    return { ok: false, error: message, durationMs };
  }
}

export type WeeklyForecastResult = {
  payload: WeeklyWeatherResponse;
  refreshError?: string;
  /** True when cache had rows but is past TTL — client should soft-refresh in background. */
  needsBackgroundRefresh?: boolean;
};

/**
 * Cache-first weekly read. Never blocks on Open-Meteo when any rows exist
 * (fresh or stale). Cold empty cache is the only path that awaits a refresh.
 */
export async function getWeeklyForecastWithRefresh(
  region?: string | null
): Promise<WeeklyForecastResult> {
  const payload = await readWeeklyCache(region);

  if (payload.destinations.length) {
    return {
      payload,
      needsBackgroundRefresh: payload.stale,
    };
  }

  const result = await refreshWeeklyForecast({ force: false });
  if (result.ok && !result.skipped) {
    const refreshed = await readWeeklyCache(region);
    return { payload: refreshed };
  }

  if (result.ok === false) {
    return { payload, refreshError: result.error };
  }

  return { payload };
}
