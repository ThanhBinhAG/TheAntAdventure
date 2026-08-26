/**
 * Layout chung cho các trang CRM đã đăng nhập.
 *
 * Chức năng:
 * - Lấy quyền hiệu lực + email đã che ở server trước khi giao diện CRM xuất hiện.
 * - Truyền xuống CRMShell để giao diện không phải gọi lại API quyền/profile.
 * - Không áp dụng cho /login.
 */
import CRMShell from '@/components/CRMShell';
import { getCRMLayoutBoot } from '@/lib/auth/permissions-server';

export default async function CRMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Một lần getAuthContext trong getCRMLayoutBoot (permissions + masked email).
  const { permissionCodes, sessionEmailMasked } = await getCRMLayoutBoot();

  return (
    <CRMShell
      initialPermissionCodes={permissionCodes}
      sessionEmailMasked={sessionEmailMasked}
    >
      {children}
    </CRMShell>
  );
}
