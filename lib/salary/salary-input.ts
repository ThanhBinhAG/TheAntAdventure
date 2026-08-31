import type { HrStaffListItem } from '@/lib/hr/hr-input';

/** Salary payroll DTO — includes base salary for `/salary` page. */
export type SalaryStaffListItem = HrStaffListItem & {
  baseSalary?: number;
};
