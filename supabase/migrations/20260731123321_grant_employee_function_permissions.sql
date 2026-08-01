-- Cấp thêm quyền theo nhóm chức năng cho role employee.
--
-- Mục tiêu:
-- - Employee được xuất Proposal PDF để gửi khách.
-- - Employee được xuất Pricing PDF theo chính sách V1.
-- - Employee được thao tác Catalogue, gồm sản phẩm, ảnh và điểm tham quan.
--
-- Lưu ý:
-- - Chỉ gán permission đã tồn tại, không tạo role hoặc user mới.
-- - `on conflict do nothing` giúp migration chạy an toàn nếu quyền đã được gán.

insert into public.role_permissions (role_code, permission_code)
values
  ('employee', 'tour_design.export'),
  ('employee', 'pricing.export'),
  ('employee', 'catalogue.write')
on conflict do nothing;