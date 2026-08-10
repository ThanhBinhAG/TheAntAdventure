import 'server-only';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { getWeatherCronSecret } from '@/lib/env';

export async function isRefreshAuthorized(request: Request): Promise<boolean> {
  const secret = getWeatherCronSecret();
  const auth = request.headers.get('authorization');
  if (secret && auth === `Bearer ${secret}`) return true;

  const perm = await checkPermissionForRequest('weather.write');
  return perm.allowed;
}
