import { NextResponse } from 'next/server';
import { checkRefreshAuthorized, weatherDeniedJson } from '@/lib/weather/auth';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import { ensureDestinationsSeeded } from '@/lib/weather/destinations';
import { fetchAndCacheDestination } from '@/lib/weather/refresh';
import { destinationRefreshBodySchema } from '@/lib/weather/destination-input';

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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = destinationRefreshBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'id is required.' },
      { status: 400 }
    );
  }

  const force = parsed.data.force !== false;

  try {
    await ensureDestinationsSeeded();
    const detail = await fetchAndCacheDestination(parsed.data.id, { force });
    return NextResponse.json({ ok: true, detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
