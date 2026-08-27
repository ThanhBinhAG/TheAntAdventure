/**
 * API quản lý role nhân viên động.
 *
 * Chức năng:
 * - GET: lấy danh sách role nhân viên.
 * - POST: tạo role mới.
 * - PATCH: sửa role hoặc lưu permission.
 * - DELETE: xóa role không còn nhân viên nào được gán.
 */

import { NextResponse } from 'next/server';
import {
    AccessControlRpcError,
    createAccessControlStaffRole,
    deleteAccessControlStaffRole,
    getAccessControlStaffRoles,
    getAccessControlStaffRoleResourceScopes,
    replaceAccessControlStaffRolePermissions,
    replaceAccessControlStaffRoleResourceScopes,
    updateAccessControlStaffRole,
} from '@/lib/access-control/server';
import {
    getStaffRoleRpcErrorResponse,
} from '@/lib/access-control/staff-role-error';
import {
    createAccessControlStaffRoleBodySchema,
    deleteAccessControlStaffRoleBodySchema,
    updateAccessControlStaffRoleBodySchema,
} from '@/lib/access-control/staff-role-input';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
    accessControlError,
    accessControlPermissionError,
} from '@/lib/access-control/api-error';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

/** Đổi lỗi RPC thành HTTP response an toàn cho frontend. */
function errorResponse(error: unknown) {
    if (error instanceof AccessControlRpcError) {
        const response = getStaffRoleRpcErrorResponse(
            error.code,
            error.message,
        );

        if (response) {
            return NextResponse.json(
                accessControlError(
                    error.code === '23505'
                        ? 'ROLE_CODE_EXISTS'
                        : error.code === '23503'
                            ? 'ROLE_IN_USE'
                            : error.code === '42501'
                                ? 'ACCESS_DENIED'
                                : 'INVALID_STAFF_ROLE_UPDATE_REQUEST',
                    response.error,
                ),
                { status: response.status },
            );
        }
    }

    return NextResponse.json(
        accessControlError(
            'STAFF_ROLE_OPERATION_FAILED',
            'Không thể xử lý yêu cầu role nhân viên.',
        ),
        { status: 500 },
    );
}

/** Lấy danh sách role nhân viên động. */
export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
    { scope: 'access-control/staff-roles', route: '/api/access-control/staff-roles' },
    async (_request, _context, { logger }) => {
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

    try {
        const [roles, resourceScopes] = await Promise.all([
            getAccessControlStaffRoles(),
            getAccessControlStaffRoleResourceScopes(),
        ]);

        const rolesWithScopes = roles.map((role) => ({
            ...role,
            resource_scopes: resourceScopes.filter(
                (scope) => scope.role_code === role.role_code,
            ),
        }));

        return NextResponse.json(
            { ok: true, roles: rolesWithScopes },
            {
                headers: {
                    // SWR ở browser chịu trách nhiệm cache ngắn hạn.
                    'Cache-Control': 'no-store',
                },
            },
        );
    } catch (error) {
        logger.error({ event: 'access_control.staff_roles.load.failed', err: error }, 'Staff role load failed');
        return errorResponse(error);
    }
    },
);

/** Tạo role nhân viên mới. */
export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
    { scope: 'access-control/staff-roles', route: '/api/access-control/staff-roles' },
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

    const body = await request.json().catch(() => null);
    const parsed = createAccessControlStaffRoleBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            accessControlError(
                'INVALID_STAFF_ROLE_REQUEST',
                'Dữ liệu role không hợp lệ.',
            ),
            { status: 400 },
        );
    }

    try {
        await createAccessControlStaffRole(parsed.data);

        logger.info({ event: 'access_control.staff_role.created' }, 'Staff role created');
        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
        logger.error({ event: 'access_control.staff_role.create.failed', err: error }, 'Staff role creation failed');
        return errorResponse(error);
    }
    },
);

/** Sửa thông tin role hoặc permission của role. */
export const PATCH = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
    { scope: 'access-control/staff-roles', route: '/api/access-control/staff-roles' },
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

    const body = await request.json().catch(() => null);
    const parsed = updateAccessControlStaffRoleBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            accessControlError(
                'INVALID_STAFF_ROLE_UPDATE_REQUEST',
                'Dữ liệu cập nhật role không hợp lệ.',
            ),
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

        if (
            parsed.data.action ===
            'replace_role_resource_scopes'
        ) {
            await replaceAccessControlStaffRoleResourceScopes(
                parsed.data.roleCode,
                parsed.data.scopes,
            );
        }

        logger.info({ event: 'access_control.staff_role.updated', action: parsed.data.action }, 'Staff role updated');
        return NextResponse.json({ ok: true });
    } catch (error) {
        logger.error({ event: 'access_control.staff_role.update.failed', err: error }, 'Staff role update failed');
        return errorResponse(error);
    }
    },
);

/** Xóa role nhân viên động đã không còn được gán cho user nào. */
export const DELETE = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
    { scope: 'access-control/staff-roles', route: '/api/access-control/staff-roles' },
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

    const body = await request.json().catch(() => null);
    const parsed = deleteAccessControlStaffRoleBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            accessControlError(
                'INVALID_STAFF_ROLE_CODE',
                'Mã role không hợp lệ.',
            ),
            { status: 400 },
        );
    }

    try {
        await deleteAccessControlStaffRole(parsed.data.code);

        logger.info({ event: 'access_control.staff_role.deleted' }, 'Staff role deleted');
        return NextResponse.json({ ok: true });
    } catch (error) {
        logger.error({ event: 'access_control.staff_role.delete.failed', err: error }, 'Staff role deletion failed');
        return errorResponse(error);
    }
    },
);
