# app/api/access-control/audit-logs/ — Agent overview

## Role
API đọc lịch sử thay đổi role và permission.

## Contents
- `route.ts` — GET audit log có phân trang.

## Boundaries
- Chỉ kiểm tra request và gọi helper trong lib/access-control.
- Không dùng service-role hoặc SQL trực tiếp.