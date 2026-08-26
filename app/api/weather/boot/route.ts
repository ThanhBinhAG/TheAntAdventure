import { NextResponse } from 'next/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { getWeatherPageBoot } from '@/lib/weather/boot';
import { getWeatherCache, setWeatherCache } from '@/lib/weather/redis-cache';
import { isWeatherBackendConfigured } from '@/lib/weather/supabase-admin';
import { weatherDeniedJson } from '@/lib/weather/auth';

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

  const cached = await getWeatherCache();
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  }

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
