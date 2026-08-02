/**
 * Page wrapper cho URL /access-control.
 *
 * Chức năng:
 * - Được PAGE_COMPONENTS nạp khi user mở /access-control.
 * - Giữ quy ước: components/pages chỉ là lớp page mỏng.
 * - Giao diện chi tiết nằm trong components/access-control.
 */

import AccessControlPage from '@/components/access-control/AccessControlPage';

export default function AccessControl() {
    return <AccessControlPage />;
}