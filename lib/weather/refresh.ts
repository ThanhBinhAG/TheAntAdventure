import 'server-only';
import {
  getLastSuccessfulFetchWithin,
  getTodayVnDate,
  invalidateDestinationCache,
  isDestinationCacheStale,
  logWeatherFetch,
  prunePastForecastDates,
  readDestinationDetailCache,
  readWeeklyCache,
  upsertCurrentCache,
  upsertWeeklyCache,
} from './cache';
import {
  ensureDestinationsSeeded,
  getDestinationById,
  listFeaturedDestinations,
  metaToCoord,
} from './destinations';
import {
  buildDestinationWeatherDetail,
  fetchDestinationForecastFromApi,
} from './open-meteo';
import type {
  DestinationWeatherDetail,
  RefreshResult,
  WeatherDestinationMeta,
  WeeklyWeatherResponse,
} from './types';
import { WEATHER_DESTINATIONS } from './coordinates';

const RATE_LIMIT_MINUTES = 5;

function destinationCacheMeta(meta: WeatherDestinationMeta) {
  return {
    id: meta.id,
    name: meta.name,
    region: meta.region,
    emoji: meta.emoji,
    description: meta.description,
    coverPhotoId: meta.coverPhotoId,
    coverUrl: meta.coverUrl,
  };
}

export async function fetchAndCacheDestination(
  destination: string | WeatherDestinationMeta,
  options?: { force?: boolean }
): Promise<DestinationWeatherDetail> {
  const meta =
    typeof destination === 'string' ? await getDestinationById(destination) : destination;
  if (!meta || !meta.active) {
    const id = typeof destination === 'string' ? destination : destination.id;
    throw new Error(`Destination "${id}" not found.`);
  }

  const cacheMeta = destinationCacheMeta(meta);

  if (!options?.force) {
    const cached = await readDestinationDetailCache(meta.id, cacheMeta);
    if (cached) return cached;
  } else {
    await invalidateDestinationCache(meta.id);
  }

  const parsed = await fetchDestinationForecastFromApi(metaToCoord(meta));
  await Promise.all([
    upsertWeeklyCache(parsed.rows),
    upsertCurrentCache(
      meta.id,
      { current: parsed.current, days: parsed.days },
      parsed.fetchedAt,
      parsed.expiresAt
    ),
  ]);
  void prunePastForecastDates(getTodayVnDate());

  return buildDestinationWeatherDetail(cacheMeta, parsed);
}

export async function getDestinationWeather(
  destination: string | WeatherDestinationMeta,
  options?: { force?: boolean }
): Promise<{ detail: DestinationWeatherDetail; fromCache: boolean }> {
  const meta =
    typeof destination === 'string' ? await getDestinationById(destination) : destination;
  if (!meta || !meta.active) {
    const id = typeof destination === 'string' ? destination : destination.id;
    throw new Error(`Destination "${id}" not found.`);
  }

  const cacheMeta = destinationCacheMeta(meta);

  if (!options?.force) {
    const cached = await readDestinationDetailCache(meta.id, cacheMeta);
    if (cached) return { detail: cached, fromCache: true };
  }

  const detail = await fetchAndCacheDestination(meta, { force: options?.force });
  return { detail, fromCache: false };
}

/** Warm featured destinations only (cron / manual refresh). */
export async function refreshFeaturedForecast(options?: {
  force?: boolean;
}): Promise<RefreshResult> {
  const start = Date.now();
  const force = options?.force ?? false;

  try {
    await ensureDestinationsSeeded();
    const featured = await listFeaturedDestinations();
    const targets = featured.length
      ? featured
      : WEATHER_DESTINATIONS.filter((d) =>
          (['hanoi', 'saigon'] as string[]).includes(d.id)
        ).map((d) => ({
          id: d.id,
          name: d.name,
          region: d.region,
          emoji: d.emoji,
          latitude: d.latitude,
          longitude: d.longitude,
          elevationM: d.elevationM ?? null,
          sortOrder: d.sortOrder,
          description: null,
          notes: null,
          coverPhotoId: null,
          coverUrl: null,
          coverThumbUrl: null,
          isFeatured: true,
          active: true,
        }));

    if (!force) {
      const allFresh = await Promise.all(
        targets.map(async (d) => !(await isDestinationCacheStale(d.id)))
      );
      if (allFresh.every(Boolean)) {
        await logWeatherFetch({
          status: 'skipped',
          destinationsCount: targets.length,
          durationMs: Date.now() - start,
          errorMessage: 'Featured cache still fresh',
        });
        return {
          ok: true,
          skipped: true,
          reason: 'Featured cache still fresh',
          destinationsCount: targets.length,
          durationMs: Date.now() - start,
        };
      }

      const recentOk = await getLastSuccessfulFetchWithin(RATE_LIMIT_MINUTES);
      if (recentOk) {
        return {
          ok: true,
          skipped: true,
          reason: 'Rate limited — wait 5 minutes between refreshes',
          destinationsCount: targets.length,
          durationMs: Date.now() - start,
        };
      }
    }

    let rowsUpserted = 0;
    let fetchedAt: string | undefined;

    for (const dest of targets) {
      const detail = await fetchAndCacheDestination(dest, { force: true });
      rowsUpserted += detail.days.length;
      fetchedAt = detail.fetchedAt;
    }

    const durationMs = Date.now() - start;
    await logWeatherFetch({
      status: 'ok',
      destinationsCount: targets.length,
      durationMs,
    });

    return {
      ok: true,
      destinationsCount: targets.length,
      rowsUpserted,
      fetchedAt,
      durationMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - start;
    await logWeatherFetch({
      status: 'error',
      destinationsCount: 0,
      durationMs,
      errorMessage: message,
    });
    return { ok: false, error: message, durationMs };
  }
}

/** @deprecated Prefer refreshFeaturedForecast — kept for legacy weekly batch. */
export async function refreshWeeklyForecast(options?: {
  force?: boolean;
}): Promise<RefreshResult> {
  return refreshFeaturedForecast(options);
}

export type WeeklyForecastResult = {
  payload: WeeklyWeatherResponse;
  refreshError?: string;
  needsBackgroundRefresh?: boolean;
};

/**
 * @deprecated Weekly batch read — use GET /api/weather/destination instead.
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

  const result = await refreshFeaturedForecast({ force: false });
  if (result.ok && !result.skipped) {
    const refreshed = await readWeeklyCache(region);
    return { payload: refreshed };
  }

  if (result.ok === false) {
    return { payload, refreshError: result.error };
  }

  return { payload };
}
