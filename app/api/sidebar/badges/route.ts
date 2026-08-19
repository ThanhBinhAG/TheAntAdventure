import { NextResponse } from 'next/server';
import { getCurrentPermissionCodesForRequest } from '@/lib/auth/permissions-server';
import { getAuthContext } from '@/lib/auth/session';
import { getSidebarBadgeCounts } from '@/lib/sidebar/badge-counts';

export async function GET() {
  const auth = await getAuthContext();
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const permissionCodes = await getCurrentPermissionCodesForRequest();
  if (permissionCodes == null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const counts = await getSidebarBadgeCounts(new Set(permissionCodes));
    return NextResponse.json(counts, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
