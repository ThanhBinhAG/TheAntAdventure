/** Contract request và query cho danh sách, tạo và sửa user Access Control. */

import { z } from 'zod';
import { accessControlRoleCodeSchema } from './role-input';

/** Query được kiểm tra trước khi gọi RPC phân trang. */
export const accessControlUsersQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    role: accessControlRoleCodeSchema.optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

/** Các thao tác PATCH được giới hạn để tránh field ngoài ý muốn. */
export const accessControlUserUpdateBodySchema =
    z.discriminatedUnion('action', [
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

/** Dữ liệu tối thiểu để tạo Auth user, profile và role ban đầu. */
export const createAccessControlUserBodySchema = z.object({
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
    roleCode: accessControlRoleCodeSchema,
});

/** Chuyển query rỗng thành undefined để schema áp dụng giá trị mặc định đúng. */
export function optionalAccessControlQueryParam(
    url: URL,
    name: string,
): string | undefined {
    return url.searchParams.get(name) || undefined;
}
