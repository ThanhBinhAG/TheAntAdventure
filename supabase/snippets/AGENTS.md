# supabase/snippets/ — Agent overview

## Role
SQL tay cho SQL Editor: gán / kiểm tra role RBAC. Không thay `migrations/` hay `schema.sql`.

## Contents
- `add_employee.sql` — gán role `employee` (đổi email)
- `add_sales_product_user.sql` — tạo/gán role `sales_product` (Sales & Product only)
- `check_user_roles.sql` — liệt kê user / role / permission

## Canonical bootstrap (không copy vào đây)
Dùng file gốc ở `supabase/`:
1. `reset-v5.sql` → 2. `schema.sql` → 3. `import-v5-data.sql` → 4. `verify-counts-v5.sql` → Auth → 5. `rls-authenticated.sql` → rồi `migrations/` RBAC.

## Boundaries
- Không chạy `reset-v5.sql` trên production có data thật.
- RBAC DDL: `supabase/migrations/*rbac*` / `*grant_employee*`.
