/**
 * API danh sách user cho màn hình Access Control.
 *
 * Chức năng:
 * - Tìm theo tên/email.
 * - Lọc theo role và trạng thái.
 * - Phân trang dữ liệu ở server.
 * - Tạo Auth user, profile và role ban đầu.
 *
 * Bảo mật:
 * - API kiểm tra users.manage.
 * - RPC trong database kiểm tra users.manage lần nữa.
 */

import { NextResponse } from 'next/server';
import {
    AccessControlRpcError,
    getAccessControlUsersPage,
    restoreAccessControlUser,
    setAccessControlUserActive,
    setAccessControlUserRole,
    updateAccessControlUserProfile,
} from '@/lib/access-control/server';
import {
    AccessControlAuthAdminError,
    createAccessControlAuthUser,
    rollbackNewAccessControlAuthUser,
    updateAccessControlUserPassword,
} from '@/lib/auth/access-control-admin';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
    accessControlUsersQuerySchema,
    accessControlUserUpdateBodySchema,
    createAccessControlUserBodySchema,
    optionalAccessControlQueryParam,
} from '@/lib/access-control/user-input';
import {
    accessControlError,
    accessControlPermissionError,
} from '@/lib/access-control/api-error';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

export const dynamic = 'force-dynamic';

/** Chuyển lỗi RPC thành HTTP response phù hợp. */
function errorResponse(error: unknown) {
    if (error instanceof AccessControlAuthAdminError) {
        return NextResponse.json(
            accessControlError(
                error.status === 503
                    ? 'AUTH_ADMIN_UNAVAILABLE'
                    : error.status === 403
                        ? 'RESERVED_EMAIL_FORBIDDEN'
                        : 'USER_EMAIL_UNAVAILABLE',
                error.message,
            ),
            { status: error.status },
        );
    }

    if (error instanceof AccessControlRpcError) {
        if (
            error.code === '42501' ||
            error.code === '22023'
        ) {
            return NextResponse.json(
                accessControlError(
                    error.code === '42501'
                        ? 'ACCESS_DENIED'
                        : 'INVALID_USER_UPDATE_REQUEST',
                    error.message,
                ),
                {
                    status: error.code === '42501'
                        ? 403
                        : 400,
                },
            );
        }
    }

    return NextResponse.json(
        accessControlError(
            'USER_OPERATION_FAILED',
            'Không thể xử lý thao tác người dùng.',
        ),
        { status: 500 },
    );
}

/**
 * Tạo tài khoản mới từ giao diện Access Control.
 *
 * Trình tự:
 * 1. Service-role tạo user trong auth.users.
 * 2. Trigger database tự tạo profiles.
// 3. RPC cập nhật tên và gán role bằng session người quản trị hiện tại.
 * 4. Nếu bước 2 hoặc 3 lỗi, xóa Auth user vừa tạo để tránh dữ liệu dở dang.
 */
export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
    { scope: 'access-control/users', route: '/api/access-control/users' },
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
    const parsed = createAccessControlUserBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            accessControlError(
                'INVALID_USER_CREATE_REQUEST',
                'Dữ liệu tạo tài khoản không hợp lệ.',
            ),
            { status: 400 },
        );
    }

    let createdUserId: string | null = null;

    try {
        createdUserId = await createAccessControlAuthUser({
            email: parsed.data.email,
            password: parsed.data.password,
        });

        // Trigger handle_new_user_profile đã tạo profile ngay khi Auth user ra đời.
        await updateAccessControlUserProfile(
            createdUserId,
            parsed.data.displayName,
        );

        // RPC này tự kiểm tra users.manage và ghi audit log đổi role.
        await setAccessControlUserRole(
            createdUserId,
            parsed.data.roleCode,
        );

        logger.info({ event: 'access_control.user.created' }, 'Access Control user created');
        return NextResponse.json(
            {
                ok: true,
                userId: createdUserId,
            },
            { status: 201 },
        );
    } catch (error) {
        logger.error({ event: 'access_control.user.create.failed', err: error }, 'Access Control user creation failed');
        if (createdUserId) {
            try {
                await rollbackNewAccessControlAuthUser(createdUserId);
            } catch {
                // Giữ lỗi gốc để client nhận được lý do tạo tài khoản thất bại.
            }
        }

        return errorResponse(error);
    }
    },
);

export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
    { scope: 'access-control/users', route: '/api/access-control/users' },
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

    const parsed = accessControlUsersQuerySchema.safeParse({
        q: optionalAccessControlQueryParam(url, 'q'),
        role: optionalAccessControlQueryParam(url, 'role'),
        status: optionalAccessControlQueryParam(url, 'status'),
        page: optionalAccessControlQueryParam(url, 'page'),
        pageSize: optionalAccessControlQueryParam(url, 'pageSize'),
    });

    if (!parsed.success) {
        return NextResponse.json(
            accessControlError(
                'INVALID_USER_LIST_FILTER',
                'Bộ lọc danh sách user không hợp lệ.',
            ),
            { status: 400 },
        );
    }

    const isActive =
        parsed.data.status === 'active'
            ? true
            : parsed.data.status === 'inactive'
                ? false
                : undefined;

    try {
        const usersPage = await getAccessControlUsersPage({
            searchText: parsed.data.q,
            roleCode: parsed.data.role ?? null,
            isActive,
            page: parsed.data.page,
            pageSize: parsed.data.pageSize,
        });

        return NextResponse.json(
            {
                ok: true,
                ...usersPage,
            },
            {
                headers: {
                    'Cache-Control': 'no-store',
                },
            },
        );
    } catch (error) {
        logger.error({ event: 'access_control.user.list.failed', err: error }, 'Access Control user list failed');
        return errorResponse(error);
    }
    },
);

/**
 * Sửa tên, thay đổi trạng thái hoặc khôi phục user.
 *
 * Database RPC tự kiểm tra users.manage thêm một lần nữa.
 */
export const PATCH = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
    { scope: 'access-control/users', route: '/api/access-control/users' },
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
    const parsed = accessControlUserUpdateBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            accessControlError(
                'INVALID_USER_UPDATE_REQUEST',
                'Dữ liệu cập nhật user không hợp lệ.',
            ),
            { status: 400 },
        );
    }

    try {
        if (parsed.data.action === 'update_profile') {
            await updateAccessControlUserProfile(
                parsed.data.userId,
                parsed.data.displayName,
            );
        }

        if (parsed.data.action === 'set_active') {
            await setAccessControlUserActive(
                parsed.data.userId,
                parsed.data.isActive,
            );
        }

        if (parsed.data.action === 'restore') {
            await restoreAccessControlUser(
                parsed.data.userId,
            );
        }

        if (parsed.data.action === 'change_password') {
            await updateAccessControlUserPassword(
                parsed.data.userId,
                parsed.data.password,
            );
        }

        logger.info({ event: 'access_control.user.updated', action: parsed.data.action }, 'Access Control user updated');
        return NextResponse.json({ ok: true });
    } catch (error) {
        logger.error({ event: 'access_control.user.update.failed', err: error }, 'Access Control user update failed');
        return errorResponse(error);
    }
    },
);
