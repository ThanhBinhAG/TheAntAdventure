import { NextResponse } from 'next/server';
import { isWeatherCacheConfigured } from '@/lib/weather/cache';
import { getWeeklyForecastWithRefresh } from '@/lib/weather/refresh';

export async function GET(request: Request) {
  if (!isWeatherCacheConfigured()) {
    return NextResponse.json(
      { error: 'Weather cache requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');

  const { payload, refreshError } = await getWeeklyForecastWithRefresh(region);

  if (!payload.destinations.length) {
    return NextResponse.json(
      {
        error: refreshError ?? 'No forecast data in cache. Use Refresh forecast or wait for the daily cron job.',
        ...payload,
      },
      { status: payload.destinations.length ? 200 : 404 }
    );
  }

  return NextResponse.json({ ...payload, refreshError: refreshError ?? null });
}
