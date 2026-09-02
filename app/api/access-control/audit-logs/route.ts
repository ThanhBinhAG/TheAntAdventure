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
import { withHttpRequestLogging } from '@/lib/system/server-logger';

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
                'You do not have permission to view the change history.',
            ),
            { status: 403 },
        );
    }

    return NextResponse.json(
        accessControlError(
            'AUDIT_LOG_LOAD_FAILED',
            'Unable to load change history.',
        ),
        { status: 500 },
    );
}

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
    { scope: 'access-control/audit-logs', route: '/api/access-control/audit-logs' },
    async (request, _context, { logger }) => {
    const permission = await checkPermissionForRequest(
        'users.manage',
    );

    if (!permission.allowed) {
        logger.warn({ event: 'access_control.permission.denied', statusCode: permission.status }, 'Access Control permission denied');
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
                'Invalid pagination parameters.',
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
        logger.error({ event: 'access_control.audit_logs.load.failed', err: error }, 'Access Control audit-log load failed');
        return errorResponse(error);
    }
    },
);
