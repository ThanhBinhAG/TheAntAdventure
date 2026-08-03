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
import { z } from 'zod';
import {
    AccessControlRpcError,
    getAccessControlAuditLogs,
} from '@/lib/access-control/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';

export const dynamic = 'force-dynamic';

/** Kiểm tra page và pageSize từ query string. */
const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Chuyển lỗi RPC thành HTTP response an toàn. */
function errorResponse(error: unknown) {
    if (
        error instanceof AccessControlRpcError &&
        error.code === '42501'
    ) {
        return NextResponse.json(
            {
                ok: false,
                error: 'Bạn không có quyền xem lịch sử phân quyền.',
            },
            { status: 403 },
        );
    }

    return NextResponse.json(
        {
            ok: false,
            error: 'Không thể tải lịch sử phân quyền.',
        },
        { status: 500 },
    );
}

export async function GET(request: Request) {
    // Lớp bảo vệ thứ nhất: API Next.js.
    const permission = await checkPermissionForRequest(
        'users.manage',
    );

    if (!permission.allowed) {
        return NextResponse.json(
            { ok: false, error: 'Unauthorized' },
            { status: permission.status },
        );
    }

    const url = new URL(request.url);

    const parsed = querySchema.safeParse({
        page: url.searchParams.get('page') ?? undefined,
        pageSize: url.searchParams.get('pageSize') ?? undefined,
    });

    if (!parsed.success) {
        return NextResponse.json(
            {
                ok: false,
                error: 'Tham số phân trang không hợp lệ.',
            },
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