# app/api/auth/permissions/ — Agent overview

## Role

Trả về danh sách quyền hiệu lực của session hiện tại cho giao diện CRM.

## Contents

- `route.ts` — GET các permission code, không trả dữ liệu profile hoặc secret.

## Boundaries

Gọi helper trong `lib/auth`; không tự truy cập service-role hoặc thay đổi role.
