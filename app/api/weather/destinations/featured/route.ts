import { NextResponse } from 'next/server';
import { checkRefreshAuthorized, weatherDeniedJson } from '@/lib/weather/auth';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import { setFeaturedDestinationIds } from '@/lib/weather/destinations';
import { featuredIdsBodySchema } from '@/lib/weather/destination-input';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

/** PUT { ids: string[] } — set exactly the featured destinations (max 2). */
export const PUT = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'weather/destinations/featured', route: '/api/weather/destinations/featured' },
  async (request, _context, { logger }) => {
  if (!isWeatherBackendConfigured()) {
    logger.error({ event: 'weather.backend.unavailable', statusCode: 503 }, 'Weather backend unavailable');
    return NextResponse.json(
      { error: 'Weather requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const permission = await checkRefreshAuthorized(request);
  if (!permission.allowed) {
    logger.warn({ event: 'weather.permission.denied', statusCode: permission.status }, 'Weather permission denied');
    return weatherDeniedJson(permission);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = featuredIdsBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid body.' },
      { status: 400 }
    );
  }

  try {
    const destinations = await setFeaturedDestinationIds(parsed.data.ids);
    logger.info({ event: 'weather.destinations.featured.updated' }, 'Featured weather destinations updated');
    return NextResponse.json({ destinations });
  } catch (err) {
    logger.error({ event: 'weather.destinations.featured.update.failed', err }, 'Featured weather destinations update failed');
    const message = err instanceof Error ? err.message : String(err);
    const status = /tối đa|ít nhất|not found|migration|Chỉnh/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
  },
);
