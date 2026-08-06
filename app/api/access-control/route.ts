/**
 * API cho trang Quản lý người dùng & phân quyền.
 *
 * Chức năng:
 * - GET: trả users, roles và permissions cho giao diện.
 * - PATCH: đổi role user hoặc thay permission của role nhân viên.
 * - POST: Super Admin tạo mục permission và nhóm permission mới.
 *
 * Bảo mật:
 * - Kiểm tra users.manage tại API.
 * - Database RPC kiểm tra users.manage lần nữa.
 * - Vì vậy không thể bypass chỉ bằng DevTools hoặc gọi API thủ công.
 */

import { NextResponse } from "next/server";
import { z } from 'zod';
import {
    AccessControlRpcError,
    getAccessControlData,
    replaceAccessControlRolePermissions,
    setAccessControlUserRole,
    createAccessControlPermission,
} from '@/lib/access-control/server';
import {
    createAccessControlPermissionBodySchema,
} from '@/lib/access-control/permission-input';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';

export const dynamic = 'force-dynamic';


/** Mã role động, ví dụ sales hoặc tour_operator. */
const roleCodeSchema = z.string()
    .trim()
    .regex(
        /^[a-z0-9_]{2,50}$/,
        'Mã role không hợp lệ.',
    );

/** Schema kiểm tra dữ liệu PATCH từ frontend. */
const updateBodySchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('set_user_role'),
        userId: z.string().uuid('userId không hợp lệ.'),
        // RPC database sẽ kiểm tra role có tồn tại và có được phép gán hay không.
        roleCode: roleCodeSchema,
    }),
    z.object({
        action: z.literal('replace_role_permissions'),
        roleCode: z.enum(['employee']),
        permissionCodes: z.array(z.string().min(1)).max(100),
    }),
]);

/** Chuyển lỗi database thành HTTP response an toàn cho frontend. */
function errorResponse(error: unknown) {
    if (error instanceof AccessControlRpcError) {
        if (error.code === '42501') {
            return NextResponse.json(
                { ok: false, error: error.message },
                { status: 403 },
            );
        }

        if (error.code === '22023') {
            return NextResponse.json(
                { ok: false, error: error.message },
                { status: 400 },
            );
        }

        if (error.code === '23505') {
            return NextResponse.json(
                { ok: false, error: 'Mã quyền này đã tồn tại.' },
                { status: 409 },
            );
        }
    }

    return NextResponse.json(
        { ok: false, error: 'Không thể xử lý yêu cầu phân quyền.' },
        { status: 500 },
    );
}

/** Lấy dữ liệu cho màn hình Quản lý người dùng & phân quyền. */
export async function GET() {
    const permission = await checkPermissionForRequest('users.manage');

    if (!permission.allowed) {
        return NextResponse.json(
            { ok: false, error: 'Unauthorized' },
            { status: permission.status },
        );
    }

    try {
        const data = await getAccessControlData();

        return NextResponse.json(
            { ok: true, ...data },
            {
                headers: {
                    // Không cache dữ liệu role/user trên trình duyệt.
                    'Cache-Control': 'no-store',
                },
            },
        );
    } catch (error) {
        return errorResponse(error);
    }
}

/** Đổi role user hoặc cập nhật permission của role. */
export async function PATCH(request: Request) {
    const permission = await checkPermissionForRequest('users.manage');

    if (!permission.allowed) {
        return NextResponse.json(
            { ok: false, error: 'Unauthorized' },
            { status: permission.status },
        );
    }
    const body = await request.json().catch(() => null);
    const parsed = updateBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                ok: false,
                error: 'Dữ liệu cập nhật không hợp lệ.',
            },
            { status: 400 },
        );
    }

    try {
        if (parsed.data.action === 'set_user_role') {
            await setAccessControlUserRole(
                parsed.data.userId,
                parsed.data.roleCode,
            )
        }
        if (parsed.data.action === 'replace_role_permissions') {
            await replaceAccessControlRolePermissions(
                parsed.data.roleCode,
                parsed.data.permissionCodes,
            );
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(request: Request) {
    // UI có thể bị sửa bằng DevTools, nên vẫn kiểm tra quyền ở API và RPC.
    const permission = await checkPermissionForRequest('users.manage');

    if (!permission.allowed) {
        return NextResponse.json(
            { ok: false, error: 'Unauthorized' },
            { status: permission.status },
        );
    }

    const body = await request.json().catch(() => null);
    const parsed = createAccessControlPermissionBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, error: 'Dữ liệu chức năng không hợp lệ.' },
            { status: 400 },
        );
    }

    try {
        await createAccessControlPermission(parsed.data);

        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
        return errorResponse(error);
    }
}
