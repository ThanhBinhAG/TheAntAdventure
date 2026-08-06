/**
 * Kiểm tra payload tạo permission trước khi API gọi Supabase RPC.
 *
 * Tách schema khỏi Route Handler để test được các trường hợp client hoặc
 * DevTools gửi dữ liệu không hợp lệ mà không cần tạo request HTTP thật.
 */

import { z } from 'zod';

const permissionGroupCodeSchema = z.string()
    .trim()
    .regex(
        /^[a-z][a-z0-9_]{1,49}$/,
        'Mã nhóm quyền không hợp lệ.',
    );

const permissionCodeSchema = z.string()
    .trim()
    .regex(
        /^[a-z][a-z0-9_]{1,49}\.[a-z][a-z0-9_]{1,49}$/,
        'Mã quyền phải theo dạng module.action.',
    )
    .refine(
        (code) => !['*', 'users.manage'].includes(code),
        'Không được dùng mã quyền hệ thống.',
    );

export const createAccessControlPermissionBodySchema = z.object({
    code: permissionCodeSchema,
    description: z.string()
        .trim()
        .min(1, 'Tên chức năng không được để trống.')
        .max(200, 'Tên chức năng tối đa 200 ký tự.'),
    groupCode: permissionGroupCodeSchema,
    groupLabel: z.string()
        .trim()
        .min(1, 'Tên nhóm quyền không được để trống.')
        .max(100, 'Tên nhóm quyền tối đa 100 ký tự.'),
    groupSortOrder: z.number()
        .int()
        .min(0)
        .max(10_000)
        .optional(),
});
