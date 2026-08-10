import { NextResponse } from 'next/server';
import { isRefreshAuthorized } from '@/lib/weather/auth';
import { isWeatherCacheConfigured } from '@/lib/weather/cache';
import { refreshFeaturedForecast } from '@/lib/weather/refresh';

/** Warm featured destinations only (cron / manual). */
export async function POST(request: Request) {
  if (!isWeatherCacheConfigured()) {
    return NextResponse.json(
      { error: 'Weather refresh requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const allowed = await isRefreshAuthorized(request);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let force = false;
  try {
    const body = await request.json();
    force = Boolean(body?.force);
  } catch {
    /* empty body ok */
  }

  const result = await refreshFeaturedForecast({ force });
  const status = result.ok ? 200 : 500;
  return NextResponse.json(result, { status });
}
