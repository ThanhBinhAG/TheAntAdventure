# app/api/products/import — Agent overview

## Role
BFF endpoint cho tính năng import Excel catalogue của sản phẩm.

## Contents
- `route.ts` — POST nhận drafts từ file Excel và gọi RPC thay toàn bộ catalogue theo transaction.

## Boundaries
- Yêu cầu quyền `products.write`.
- Không sử dụng trực tiếp Supabase client ở client-side cho bảng này.
- Cache chỉ bị invalidate sau khi RPC commit thành công.
