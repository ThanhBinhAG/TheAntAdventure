# supabase/migrations/ — Agent overview

## Role
CLI migrations (`db:push`). Incremental SQL dated; do not paste bootstrap copies here.

## Durable CRM session persistence

- `20260821113000_add_durable_crm_sessions.sql` created the legacy encrypted-payload table.
- `20260827104813_durable_crm_sessions_v2.sql` upgrades it for the active CRM-owned opaque-session contract. Apply the chain once with `db:push`; do not alter either applied migration.
- Do not add HMAC cookie-session migrations. The Phase 2 design hashes high-entropy opaque tokens and encrypts Supabase credentials server-side.

## Contents (current chain)
- `20260730042242_02_migrations.sql` — schema CRM (thay baseline cũ)
- `20260730071047_add_data.sql` — seed data
- `20260730074120_rbac_foundation.sql` — profiles / roles / permissions
- `20260730131029_simplify_roles_to_admin_employee.sql` — chỉ còn `admin` + `employee`
- `20260731123321_grant_employee_function_permissions.sql` — export / catalogue.write
- `20260731125854_…operations_write.sql` — no-op (giữ version history)
- `20260731130326_…operations_write.sql` — `employee` + `operations.write`
- `20260802160347_add_photo_folders.sql` — `photo_folders` + `photos.folder_id` (Unsorted)
- `20260805060000_add_photo_gallery_assets.sql` — `photo_gallery_assets`; bảng này đã bị migration sau drop, giữ file để không phá history
- `20260805133000_drop_photo_gallery_assets.sql` — drop `photo_gallery_assets` (gộp về một pipeline ảnh trên bảng `photos`)
- `20260811062000_add_proposal_templates.sql` — `proposal_templates` (b2c/b2b company copy)
- `20260817110000_slim_product_list_facets_rpc.sql` — `list_product_facets` selects filter columns only (no `p.*`)
- `20260821100600_add_product_catalogue_import_transaction.sql` — transactional Product/Pricing catalogue replacement RPC
- `20260821110000_add_catalogue_aggregate_transactions.sql` — atomic Product/Attraction aggregate mutation RPCs
- `20260821113000_add_durable_crm_sessions.sql` — legacy encrypted-payload CRM session table
- `20260827104813_durable_crm_sessions_v2.sql` — opaque CRM session token hash and encrypted Supabase credential persistence
- `20260824043803_add_authz_version_and_security_audit.sql` — per-user authz version + server-only auth audit

## Boundaries
- Role helpers / gán user: `supabase/snippets/`.
- Fresh SQL Editor install vẫn có thể dùng `schema.sql` + `import-v5-data.sql` rồi push RBAC.
- Không xóa migration đã từng apply trên remote; để trống có comment nếu cần hủy nội dung.
