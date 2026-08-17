# lib/redis/ — Agent overview

## Role

Redis client, cache helpers và key conventions dùng ở server.

## Contents

- `client.ts` — Redis connection dùng chung và health check.
- `branding-logo.ts` — cache server-side cho company logo.
- `permissions.ts` — cache ngắn hạn permission theo user, version hóa khi quyền thay đổi.
- `access-control-staff-roles.ts` — cache 5 phút danh sách staff role; xóa ngay sau role write/gán role user.
- `product-facets.ts` — cache ngắn hạn facets/filter của Product catalogue.

## Boundaries

Chỉ import từ server code; Redis lỗi phải fallback, không làm chức năng chính thất bại.
