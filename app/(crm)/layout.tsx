/**
 * Layout chung cho các trang CRM đã đăng nhập.
 *
 * Chức năng:
 * - Lấy quyền hiệu lực ở server trước khi giao diện CRM xuất hiện.
 * - Truyền quyền xuống CRMShell để giao diện không phải gọi lại API quyền.
 * - Không áp dụng cho /login.
 */
import CRMShell from '@/components/CRMShell';
import { getInitialPermissionCodesForCRMLayout } from '@/lib/auth/permissions-server';

export default async function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Lấy quyền từ database bằng session cookie hiện tại.
  // Middleware đã bảo vệ route; null chỉ được đổi thành mảng rỗng để an toàn.
  const initialPermissionCodes =
    (await getInitialPermissionCodesForCRMLayout()) ?? [];

  return (
    <CRMShell initialPermissionCodes={initialPermissionCodes}>
      {children}
    </CRMShell>
  );
}