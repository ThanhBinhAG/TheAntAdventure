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
} from '@/lib/auth/access-control-admin';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
    accessControlUsersQuerySchema,
    accessControlUserUpdateBodySchema,
    createAccessControlUserBodySchema,
    optionalAccessControlQueryParam,
} from '@/lib/access-control/user-input';

export const dynamic = 'force-dynamic';

/** Chuyển lỗi RPC thành HTTP response phù hợp. */
function errorResponse(error: unknown) {
    if (error instanceof AccessControlAuthAdminError) {
        return NextResponse.json(
            {
                ok: false,
                error: error.message,
            },
            { status: error.status },
        );
    }

    if (error instanceof AccessControlRpcError) {
        if (
            error.code === '42501' ||
            error.code === '22023'
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: error.message,
                },
                {
                    status: error.code === '42501'
                        ? 403
                        : 400,
                },
            );
        }
    }

    return NextResponse.json(
        {
            ok: false,
            error: 'Không thể xử lý thao tác người dùng.',
        },
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
    const parsed = createAccessControlUserBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                ok: false,
                error: 'Dữ liệu tạo tài khoản không hợp lệ.',
            },
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

        return NextResponse.json(
            {
                ok: true,
                userId: createdUserId,
            },
            { status: 201 },
        );
    } catch (error) {
        if (createdUserId) {
            try {
                await rollbackNewAccessControlAuthUser(createdUserId);
            } catch {
                // Giữ lỗi gốc để client nhận được lý do tạo tài khoản thất bại.
            }
        }

        return errorResponse(error);
    }
}

export async function GET(request: Request) {
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

    const parsed = accessControlUsersQuerySchema.safeParse({
        q: optionalAccessControlQueryParam(url, 'q'),
        role: optionalAccessControlQueryParam(url, 'role'),
        status: optionalAccessControlQueryParam(url, 'status'),
        page: optionalAccessControlQueryParam(url, 'page'),
        pageSize: optionalAccessControlQueryParam(url, 'pageSize'),
    });

    if (!parsed.success) {
        return NextResponse.json(
            {
                ok: false,
                error: 'Bộ lọc danh sách user không hợp lệ.',
            },
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
        return errorResponse(error);
    }
}

/**
 * Sửa tên, thay đổi trạng thái hoặc khôi phục user.
 *
 * Database RPC tự kiểm tra users.manage thêm một lần nữa.
 */
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
    const parsed = accessControlUserUpdateBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                ok: false,
                error: 'Dữ liệu cập nhật user không hợp lệ.',
            },
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

        return NextResponse.json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
}
