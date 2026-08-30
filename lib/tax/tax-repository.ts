import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { rowToTax } from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import type { TaxListItem, TaxReportsResponse } from './tax-input';

export type { TaxListItem, TaxReportsResponse } from './tax-input';

export class TaxRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaxRepositoryError';
  }
}

function toTaxItem(row: Row): TaxListItem {
  const mapped = rowToTax(row) as Record<string, unknown>;
  return {
    id: String(mapped.id ?? ''),
    period: mapped.period ? String(mapped.period) : undefined,
    rev: mapped.rev != null ? Number(mapped.rev) : undefined,
    expenses: mapped.expenses != null ? Number(mapped.expenses) : undefined,
    vat_out: mapped.vat_out != null ? Number(mapped.vat_out) : undefined,
    vat_in: mapped.vat_in != null ? Number(mapped.vat_in) : undefined,
    vat_pay: mapped.vat_pay != null ? Number(mapped.vat_pay) : undefined,
    profit_bt: mapped.profit_bt != null ? Number(mapped.profit_bt) : undefined,
    corp_tax: mapped.corp_tax != null ? Number(mapped.corp_tax) : undefined,
  };
}

function aggregateYtd(rows: TaxListItem[]): TaxListItem {
  return rows.reduce(
    (acc, row) => ({
      id: 'TOTAL',
      period: 'YTD Total',
      rev: (acc.rev || 0) + (row.rev || 0),
      expenses: (acc.expenses || 0) + (row.expenses || 0),
      vat_out: (acc.vat_out || 0) + (row.vat_out || 0),
      vat_in: (acc.vat_in || 0) + (row.vat_in || 0),
      vat_pay: (acc.vat_pay || 0) + (row.vat_pay || 0),
      profit_bt: (acc.profit_bt || 0) + (row.profit_bt || 0),
      corp_tax: (acc.corp_tax || 0) + (row.corp_tax || 0),
    }),
    {
      id: 'TOTAL',
      period: 'YTD Total',
      rev: 0,
      expenses: 0,
      vat_out: 0,
      vat_in: 0,
      vat_pay: 0,
      profit_bt: 0,
      corp_tax: 0,
    },
  );
}

export async function listTaxReportsServer(
  supabase: SupabaseClient,
  period = 'all',
): Promise<TaxReportsResponse> {
  const { data, error } = await supabase.from('tax_reports').select('*').order('id');
  if (error) throw new TaxRepositoryError(error.message);

  const allRows = ((data ?? []) as Row[]).map(toTaxItem);
  const filtered =
    period === 'all' ? allRows : allRows.filter((row) => row.period === period);

  const response: TaxReportsResponse = { rows: filtered };
  if (period === 'all' && allRows.length > 0) {
    response.ytd = aggregateYtd(allRows);
  }
  return response;
}

export async function listTaxExportRowsServer(
  supabase: SupabaseClient,
  period = 'all',
): Promise<TaxListItem[]> {
  const bundle = await listTaxReportsServer(supabase, period);
  const rows = [...bundle.rows];
  if (period === 'all' && bundle.ytd) {
    rows.push(bundle.ytd);
  }
  return rows;
}
