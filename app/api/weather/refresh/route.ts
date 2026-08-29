import { NextResponse } from 'next/server';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import { invalidateWeatherCache } from '@/lib/weather/redis-cache';
import { checkRefreshAuthorized, weatherDeniedJson } from '@/lib/weather/auth';
import { refreshFeaturedForecast } from '@/lib/weather/refresh';
import { weatherRefreshBodySchema } from '@/lib/weather/destination-input';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

/** Warm featured destinations only (cron / manual). */
export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'weather/refresh', route: '/api/weather/refresh' },
  async (request, _context, { logger }) => {
  if (!isWeatherBackendConfigured()) {
    logger.error({ event: 'weather.backend.unavailable', statusCode: 503 }, 'Weather backend unavailable');
    return NextResponse.json(
      { error: 'Weather refresh requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const permission = await checkRefreshAuthorized(request);
  if (!permission.allowed) {
    logger.warn({ event: 'weather.permission.denied', statusCode: permission.status }, 'Weather permission denied');
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
  if (result.ok) logger.info({ event: 'weather.featured.refreshed' }, 'Featured weather refreshed');
  else logger.error({ event: 'weather.featured.refresh.failed', statusCode: status }, 'Featured weather refresh failed');
  return NextResponse.json(result, { status });
  },
);
