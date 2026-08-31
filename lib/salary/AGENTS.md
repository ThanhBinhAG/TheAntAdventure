# lib/salary/ — Agent overview

## Role
Salary payroll DTOs and server-only repository for staff with `baseSalary`.

## Contents
- `salary-input.ts` — `SalaryStaffListItem` DTO
- `salary-repository.ts` — `listSalaryStaffServer`

## Boundaries
- Requires `salary.read`; HR directory uses `lib/hr` without salary fields.
- `salary_records` table is out of scope until product adds monthly payroll persistence.
