import { NextResponse } from 'next/server';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import { invalidateWeatherCache } from '@/lib/weather/redis-cache';
import { checkRefreshAuthorized, weatherDeniedJson } from '@/lib/weather/auth';
import { refreshFeaturedForecast } from '@/lib/weather/refresh';
import { weatherRefreshBodySchema } from '@/lib/weather/destination-input';

/** Warm featured destinations only (cron / manual). */
export async function POST(request: Request) {
  if (!isWeatherBackendConfigured()) {
    return NextResponse.json(
      { error: 'Weather refresh requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const permission = await checkRefreshAuthorized(request);
  if (!permission.allowed) {
    return weatherDeniedJson(permission);
  }

  let force = false;
  try {
    const body = await request.json();
    const parsed = weatherRefreshBodySchema.safeParse(body ?? {});
    if (parsed.success) {
      force = Boolean(parsed.data.force);
    }
  } catch {
    /* empty body ok */
  }

  const result = await refreshFeaturedForecast({ force });
  await invalidateWeatherCache();
  const status = result.ok ? 200 : 500;
  return NextResponse.json(result, { status });
}
