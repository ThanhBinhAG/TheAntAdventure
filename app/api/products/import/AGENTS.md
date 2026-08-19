# app/api/products/import — Agent overview

## Role
BFF endpoint cho tính năng import Excel catalogue của sản phẩm.

## Contents
- `route.ts` — POST nhận drafts từ file Excel, xóa sạch catalogue cũ và nạp lại từ đầu.

## Boundaries
- Yêu cầu quyền `products.write`.
- Không sử dụng trực tiếp Supabase client ở client-side cho bảng này.
