import { fmt } from '@/lib/constants';
import type { TaxListItem } from './tax-input';

function csvCell(value: string | number | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function taxExportFilename(period: string): string {
  if (period === 'all') return 'tax-report-ytd.csv';
  return `tax-report-${period.replace(/\s/g, '-')}.csv`;
}

export function buildTaxCsv(rows: TaxListItem[]): string {
  const header = [
    'Tax ID',
    'Period',
    'Revenue',
    'Output VAT',
    'Expenses',
    'Input VAT',
    'VAT Payable',
    'Profit',
    'Corp Tax',
  ];
  const lines = [
    header.map(csvCell).join(','),
    ...rows.map((t) =>
      [
        t.id,
        t.period || '',
        fmt(t.rev || 0),
        fmt(t.vat_out || 0),
        fmt(t.expenses || 0),
        fmt(t.vat_in || 0),
        fmt(t.vat_pay || 0),
        fmt(t.profit_bt || 0),
        fmt(t.corp_tax || 0),
      ]
        .map(csvCell)
        .join(','),
    ),
  ];
  return lines.join('\n');
}
