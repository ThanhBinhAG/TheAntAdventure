import 'server-only';
import { WEATHER_DESTINATIONS } from './coordinates';
import {
  ensureDestinationsSeeded,
  getLastSuccessfulFetchWithin,
  isCacheStale,
  logWeatherFetch,
  upsertWeeklyCache,
} from './cache';
import { fetchWeeklyForecastFromApi } from './open-meteo';
import type { RefreshResult } from './types';

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

export async function getWeeklyForecastWithRefresh(region?: string | null) {
  const { readWeeklyCache } = await import('./cache');
  let payload = await readWeeklyCache(region);

  if (!payload.destinations.length || payload.stale) {
    const result = await refreshWeeklyForecast({ force: false });
    if (result.ok && !result.skipped) {
      payload = await readWeeklyCache(region);
    } else if (!payload.destinations.length && result.ok === false) {
      return { payload, refreshError: result.error };
    }
  }

  return { payload, refreshError: undefined as string | undefined };
}
