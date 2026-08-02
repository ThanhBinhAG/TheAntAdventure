/**
 * API danh sách user cho màn hình Access Control.
 *
 * Chức năng:
 * - Tìm theo tên/email.
 * - Lọc theo role và trạng thái.
 * - Phân trang dữ liệu ở server.
 * - Trả thêm thống kê user theo role.
 * - Tạo Auth user, profile và role ban đầu.
 *
 * Bảo mật:
 * - API kiểm tra users.manage.
 * - RPC trong database kiểm tra users.manage lần nữa.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
    AccessControlRpcError,
    getAccessControlUserSummary,
    getAccessControlUsersPage,
    restoreAccessControlUser,
    setAccessControlUserActive,
    setAccessControlUserRole,
    softDeleteAccessControlUser,
    updateAccessControlUserProfile,
} from '@/lib/access-control/server';
import {
    AccessControlAuthAdminError,
    createAccessControlAuthUser,
    rollbackNewAccessControlAuthUser,
} from '@/lib/auth/access-control-admin';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';

export const dynamic = 'force-dynamic';

/** Schema kiểm tra query string của API. */
const querySchema = z.object({
    q: z.string().trim().max(100).optional(),
    role: z.enum([
        'super_admin',
        'admin',
        'employee',
        'unassigned',
    ]).optional(),
    status: z.enum([
        'active',
        'inactive',
    ]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * Dữ liệu các thao tác cập nhật user.
 *
 * action giúp một API xử lý rõ từng loại thao tác,
 * nhưng vẫn kiểm tra dữ liệu đầu vào bằng Zod.
 */
const updateBodySchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('update_profile'),
        userId: z.string().uuid('userId không hợp lệ.'),
        displayName: z.string()
            .trim()
            .min(1, 'Tên hiển thị không được để trống.')
            .max(100, 'Tên hiển thị tối đa 100 ký tự.'),
    }),
    z.object({
        action: z.literal('set_active'),
        userId: z.string().uuid('userId không hợp lệ.'),
        isActive: z.boolean(),
    }),
    z.object({
        action: z.literal('restore'),
        userId: z.string().uuid('userId không hợp lệ.'),
    }),
]);

/** DELETE chỉ xóa mềm một user theo ID. */
const deleteBodySchema = z.object({
    userId: z.string().uuid('userId không hợp lệ.'),
});

/** Dữ liệu cần có để tạo một tài khoản CRM mới. */
const createBodySchema = z.object({
    email: z.string()
        .trim()
        .email('Email không hợp lệ.')
        .max(255, 'Email tối đa 255 ký tự.'),
    password: z.string()
        .min(8, 'Mật khẩu cần ít nhất 8 ký tự.')
        .max(72, 'Mật khẩu tối đa 72 ký tự.'),
    displayName: z.string()
        .trim()
        .min(1, 'Tên hiển thị không được để trống.')
        .max(100, 'Tên hiển thị tối đa 100 ký tự.'),
    roleCode: z.enum([
        'super_admin',
        'admin',
        'employee',
    ]),
});

/** Đọc query param rỗng thành undefined. */
function optionalQueryParam(
    url: URL,
    name: string,
): string | undefined {
    return url.searchParams.get(name) || undefined;
}

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
 * 3. RPC cập nhật tên và gán role bằng session Super Admin hiện tại.
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
    const parsed = createBodySchema.safeParse(body);

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

    const parsed = querySchema.safeParse({
        q: optionalQueryParam(url, 'q'),
        role: optionalQueryParam(url, 'role'),
        status: optionalQueryParam(url, 'status'),
        page: optionalQueryParam(url, 'page'),
        pageSize: optionalQueryParam(url, 'pageSize'),
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
        const [usersPage, summary] = await Promise.all([
            getAccessControlUsersPage({
                searchText: parsed.data.q,
                roleCode: parsed.data.role ?? null,
                isActive,
                page: parsed.data.page,
                pageSize: parsed.data.pageSize,
            }),
            getAccessControlUserSummary(),
        ]);

        return NextResponse.json(
            {
                ok: true,
                ...usersPage,
                summary,
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
    const parsed = updateBodySchema.safeParse(body);

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

/**
 * Xóa mềm user.
 *
 * User không còn hiện trong danh sách và không còn permission,
 * nhưng dữ liệu CRM/audit log vẫn được giữ.
 */
export async function DELETE(request: Request) {
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
    const parsed = deleteBodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                ok: false,
                error: 'Dữ liệu xóa user không hợp lệ.',
            },
            { status: 400 },
        );
    }

    try {
        await softDeleteAccessControlUser(parsed.data.userId);

        return NextResponse.json({ ok: true });
    } catch (error) {
        return errorResponse(error);
    }
}
