import { NextResponse } from 'next/server';
import { isRefreshAuthorized } from '@/lib/weather/auth';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import {
  softDeleteDestination,
  updateDestination,
  type DestinationInput,
} from '@/lib/weather/destinations';
import type { WeatherRegion } from '@/lib/weather/coordinates';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  if (!isWeatherBackendConfigured()) {
    return NextResponse.json(
      { error: 'Weather requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const allowed = await isRefreshAuthorized(request);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: Partial<DestinationInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (body.region != null && !['north', 'central', 'south'].includes(body.region)) {
    return NextResponse.json({ error: 'region must be north, central, or south.' }, { status: 400 });
  }

  try {
    const patch: Partial<DestinationInput> = { ...body };
    if (body.latitude != null) patch.latitude = Number(body.latitude);
    if (body.longitude != null) patch.longitude = Number(body.longitude);
    if (body.region != null) patch.region = body.region as WeatherRegion;

    const destination = await updateDestination(id, patch);
    return NextResponse.json({ destination });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /not found/i.test(message)
      ? 404
      : /already exists|required|must be/i.test(message)
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  if (!isWeatherBackendConfigured()) {
    return NextResponse.json(
      { error: 'Weather requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const allowed = await isRefreshAuthorized(request);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  try {
    await softDeleteDestination(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
