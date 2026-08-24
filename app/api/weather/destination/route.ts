import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import { getDestinationWeather } from '@/lib/weather/refresh';
import { weatherDeniedJson } from '@/lib/weather/auth';

const CACHE_CONTROL = 'private, max-age=60, stale-while-revalidate=300';

export async function GET(request: Request) {
  if (!isWeatherBackendConfigured()) {
    return NextResponse.json(
      { error: 'Weather cache requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const permission = await checkPermissionForRequest('weather.read');
  if (!permission.allowed) {
    return weatherDeniedJson(permission);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Query param id is required.' }, { status: 400 });
  }

  try {
    const { detail, fromCache } = await getDestinationWeather(id, { force: false });
    return NextResponse.json(
      { ...detail, fromCache },
      { headers: { 'Cache-Control': fromCache ? CACHE_CONTROL : 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
