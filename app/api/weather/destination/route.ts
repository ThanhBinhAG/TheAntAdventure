import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/session';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import { getDestinationWeather } from '@/lib/weather/refresh';

const CACHE_CONTROL = 'private, max-age=60, stale-while-revalidate=300';

export async function GET(request: Request) {
  if (!isWeatherBackendConfigured()) {
    return NextResponse.json(
      { error: 'Weather cache requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const auth = await getAuthContext();
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Query param id is required.' }, { status: 400 });
  }

  const force = searchParams.get('force') === '1' || searchParams.get('force') === 'true';

  try {
    // Catalog seed runs on list GET / refresh — not on every forecast read.
    const { detail, fromCache } = await getDestinationWeather(id, { force });
    return NextResponse.json(
      { ...detail, fromCache },
      { headers: { 'Cache-Control': fromCache && !force ? CACHE_CONTROL : 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
