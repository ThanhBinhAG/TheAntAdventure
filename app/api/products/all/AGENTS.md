# app/api/products/all — Agent overview

## Role
BFF endpoint nạp toàn bộ danh sách products cho client hydration.

## Contents
- `route.ts` — GET toàn bộ danh sách products.

## Boundaries
- Yêu cầu quyền `products.read`.
- Không sử dụng trực tiếp Supabase client ở client-side cho bảng này.
