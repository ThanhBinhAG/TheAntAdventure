# app/api/access-control/super-admin-status/ — Agent overview

## Role

API trả trạng thái Super Admin cho giao diện Access Control.

## Contents

- `route.ts` — GET trạng thái Super Admin của session hiện tại.

## Boundaries

Chỉ kiểm tra request và gọi `lib/access-control`; không truy cập Supabase trực tiếp.