import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { rowToAp, rowToAr, rowToFinance } from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import type {
  ApListItem,
  ArListItem,
  FinanceBundleResponse,
  FinanceListItem,
} from './finance-input';

export type { FinanceBundleResponse } from './finance-input';

export class FinanceRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinanceRepositoryError';
  }
}

function toFinanceItem(row: Row): FinanceListItem {
  const mapped = rowToFinance(row) as Record<string, unknown>;
  return {
    id: String(mapped.id ?? ''),
    bkid: mapped.bkid ? String(mapped.bkid) : undefined,
    custName: mapped.custName ? String(mapped.custName) : undefined,
    type: String(mapped.type ?? ''),
    date: mapped.date ? String(mapped.date).slice(0, 10) : undefined,
    month: mapped.month ? String(mapped.month) : undefined,
    rev: mapped.rev != null ? Number(mapped.rev) : undefined,
    cost: mapped.cost != null ? Number(mapped.cost) : undefined,
    cashIn: mapped.cashIn != null ? Number(mapped.cashIn) : undefined,
    cashOut: mapped.cashOut != null ? Number(mapped.cashOut) : undefined,
    status: mapped.status ? String(mapped.status) : undefined,
    inv: mapped.inv ? String(mapped.inv) : undefined,
    notes: mapped.notes ? String(mapped.notes) : undefined,
  };
}

function toArItem(row: Row): ArListItem {
  const mapped = rowToAr(row) as Record<string, unknown>;
  return {
    id: String(mapped.id ?? ''),
    bkid: mapped.bkid ? String(mapped.bkid) : undefined,
    custName: mapped.custName ? String(mapped.custName) : undefined,
    tour: mapped.tour ? String(mapped.tour) : undefined,
    invoiceAmt: mapped.invoiceAmt != null ? Number(mapped.invoiceAmt) : undefined,
    depositPaid: mapped.depositPaid != null ? Number(mapped.depositPaid) : undefined,
    balance: mapped.balance != null ? Number(mapped.balance) : undefined,
    dueDate: mapped.dueDate ? String(mapped.dueDate).slice(0, 10) : undefined,
    status: mapped.status ? String(mapped.status) : undefined,
  };
}

function toApItem(row: Row): ApListItem {
  const mapped = rowToAp(row) as Record<string, unknown>;
  return {
    id: String(mapped.id ?? ''),
    bkid: mapped.bkid ? String(mapped.bkid) : undefined,
    supplier: mapped.supplier ? String(mapped.supplier) : undefined,
    description: mapped.description ? String(mapped.description) : undefined,
    amount: mapped.amount != null ? Number(mapped.amount) : undefined,
    dueDate: mapped.dueDate ? String(mapped.dueDate).slice(0, 10) : undefined,
    status: mapped.status ? String(mapped.status) : undefined,
    category: mapped.category ? String(mapped.category) : undefined,
  };
}

export async function listFinanceBundleServer(
  supabase: SupabaseClient,
): Promise<FinanceBundleResponse> {
  const [financeRes, arRes, apRes] = await Promise.all([
    supabase.from('finance').select('*').order('id'),
    supabase.from('accounts_receivable').select('*').order('id'),
    supabase.from('accounts_payable').select('*').order('id'),
  ]);

  if (financeRes.error) throw new FinanceRepositoryError(financeRes.error.message);
  if (arRes.error) throw new FinanceRepositoryError(arRes.error.message);
  if (apRes.error) throw new FinanceRepositoryError(apRes.error.message);

  return {
    finance: ((financeRes.data ?? []) as Row[]).map(toFinanceItem),
    ar: ((arRes.data ?? []) as Row[]).map(toArItem),
    ap: ((apRes.data ?? []) as Row[]).map(toApItem),
  };
}
