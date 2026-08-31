import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { rowToStaffExtended } from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import type { SalaryStaffListItem } from './salary-input';

export type { SalaryStaffListItem } from './salary-input';

export class SalaryRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SalaryRepositoryError';
  }
}

function toSalaryItem(row: Row): SalaryStaffListItem {
  const mapped = rowToStaffExtended(row) as Record<string, unknown>;
  return {
    id: String(mapped.id ?? ''),
    name: String(mapped.name ?? ''),
    ename: mapped.ename ? String(mapped.ename) : undefined,
    dept: String(mapped.dept ?? ''),
    pos: String(mapped.pos ?? ''),
    phone: mapped.phone ? String(mapped.phone) : undefined,
    email: mapped.email ? String(mapped.email) : undefined,
    start: mapped.start ? String(mapped.start).slice(0, 10) : undefined,
    contract: mapped.contract ? String(mapped.contract) : undefined,
    status: String(mapped.status ?? ''),
    baseSalary: mapped.baseSalary != null ? Number(mapped.baseSalary) : undefined,
  };
}

export async function listSalaryStaffServer(
  supabase: SupabaseClient,
): Promise<SalaryStaffListItem[]> {
  const { data, error } = await supabase.from('staff').select('*').order('id');
  if (error) throw new SalaryRepositoryError(error.message);
  return ((data ?? []) as Row[]).map(toSalaryItem);
}
