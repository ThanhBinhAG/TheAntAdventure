# app/api/salary/ — Agent overview

## Role
Permissioned CRM BFF endpoint for salary payroll staff read.

## Contents
- `route.ts` — `GET` staff list with `baseSalary`

## Boundaries
- Delegate to `lib/salary/salary-repository`.
- Auth via `bffRoute` (`salary.read`).
