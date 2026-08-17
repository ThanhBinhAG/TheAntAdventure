/** Contract phân trang lịch sử thay đổi phân quyền. */

import { z } from 'zod';

/** Không nhận page/pageSize bất thường trước khi truy vấn audit log. */
export const accessControlAuditLogsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
