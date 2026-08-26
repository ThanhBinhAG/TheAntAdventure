import { NextResponse } from 'next/server';
import { checkRefreshAuthorized, weatherDeniedJson } from '@/lib/weather/auth';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import { setFeaturedDestinationIds } from '@/lib/weather/destinations';
import { featuredIdsBodySchema } from '@/lib/weather/destination-input';

/** PUT { ids: string[] } — set exactly the featured destinations (max 2). */
export async function PUT(request: Request) {
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

  const parsed = featuredIdsBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid body.' },
      { status: 400 }
    );
  }

  try {
    const destinations = await setFeaturedDestinationIds(parsed.data.ids);
    return NextResponse.json({ destinations });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /tối đa|ít nhất|not found|migration|Chỉnh/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
