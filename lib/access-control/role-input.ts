/**
 * Contract dữ liệu cho các thao tác đổi role và permission hệ thống.
 *
 * Giữ schema ngoài Route Handler để test trực tiếp mọi payload từ UI,
 * DevTools hoặc API client mà không cần dựng HTTP server.
 */

import { z } from 'zod';

/** Mã role động, ví dụ sales hoặc tour_operator. */
export const accessControlRoleCodeSchema = z.string()
    .trim()
    .regex(
        /^[a-z0-9_]{2,50}$/,
        'Mã role không hợp lệ.',
    );

/** Dữ liệu PATCH hợp lệ cho /api/access-control. */
export const accessControlRoleUpdateBodySchema =
    z.discriminatedUnion('action', [
        z.object({
            action: z.literal('set_user_role'),
            userId: z.string().uuid('userId không hợp lệ.'),
            // RPC database vẫn là lớp quyết định role có tồn tại/được gán hay không.
            roleCode: accessControlRoleCodeSchema,
        }),
        z.object({
            action: z.literal('replace_role_permissions'),
            // Role hệ thống không được thay permission qua API này.
            roleCode: z.enum(['employee']),
            permissionCodes: z.array(z.string().min(1)).max(100),
        }),
    ]);
