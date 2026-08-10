import { NextResponse } from 'next/server';
import {
    AccessControlRpcError,
    getAuthLoginEvents,
    isCurrentAccessControlSuperAdmin,
} from '@/lib/access-control/server';
import { getAuthContext } from '@/lib/auth/session';
import {
    parseAuthLoginHistoryQuery,
} from '@/lib/access-control/login-history-input';
import { accessControlError } from '@/lib/access-control/api-error';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown) {
    if (
        error instanceof AccessControlRpcError &&
        error.code === '42501'
    ) {
        return NextResponse.json(
            accessControlError(
                'LOGIN_HISTORY_FORBIDDEN',
                'Chỉ Super Admin được xem lịch sử đăng nhập.',
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
            'Không thể tải lịch sử đăng nhập.',
        ),
        { status: 500 },
    );
}

export async function GET(request: Request) {
    const auth = await getAuthContext();

    if (!auth.authenticated) {
        return NextResponse.json(
            accessControlError('AUTH_UNAUTHORIZED', 'Unauthorized'),
            { status: 401 },
        );
    }

    try {
        // API kiểm tra trước để trả 403 rõ ràng; RPC kiểm tra lại trong DB.
        const isSuperAdmin = await isCurrentAccessControlSuperAdmin();

        if (!isSuperAdmin) {
            return NextResponse.json(
                accessControlError(
                    'LOGIN_HISTORY_FORBIDDEN',
                    'Chỉ Super Admin được xem lịch sử đăng nhập.',
                ),
                { status: 403 },
            );
        }
    } catch (error) {
        return errorResponse(error);
    }

    const url = new URL(request.url);
    const parsed = parseAuthLoginHistoryQuery(url);

    if (!parsed.success) {
        return NextResponse.json(
            accessControlError(
                'INVALID_LOGIN_HISTORY_FILTER',
                'Bộ lọc lịch sử đăng nhập không hợp lệ.',
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
        return errorResponse(error);
    }
}
