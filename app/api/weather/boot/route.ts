import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/session';
import { getWeatherPageBoot } from '@/lib/weather/boot';
import { isWeatherCacheConfigured } from '@/lib/weather/cache';
import { getWeatherCache, setWeatherCache } from '@/lib/weather/redis-cache';

export async function GET() {
  if (!isWeatherCacheConfigured()) {
    // When Redis is not configured we keep the previous error message for compatibility.
    return NextResponse.json(
      { error: 'Weather requires SUPABASE_SERVICE_ROLE_KEY on the server.' },
      { status: 503 }
    );
  }

  const auth = await getAuthContext();
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Try to read the cached payload from Redis.
  const cached = await getWeatherCache();
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  }

  // If cache miss, generate fresh data and store it.
  try {
    const boot = await getWeatherPageBoot();
    await setWeatherCache(boot);
    return NextResponse.json(boot, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
