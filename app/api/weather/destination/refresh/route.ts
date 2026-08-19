import { NextResponse } from 'next/server';
import { isRefreshAuthorized } from '@/lib/weather/auth';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import { ensureDestinationsSeeded } from '@/lib/weather/destinations';
import { fetchAndCacheDestination } from '@/lib/weather/refresh';

export async function POST(request: Request) {
  if (!isWeatherBackendConfigured()) {
    return NextResponse.json(
      { error: 'Weather refresh requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const allowed = await isRefreshAuthorized(request);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let id = '';
  let force = true;
  try {
    const body = await request.json();
    id = String(body?.id ?? '').trim();
    if (body?.force === false) force = false;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!id) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  }

  try {
    await ensureDestinationsSeeded();
    const detail = await fetchAndCacheDestination(id, { force });
    return NextResponse.json({ ok: true, detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
