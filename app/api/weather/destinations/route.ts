import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { checkRefreshAuthorized, weatherDeniedJson } from '@/lib/weather/auth';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import {
  createDestination,
  ensureDestinationsSeeded,
  listDestinations,
} from '@/lib/weather/destinations';
import { destinationCreateBodySchema } from '@/lib/weather/destination-input';

export async function GET() {
  if (!isWeatherBackendConfigured()) {
    return NextResponse.json(
      { error: 'Weather requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const permission = await checkPermissionForRequest('weather.read');
  if (!permission.allowed) {
    return weatherDeniedJson(permission);
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
  if (!isWeatherBackendConfigured()) {
    return NextResponse.json(
      { error: 'Weather requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const permission = await checkRefreshAuthorized(request);
  if (!permission.allowed) {
    return weatherDeniedJson(permission);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = destinationCreateBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'region must be north, central, or south.' },
      { status: 400 }
    );
  }

  try {
    const destination = await createDestination(parsed.data);
    return NextResponse.json({ destination }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /already exists|required|must be/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
