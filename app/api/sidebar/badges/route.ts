import { NextResponse } from 'next/server';
import { getCurrentPermissionCodesForRequest } from '@/lib/auth/permissions-server';
import { getAuthContext } from '@/lib/auth/session';
import { getSidebarBadgeCounts } from '@/lib/sidebar/badge-counts';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'sidebar/badges', route: '/api/sidebar/badges' },
  async (_request, _context, { logger }) => {
  const auth = await getAuthContext();
  if (!auth.authenticated) {
    logger.warn({ event: 'sidebar.badges.denied', statusCode: 401 }, 'Sidebar badges access denied');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissionCodes = await getCurrentPermissionCodesForRequest();
  if (permissionCodes == null) {
    logger.warn({ event: 'sidebar.badges.denied', statusCode: 401 }, 'Sidebar badges access denied');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const counts = await getSidebarBadgeCounts(new Set(permissionCodes));
    return NextResponse.json(counts, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    });
  } catch (err) {
    logger.error({ event: 'sidebar.badges.load.failed', err }, 'Sidebar badges load failed');
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
  },
);
