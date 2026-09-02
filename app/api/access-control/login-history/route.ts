import { NextResponse } from 'next/server';
import {
    AccessControlRpcError,
    getAuthLoginEvents,
} from '@/lib/access-control/server';
import { getAuthContext } from '@/lib/auth/session';
import {
    parseAuthLoginHistoryQuery,
} from '@/lib/access-control/login-history-input';
import {
    accessControlError,
    accessControlPermissionError,
} from '@/lib/access-control/api-error';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown) {
    if (
        error instanceof AccessControlRpcError &&
        error.code === '42501'
    ) {
        return NextResponse.json(
            accessControlError(
                'LOGIN_HISTORY_FORBIDDEN',
                'You do not have permission to view login history.',
            ),
            { status: 403 },
        );
    }

    if (
        error instanceof AccessControlRpcError &&
        error.code === '22023'
    ) {
        return NextResponse.json(
            accessControlError(
                'INVALID_LOGIN_HISTORY_FILTER',
                error.message,
            ),
            { status: 400 },
        );
    }

    return NextResponse.json(
        accessControlError(
            'LOGIN_HISTORY_LOAD_FAILED',
            'Unable to load login history.',
        ),
        { status: 500 },
    );
}

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
    { scope: 'access-control/login-history', route: '/api/access-control/login-history' },
    async (request, _context, { logger }) => {
    const auth = await getAuthContext();

    if (!auth.authenticated) {
        logger.warn({ event: 'access_control.login_history.denied', statusCode: 401 }, 'Access Control login-history access denied');
        return NextResponse.json(
            accessControlError('AUTH_UNAUTHORIZED', 'Unauthorized'),
            { status: 401 },
        );
    }

    try {
        // API kiểm tra trước để trả 403 rõ ràng; RPC kiểm tra lại trong DB.
        const permission = await checkPermissionForRequest('users.manage');

        if (!permission.allowed) {
            logger.warn({ event: 'access_control.permission.denied', statusCode: permission.status }, 'Access Control permission denied');
            return NextResponse.json(
                accessControlPermissionError(permission.status),
                { status: permission.status },
            );
        }
    } catch (error) {
        logger.error({ event: 'access_control.login_history.authorization.failed', err: error }, 'Access Control login-history authorization failed');
        return errorResponse(error);
    }

    const url = new URL(request.url);
    const parsed = parseAuthLoginHistoryQuery(url);

    if (!parsed.success) {
        return NextResponse.json(
            accessControlError(
                'INVALID_LOGIN_HISTORY_FILTER',
                'Invalid login history filter.',
            ),
            { status: 400 },
        );
    }

    try {
        const data = await getAuthLoginEvents({
            page: parsed.data.page,
            pageSize: parsed.data.pageSize,
            userId: parsed.data.userId,
            userQuery: parsed.data.user,
            ipAddress: parsed.data.ip,
            deviceType: parsed.data.deviceType,
            from: parsed.data.from,
            to: parsed.data.to,
        });

        return NextResponse.json(
            { ok: true, ...data },
            {
                headers: {
                    // Không cache IP/thiết bị trên trình duyệt hoặc proxy.
                    'Cache-Control': 'no-store',
                },
            },
        );
    } catch (error) {
        logger.error({ event: 'access_control.login_history.load.failed', err: error }, 'Access Control login-history load failed');
        return errorResponse(error);
    }
    },
);
