/** Contract bộ lọc lịch sử đăng nhập dùng tại API trước khi gọi RPC. */

import { isIP } from 'node:net';
import { z } from 'zod';

const deviceTypeSchema = z.enum([
    'desktop',
    'mobile',
    'tablet',
    'unknown',
]);

/** Chỉ chấp nhận IP, thời gian và kiểu thiết bị mà RPC hiểu được. */
export const authLoginHistoryQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
    userId: z.string().uuid().optional(),
    user: z.string().trim().min(1).max(120).optional(),
    ip: z.string()
        .trim()
        .refine((value) => isIP(value) !== 0, 'IP không hợp lệ.')
        .optional(),
    deviceType: deviceTypeSchema.optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
});

/** Đọc URL một lần để null được đổi thành undefined trước khi Zod default. */
export function parseAuthLoginHistoryQuery(url: URL) {
    return authLoginHistoryQuerySchema.safeParse({
        page: url.searchParams.get('page') ?? undefined,
        pageSize: url.searchParams.get('pageSize') ?? undefined,
        userId: url.searchParams.get('userId') ?? undefined,
        user: url.searchParams.get('user') ?? undefined,
        ip: url.searchParams.get('ip') ?? undefined,
        deviceType: url.searchParams.get('deviceType') ?? undefined,
        from: url.searchParams.get('from') ?? undefined,
        to: url.searchParams.get('to') ?? undefined,
    });
}
