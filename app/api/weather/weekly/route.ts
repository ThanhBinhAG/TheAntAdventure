import { NextResponse } from 'next/server';
import { isWeatherCacheConfigured } from '@/lib/weather/cache';
import { getWeeklyForecastWithRefresh } from '@/lib/weather/refresh';

const CACHE_CONTROL = 'private, max-age=60, stale-while-revalidate=300';

export async function GET(request: Request) {
  if (!isWeatherCacheConfigured()) {
    return NextResponse.json(
      { error: 'Weather cache requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');

  const { payload, refreshError, needsBackgroundRefresh } =
    await getWeeklyForecastWithRefresh(region);

  if (!payload.destinations.length) {
    return NextResponse.json(
      {
        error:
          refreshError ??
          'No forecast data in cache. Use Refresh forecast or wait for the daily cron job.',
        ...payload,
        needsBackgroundRefresh: false,
      },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      ...payload,
      refreshError: refreshError ?? null,
      needsBackgroundRefresh: Boolean(needsBackgroundRefresh),
    },
    { headers: { 'Cache-Control': CACHE_CONTROL } }
  );
}
