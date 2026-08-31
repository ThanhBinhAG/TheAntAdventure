# lib/hr/ — Agent overview

## Role
HR staff directory DTOs and server-only repository (no salary fields).

## Contents
- `hr-input.ts` — `HrStaffListItem` DTO
- `hr-repository.ts` — `listHrStaffServer`

## Boundaries
- Page UI lives under `components/hr`; Salary uses `lib/salary` for payroll fields.
- Do not return `baseSalary` or raw Supabase rows.
