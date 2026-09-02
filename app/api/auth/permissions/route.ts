/**
 * API nội bộ trả về quyền của session hiện tại.
 *
 * Chức năng:
 * - Chỉ nhận GET từ trình duyệt đã có session.
 * - Trả về mảng mã quyền cho PermissionsProvider.
 * - Không trả role, profile hoặc secret; user chưa đăng nhập nhận HTTP 401.
 */

import { NextResponse } from 'next/server';
import { getCurrentPermissionCodesForRequest } from '@/lib/auth/permissions-server';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'auth/permissions', route: '/api/auth/permissions' },
  async (_request, _context, { logger }) => {
  try {
    const permissions = await getCurrentPermissionCodesForRequest();

    if (permissions === null) {
      logger.warn({ event: 'auth.permissions.denied', statusCode: 401 }, 'Permission lookup denied');
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true, permissions });
  } catch (error) {
    logger.error({ event: 'auth.permissions.failed', err: error }, 'Permission lookup failed');
    const message =
      error instanceof Error ? error.message : 'Unable to load user permissions';

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
  },
);
