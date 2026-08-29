import { NextResponse } from 'next/server';
import { checkRefreshAuthorized, weatherDeniedJson } from '@/lib/weather/auth';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import { softDeleteDestination, updateDestination } from '@/lib/weather/destinations';
import { destinationPatchBodySchema } from '@/lib/weather/destination-input';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withHttpRequestLogging<Ctx>(
  { scope: 'weather/destinations/detail', route: '/api/weather/destinations/[id]' },
  async (request, ctx, { logger }) => {
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

  const { id } = await ctx.params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = destinationPatchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid body.' },
      { status: 400 }
    );
  }

  try {
    const destination = await updateDestination(id, parsed.data);
    logger.info({ event: 'weather.destination.updated' }, 'Weather destination updated');
    return NextResponse.json({ destination });
  } catch (err) {
    logger.error({ event: 'weather.destination.update.failed', err }, 'Weather destination update failed');
    const message = err instanceof Error ? err.message : String(err);
    const status = /not found/i.test(message)
      ? 404
      : /already exists|required|must be/i.test(message)
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
  },
);

export const DELETE = withHttpRequestLogging<Ctx>(
  { scope: 'weather/destinations/detail', route: '/api/weather/destinations/[id]' },
  async (request, ctx, { logger }) => {
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

  const { id } = await ctx.params;
  try {
    await softDeleteDestination(id);
    logger.info({ event: 'weather.destination.deleted' }, 'Weather destination deleted');
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ event: 'weather.destination.delete.failed', err }, 'Weather destination deletion failed');
    const message = err instanceof Error ? err.message : String(err);
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
  },
);
