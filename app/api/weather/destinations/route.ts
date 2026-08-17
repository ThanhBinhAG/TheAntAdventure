import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/session';
import { isRefreshAuthorized } from '@/lib/weather/auth';
import { isWeatherCacheConfigured } from '@/lib/weather/cache';
import {
  createDestination,
  ensureDestinationsSeeded,
  listDestinations,
  type DestinationInput,
} from '@/lib/weather/destinations';
import type { WeatherRegion } from '@/lib/weather/coordinates';

export async function GET() {
  if (!isWeatherCacheConfigured()) {
    return NextResponse.json(
      { error: 'Weather requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const auth = await getAuthContext();
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDestinationsSeeded();
    const destinations = await listDestinations({ activeOnly: true });
    return NextResponse.json(
      { destinations },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isWeatherCacheConfigured()) {
    return NextResponse.json(
      { error: 'Weather requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const allowed = await isRefreshAuthorized(request);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: DestinationInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const region = body.region as WeatherRegion;
  if (!region || !['north', 'central', 'south'].includes(region)) {
    return NextResponse.json({ error: 'region must be north, central, or south.' }, { status: 400 });
  }

  try {
    const destination = await createDestination({
      ...body,
      region,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
    });
    return NextResponse.json({ destination }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /already exists|required|must be/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
