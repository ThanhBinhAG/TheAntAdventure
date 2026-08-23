# app/api/products — Agent overview

## Role
Route Handler cho danh sách Tour Products phân trang ở server.

## Contents
- `route.ts` — GET page hoặc Product theo `code`; POST/PATCH/DELETE chỉnh sửa hoặc xóa product.
- `all/route.ts` — GET toàn bộ danh sách products cho hydration.
- `facets/route.ts` — GET bộ lọc catalog (categories / destinations / pricing pulse).
- `pricing/all/route.ts` — GET toàn bộ product pricing cho hydration.
- `pricing/route.ts` — GET bảng giá theo Product và PATCH cập nhật chi tiết bảng giá.
- `import/route.ts` — POST import Excel thay thế toàn bộ catalogue.

## Boundaries
- Validate request và kiểm tra quyền tại route.
- Logic query nằm trong `lib/products/`.
- Catalog grid không được block bởi facets — facets load song song từ `facets/`.
- Middleware does not repeat Auth for this subtree; every handler must keep its own permission check.
