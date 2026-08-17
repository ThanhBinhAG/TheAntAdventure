# app/api/products — Agent overview

## Role
Route Handler cho danh sách Tour Products phân trang ở server.

## Contents
- `route.ts` — GET một trang product (không chờ facets); POST xóa Redis facet cache sau catalogue write.
- `facets/route.ts` — GET bộ lọc catalog (categories / destinations / pricing pulse).

## Boundaries
- Validate request và kiểm tra quyền tại route.
- Logic query nằm trong `lib/products/`.
- Catalog grid không được block bởi facets — facets load song song từ `facets/`.
- Middleware does not repeat Auth for this subtree; every handler must keep its own permission check.
