# app/api/products/pricing — Agent overview

## Role
BFF endpoints cho bảng giá sản phẩm (Product Pricing).

## Contents
- `route.ts` — PATCH cập nhật chi tiết bảng giá.
- `all/route.ts` — GET toàn bộ danh sách product pricing cho client hydration.

## Boundaries
- Quyền ghi yêu cầu `pricing.write`, quyền đọc yêu cầu `products.read`.
- Không sử dụng trực tiếp Supabase client ở client-side cho bảng này.
