/**
 * API đọc lịch sử thay đổi phân quyền.
 *
 * Chức năng:
 * - Trả log đổi role hoặc permission theo trang.
 * - Chỉ Super Admin có users.manage được xem.
 *
 * Bảo mật:
 * - API kiểm tra users.manage.
 * - RPC database kiểm tra users.manage thêm lần nữa.
 */

import { NextResponse } from 'next/server';
import {
    AccessControlRpcError,
    getAccessControlAuditLogs,
} from '@/lib/access-control/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
    accessControlAuditLogsQuerySchema,
} from '@/lib/access-control/audit-log-input';
import {
    accessControlError,
    accessControlPermissionError,
} from '@/lib/access-control/api-error';

export const dynamic = 'force-dynamic';

/** Chuyển lỗi RPC thành HTTP response an toàn. */
function errorResponse(error: unknown) {
    if (
        error instanceof AccessControlRpcError &&
        error.code === '42501'
    ) {
        return NextResponse.json(
            accessControlError(
                'ACCESS_DENIED',
                'Bạn không có quyền xem lịch sử phân quyền.',
            ),
            { status: 403 },
        );
    }

    return NextResponse.json(
        accessControlError(
            'AUDIT_LOG_LOAD_FAILED',
            'Không thể tải lịch sử phân quyền.',
        ),
        { status: 500 },
    );
}

export async function GET(request: Request) {
    const permission = await checkPermissionForRequest(
        'users.manage',
    );

    if (!permission.allowed) {
        return NextResponse.json(
            accessControlPermissionError(permission.status),
            { status: permission.status },
        );
    }

    const url = new URL(request.url);

    const parsed = accessControlAuditLogsQuerySchema.safeParse({
        page: url.searchParams.get('page') ?? undefined,
        pageSize: url.searchParams.get('pageSize') ?? undefined,
    });

    if (!parsed.success) {
        return NextResponse.json(
            accessControlError(
                'INVALID_AUDIT_LOG_QUERY',
                'Tham số phân trang không hợp lệ.',
            ),
            { status: 400 },
        );
    }

    try {
        // Lớp bảo vệ thứ hai nằm trong RPC database.
        const data = await getAccessControlAuditLogs(
            parsed.data,
        );

        return NextResponse.json(
            { ok: true, ...data },
            {
                headers: {
                    'Cache-Control': 'no-store',
                },
            },
        );
    } catch (error) {
        return errorResponse(error);
    }
}
