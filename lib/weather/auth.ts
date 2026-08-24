import 'server-only';
import { NextResponse } from 'next/server';
import {
  checkPermissionForRequest,
  type RequestPermissionResult,
} from '@/lib/auth/permissions-server';
import { getWeatherCronSecret } from '@/lib/env';

export async function checkRefreshAuthorized(request: Request): Promise<RequestPermissionResult> {
  const secret = getWeatherCronSecret();
  const auth = request.headers.get('authorization');
  if (secret && auth === `Bearer ${secret}`) return { allowed: true };

  return checkPermissionForRequest('weather.write');
}

export async function isRefreshAuthorized(request: Request): Promise<boolean> {
  const result = await checkRefreshAuthorized(request);
  return result.allowed;
}

export function weatherDeniedJson(result: Extract<RequestPermissionResult, { allowed: false }>) {
  return NextResponse.json(
    { error: result.status === 401 ? 'Unauthorized' : 'Forbidden' },
    { status: result.status },
  );
}
