# app/api/products — Agent overview

## Role
Route Handler cho danh sách Tour Products phân trang ở server.

## Contents
- `route.ts` — GET danh sách product theo trang.

## Boundaries
- Validate request và kiểm tra quyền tại route.
- Logic query nằm trong `lib/products/`.
