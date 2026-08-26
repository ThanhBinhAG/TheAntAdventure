import 'server-only';

import { getAppUrl } from '@/lib/env';

/** Reject cross-site state changes made with ambient HttpOnly cookies. */
export function hasTrustedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    const requestOrigin = new URL(request.url).origin;
    const configuredOrigin = new URL(getAppUrl()).origin;
    return origin === requestOrigin || origin === configuredOrigin;
  } catch {
    return false;
  }
}
