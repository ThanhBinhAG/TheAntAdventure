/**
 * API quản lý role nhân viên động.
 *
 * Chức năng:
 * - GET: lấy danh sách role nhân viên.
 * - POST: tạo role mới.
 * - PATCH: sửa role hoặc lưu permission.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
    AccessControlRpcError,
    createAccessControlStaffRole,
    getAccessControlStaffRoles,
    replaceAccessControlStaffRolePermissions,
    updateAccessControlStaffRole,
} from '@/lib/access-control/server';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';

export const dynamic = 'force-dynamic';

/** Mã role kỹ thuật ổn định, ví dụ sales hoặc tour_operator. */
const roleCodeSchema = z.string()
    .trim()
    .regex(
        /^[a-z0-9_]{2,50}$/,
        'Mã role không hợp lệ.',
    );

/** Dữ liệu tạo role nhân viên. */
const createBodySchema = z.object({
    code: roleCodeSchema,
    label: z.string()
        .trim()
        .min(1, 'Tên role không được để trống.')
        .max(100, 'Tên role tối đa 100 ký tự.'),
    description: z.string().trim().max(500).optional(),
    sortOrder: z.number().int().min(0).max(10_000).default(0),
});

/** Dữ liệu cập nhật role hoặc permission. */
const updateBodySchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('update_role'),
        code: roleCodeSchema,
        label: z.string()
            .trim()
            .min(1, 'Tên role không được để trống.')
            .max(100, 'Tên role tối đa 100 ký tự.'),
        description: z.string().trim().max(500).optional(),
        sortOrder: z.number().int().min(0).max(10_000),
        isActive: z.boolean(),
    }),
    z.object({
        action: z.literal('replace_role_permissions'),
        roleCode: roleCodeSchema,
        permissionCodes: z.array(z.string().min(1)).max(100),
    }),
]);

/** Đổi lỗi RPC thành HTTP response an toàn cho frontend. */
function errorResponse(error: unknown) {
    if (error instanceof AccessControlRpcError) {
        if (error.code === '42501') {
            return NextResponse.json(
                { ok: false, error: error.message },
                { status: 403 },
            );
        }

        if (
            error.code === '22023' ||
            error.code === '23505'
        ) {
            return NextResponse.json(
                { ok: false, error: error.message },
                { status: 400 },
            );
        }
    }

    return NextResponse.json(
        {
            ok: false,
            error: 'Không thể xử lý yêu cầu role nhân viên.',
        },
        { status: 500 },
    );
}

/** Lấy danh sách role nhân viên động. */
export async function GET() {
    const permission = await checkPermissionForRequest(
        'users.manage',
    );

    if (!permission.allowed) {
        return NextResponse.json(
            { ok: false, error: 'Unauthorized' },
            { status: permission.status },
        );
    }

    try {
        const roles = await getAccessControlStaffRoles();

        return NextResponse.json(
            { ok: true, roles },
            {
                headers: {
                    // SWR ở browser chịu trách nhiệm cache ngắn hạn.
                    'Cache-Control': 'no-store',
                },
            },
        );
    } catch (error) {
        return errorResponse(error);
    }
}

/** Tạo role nhân viên mới. */
export async function POST(request: Request) {
    const permission = await checkPermissionForRequest(
        'users.manage',
    );

    if (!permission.allowed) {
        return NextResponse.json(
            { ok: false, error: 'Unauthorized' },
            { status: permission.status },
        );
    }

    const body = await request.json().catch(() => null);
    const parsed = createBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { ok: false, error: 'Dữ liệu role không hợp lệ.' },
            { status: 400 },
        );
    }

    try {
        await createAccessControlStaffRole(parsed.data);

        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
        return errorResponse(error);
    }
}

/** Sửa thông tin role hoặc permission của role. */
export async function PATCH(request: Request) {
    const permission = await checkPermissionForRequest(
        'users.manage',
    );

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
            { ok: false, error: 'Dữ liệu cập nhật role không hợp lệ.' },
            { status: 400 },
        );
    }

    try {
        if (parsed.data.action === 'update_role') {
            await updateAccessControlStaffRole({
                code: parsed.data.code,
                label: parsed.data.label,
                description: parsed.data.description,
                sortOrder: parsed.data.sortOrder,
                isActive: parsed.data.isActive,
            });
        }

        if (
            parsed.data.action ===
            'replace_role_permissions'
        ) {
            await replaceAccessControlStaffRolePermissions(
                parsed.data.roleCode,
                parsed.data.permissionCodes,
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
}