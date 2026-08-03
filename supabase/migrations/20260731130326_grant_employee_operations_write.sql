-- Cấp quyền thao tác nhóm Vận hành cho role employee.
--
-- Nhóm Operations gồm:
-- - Planner
-- - Bookings
-- - Contracts
-- - Suppliers
-- - Guides
-- - Post-tour & Feedback
--
-- Permission này chuẩn bị cho các kiểm tra nút/API ở giai đoạn sau.
-- Hiện tại nó ghi nhận chính sách nghiệp vụ trong database.

insert into public.role_permissions (role_code, permission_code)
values ('employee', 'operations.write')
on conflict do nothing;