/**
 * Layout chung cho các trang CRM đã đăng nhập.
 * Chrome + PermissionsProvider nằm trong CRMShell (toast/confirm + quyền).
 * Không áp dụng cho /login hoặc system/debug ngoài nhóm (crm).
 */
import CRMShell from '@/components/CRMShell';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return <CRMShell>{children}</CRMShell>;
}
