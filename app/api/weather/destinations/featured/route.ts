import { NextResponse } from 'next/server';
import { isRefreshAuthorized } from '@/lib/weather/auth';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import { setFeaturedDestinationIds } from '@/lib/weather/destinations';

/** PUT { ids: string[] } — set exactly the featured destinations (max 2). */
export async function PUT(request: Request) {
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

  let ids: string[] = [];
  try {
    const body = await request.json();
    ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const destinations = await setFeaturedDestinationIds(ids);
    return NextResponse.json({ destinations });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /tối đa|ít nhất|not found|migration|Chỉnh/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
