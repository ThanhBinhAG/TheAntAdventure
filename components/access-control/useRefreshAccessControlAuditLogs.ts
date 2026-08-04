'use client';

/**
 * Làm mới cache lịch sử thay đổi của Access Control.
 *
 * Chức năng:
 * - Dùng sau khi tạo/sửa user, đổi role hoặc cập nhật role và permission.
 * - Chỉ tải lại các trang audit log đã có trong cache SWR.
 * - Không tải lại toàn bộ trang CRM và không cần router.refresh().
 */

import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

/** Tiền tố chung cho mọi key cache lịch sử Access Control. */
export const ACCESS_CONTROL_AUDIT_LOGS_KEY =
    'access-control/audit-logs';

/** Trả về hàm làm mới audit log ở nền sau một thao tác lưu thành công. */
export default function useRefreshAccessControlAuditLogs() {
    const { mutate } = useSWRConfig();

    return useCallback((): void => {
        // Nếu tab Lịch sử chưa từng mở thì chưa có cache phù hợp,
        // nên SWR không tạo request thừa. Khi mở tab sau đó, nó sẽ tải dữ liệu mới.
        void mutate(
            (key) =>
                Array.isArray(key) &&
                key[0] === ACCESS_CONTROL_AUDIT_LOGS_KEY,
        ).catch(() => undefined);
    }, [mutate]);
}
