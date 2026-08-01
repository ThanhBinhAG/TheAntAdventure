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

export async function GET() {
  try {
    const permissions = await getCurrentPermissionCodesForRequest();

    if (permissions === null) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true, permissions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Không thể tải quyền người dùng';

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
