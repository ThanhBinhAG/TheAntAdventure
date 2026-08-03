# supabase/migrations/ — Agent overview

## Role
CLI migrations (`db:push`). Incremental SQL dated; do not paste bootstrap copies here.

## Contents (current chain)
- `20260730042242_02_migrations.sql` — schema CRM (thay baseline cũ)
- `20260730071047_add_data.sql` — seed data
- `20260730074120_rbac_foundation.sql` — profiles / roles / permissions
- `20260730131029_simplify_roles_to_admin_employee.sql` — chỉ còn `admin` + `employee`
- `20260731123321_grant_employee_function_permissions.sql` — export / catalogue.write
- `20260731125854_…operations_write.sql` — no-op (giữ version history)
- `20260731130326_…operations_write.sql` — `employee` + `operations.write`
- `20260802160347_add_photo_folders.sql` — `photo_folders` + `photos.folder_id` (Unsorted)

## Boundaries
- Role helpers / gán user: `supabase/snippets/`.
- Fresh SQL Editor install vẫn có thể dùng `schema.sql` + `import-v5-data.sql` rồi push RBAC.
- Không xóa migration đã từng apply trên remote; để trống có comment nếu cần hủy nội dung.
