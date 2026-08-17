/**
 * Contract request quản lý role nhân viên động.
 *
 * Route chỉ dùng các schema này trước khi chuyển quyền quyết định cuối cùng
 * cho RPC Supabase, nhờ đó cùng quy tắc được kiểm thử độc lập.
 */

import { z } from 'zod';
import { accessControlRoleCodeSchema } from './role-input';

/** Payload tạo role nhân viên. */
export const createAccessControlStaffRoleBodySchema = z.object({
    code: accessControlRoleCodeSchema,
    label: z.string()
        .trim()
        .min(1, 'Tên role không được để trống.')
        .max(100, 'Tên role tối đa 100 ký tự.'),
    description: z.string().trim().max(500).optional(),
    sortOrder: z.number().int().min(0).max(10_000).default(0),
});

/** Payload sửa role hoặc thay toàn bộ permission của role. */
export const updateAccessControlStaffRoleBodySchema =
    z.discriminatedUnion('action', [
        z.object({
            action: z.literal('update_role'),
            code: accessControlRoleCodeSchema,
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
            roleCode: accessControlRoleCodeSchema,
            permissionCodes: z.array(z.string().min(1)).max(100),
        }),
    ]);

/** DELETE chỉ nhận mã; RPC chặn role hệ thống và role còn user. */
export const deleteAccessControlStaffRoleBodySchema = z.object({
    code: accessControlRoleCodeSchema,
});
