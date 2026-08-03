import 'server-only';
import { getAuthContext } from '@/lib/auth/session';
import { getWeatherCronSecret } from '@/lib/env';

export async function isRefreshAuthorized(request: Request): Promise<boolean> {
  const secret = getWeatherCronSecret();
  const auth = request.headers.get('authorization');
  if (secret && auth === `Bearer ${secret}`) return true;

  const ctx = await getAuthContext();
  return ctx.authenticated;
}
