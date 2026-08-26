# app/api/products/import — Agent overview

## Role
BFF endpoint cho tính năng import Excel catalogue của sản phẩm.

## Contents
- `route.ts` — POST validate Portfolio drafts (shape, region, duplicate code) rồi gọi RPC thay toàn bộ catalogue theo transaction.

## Boundaries
- Yêu cầu quyền `products.write`.
- Payload sai phải trả `422` trước RPC; không được invalidate cache hoặc thay catalogue.
- Không sử dụng trực tiếp Supabase client ở client-side cho bảng này.
- Cache chỉ bị invalidate sau khi RPC commit thành công.
