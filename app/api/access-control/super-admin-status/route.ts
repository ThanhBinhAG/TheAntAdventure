import { NextResponse } from 'next/server';
import {
    AccessControlRpcError,
    isCurrentAccessControlSuperAdmin,
} from '@/lib/access-control/server';
import {
    checkPermissionForRequest,
} from '@/lib/auth/permissions-server';
import {
    accessControlError,
    accessControlPermissionError,
} from '@/lib/access-control/api-error';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
    { scope: 'access-control/super-admin-status', route: '/api/access-control/super-admin-status' },
    async (_request, _context, { logger }) => {
    // Chỉ người đã có quyền vào Access Control mới được hỏi trạng thái này.
    const permission = await checkPermissionForRequest('users.manage');

    if (!permission.allowed) {
        logger.warn({ event: 'access_control.permission.denied', statusCode: permission.status }, 'Access Control permission denied');
        return NextResponse.json(
            accessControlPermissionError(permission.status),
            { status: permission.status },
        );
    }

    try {
        const isSuperAdmin =
            await isCurrentAccessControlSuperAdmin();

        return NextResponse.json(
            {
                ok: true,
                isSuperAdmin,
            },
            {
                headers: {
                    'Cache-Control': 'no-store',
                },
            },
        );
    } catch (error) {
        logger.error({ event: 'access_control.super_admin_status.failed', err: error }, 'Super Admin status lookup failed');
        const status =
            error instanceof AccessControlRpcError &&
                error.code === '42501'
                ? 403
                : 500;

        return NextResponse.json(
            accessControlError(
                'SUPER_ADMIN_STATUS_FAILED',
                'Không thể xác nhận quyền Super Admin.',
            ),
            { status },
        );
    }
    },
);
