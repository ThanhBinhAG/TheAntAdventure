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
import {
    accessControlRoleUpdateBodySchema,
} from '@/lib/access-control/role-input';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  accessControlError,
  accessControlPermissionError,
} from '@/lib/access-control/api-error';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';


/** Chuyển lỗi database thành HTTP response an toàn cho frontend. */
function errorResponse(error: unknown) {
    if (error instanceof AccessControlRpcError) {
        if (error.code === '42501') {
            return NextResponse.json(
                accessControlError('ACCESS_DENIED', error.message),
                { status: 403 },
            );
        }

        if (error.code === '22023') {
            return NextResponse.json(
                accessControlError(
                    'INVALID_ACCESS_CONTROL_REQUEST',
                    error.message,
                ),
                { status: 400 },
            );
        }

        if (error.code === '23505') {
            return NextResponse.json(
                accessControlError(
                    'PERMISSION_CODE_EXISTS',
                    'Mã quyền này đã tồn tại.',
                ),
                { status: 409 },
            );
        }
    }

    return NextResponse.json(
        accessControlError(
            'ACCESS_CONTROL_REQUEST_FAILED',
            'Không thể xử lý yêu cầu phân quyền.',
        ),
        { status: 500 },
    );
}

/** Lấy dữ liệu cho màn hình Quản lý người dùng & phân quyền. */
export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'access-control', route: '/api/access-control' },
  async (_request, _context, { logger }) => {
    const permission = await checkPermissionForRequest('users.manage');

    if (!permission.allowed) {
        logger.warn({ event: 'access_control.permission.denied', statusCode: permission.status }, 'Access Control permission denied');
        return NextResponse.json(
            accessControlPermissionError(permission.status),
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
        logger.error({ event: 'access_control.data_load.failed', err: error }, 'Access Control data load failed');
        return errorResponse(error);
    }
  },
);

/** Đổi role user hoặc cập nhật permission của role. */
export const PATCH = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'access-control', route: '/api/access-control' },
  async (request, _context, { logger }) => {
    const permission = await checkPermissionForRequest('users.manage');

    if (!permission.allowed) {
        logger.warn({ event: 'access_control.permission.denied', statusCode: permission.status }, 'Access Control permission denied');
        return NextResponse.json(
            accessControlPermissionError(permission.status),
            { status: permission.status },
        );
    }
    const body = await request.json().catch(() => null);
    const parsed = accessControlRoleUpdateBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            accessControlError(
                'INVALID_ACCESS_CONTROL_REQUEST',
                'Dữ liệu cập nhật không hợp lệ.',
            ),
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
        logger.info({ event: 'access_control.role_or_permission.updated', action: parsed.data.action }, 'Access Control mutation succeeded');
        return NextResponse.json({ ok: true });
    } catch (error) {
        logger.error({ event: 'access_control.role_or_permission.update.failed', err: error }, 'Access Control mutation failed');
        return errorResponse(error);
    }
  },
);

export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'access-control', route: '/api/access-control' },
  async (request, _context, { logger }) => {
    // UI có thể bị sửa bằng DevTools, nên vẫn kiểm tra quyền ở API và RPC.
    const permission = await checkPermissionForRequest('users.manage');

    if (!permission.allowed) {
        logger.warn({ event: 'access_control.permission.denied', statusCode: permission.status }, 'Access Control permission denied');
        return NextResponse.json(
            accessControlPermissionError(permission.status),
            { status: permission.status },
        );
    }

    const body = await request.json().catch(() => null);
    const parsed = createAccessControlPermissionBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            accessControlError(
                'INVALID_ACCESS_CONTROL_REQUEST',
                'Dữ liệu chức năng không hợp lệ.',
            ),
            { status: 400 },
        );
    }

    try {
        await createAccessControlPermission(parsed.data);

        logger.info({ event: 'access_control.permission.created' }, 'Access Control permission created');
        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
        logger.error({ event: 'access_control.permission.create.failed', err: error }, 'Access Control permission creation failed');
        return errorResponse(error);
    }
  },
);
