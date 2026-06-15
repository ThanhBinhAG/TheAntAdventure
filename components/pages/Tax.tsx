'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { useStore } from '@/hooks/useStore';

type TaxRow = {
  id: string;
  period?: string;
  rev?: number;
  expenses?: number;
  vat_out?: number;
  vat_in?: number;
  vat_pay?: number;
  profit_bt?: number;
  corp_tax?: number;
};

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Tax() {
  const tax = useStore((s) => s.tax) as TaxRow[];
  const [period, setPeriod] = useState('all');

  const filtered = period === 'all' ? tax : tax.filter((t) => t.period === period);

  const ytd = useMemo(
    () => ({
      rev: tax.reduce((s, t) => s + (t.rev || 0), 0),
      expenses: tax.reduce((s, t) => s + (t.expenses || 0), 0),
      vat_out: tax.reduce((s, t) => s + (t.vat_out || 0), 0),
      vat_in: tax.reduce((s, t) => s + (t.vat_in || 0), 0),
      vat_pay: tax.reduce((s, t) => s + (t.vat_pay || 0), 0),
      profit_bt: tax.reduce((s, t) => s + (t.profit_bt || 0), 0),
      corp_tax: tax.reduce((s, t) => s + (t.corp_tax || 0), 0),
    }),
    [tax]
  );

  const rows = useMemo(() => {
    const data = [...filtered];
    if (period === 'all') {
      data.push({ id: 'TOTAL', period: 'YTD Total', ...ytd });
    }
    return data;
  }, [filtered, period, ytd]);

  const calculateQuarter = () => {
    const q = period === 'all' ? tax : filtered;
    if (!q.length) {
      alert('No tax data for selected period.');
      return;
    }
    const sum = q.reduce(
      (acc, t) => ({
        rev: acc.rev + (t.rev || 0),
        vat_pay: acc.vat_pay + (t.vat_pay || 0),
        corp_tax: acc.corp_tax + (t.corp_tax || 0),
      }),
      { rev: 0, vat_pay: 0, corp_tax: 0 }
    );
    alert(
      `Tax Summary — ${period === 'all' ? 'All Periods' : period}\n\n` +
        `Revenue: $${fmt(sum.rev)}\n` +
        `VAT Payable: $${fmt(sum.vat_pay)}\n` +
        `Corp Tax Est.: $${fmt(sum.corp_tax)}\n\n` +
        `Total Tax Liability: $${fmt(sum.vat_pay + sum.corp_tax)}`
    );
  };

  const exportReport = () => {
    const header = ['Tax ID', 'Period', 'Revenue', 'Output VAT', 'Expenses', 'Input VAT', 'VAT Payable', 'Profit', 'Corp Tax'];
    const body = rows.map((t) => [
      t.id,
      t.period || '',
      fmt(t.rev || 0),
      fmt(t.vat_out || 0),
      fmt(t.expenses || 0),
      fmt(t.vat_in || 0),
      fmt(t.vat_pay || 0),
      fmt(t.profit_bt || 0),
      fmt(t.corp_tax || 0),
    ]);
    downloadCsv(`tax-report-${period === 'all' ? 'ytd' : period.replace(/\s/g, '-')}.csv`, [header, ...body]);
  };

  return (
    <div className="tax-page">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-hd">
          <span className="card-title">Tax Summary / Tổng hợp thuế 2026</span>
        </div>
        <div className="card-body">
          <div className="tax-controls">
            <div className="fg">
              <label className="lbl">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="all">All Periods</option>
                {tax.map((t) => (
                  <option key={t.id} value={t.period}>
                    {t.period}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">VAT Rate</label>
              <input value="10%" readOnly />
            </div>
            <div className="fg">
              <label className="lbl">Corporate Tax Rate</label>
              <input value="20%" readOnly />
            </div>
          </div>
          <div className="tax-actions">
            <button className="btn btn-p btn-sm" type="button" onClick={calculateQuarter}>
              📊 Calculate Quarter
            </button>
            <button className="btn btn-s btn-sm" type="button" onClick={exportReport}>
              ⬇ Export Tax Report
            </button>
          </div>
          <div className="card" style={{ marginTop: 0 }}>
            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="tbl tax-tbl">
                <thead>
                  <tr>
                    <th>Tax ID</th>
                    <th>Period</th>
                    <th>Revenue before Tax</th>
                    <th>Output VAT (10%)</th>
                    <th>Total Expenses</th>
                    <th>Input VAT</th>
                    <th>VAT Payable</th>
                    <th>Profit before Tax</th>
                    <th>Corp Tax Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const isTotal = t.id === 'TOTAL';
                    return (
                      <tr key={t.id} className={isTotal ? 'tax-total-row' : ''}>
                        <td>{isTotal ? '' : <code className="tax-id-code">{t.id}</code>}</td>
                        <td>
                          <b>{t.period}</b>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--g)' }}>${fmt(t.rev || 0)}</td>
                        <td style={{ color: 'var(--amb)' }}>${fmt(t.vat_out || 0)}</td>
                        <td>${fmt(t.expenses || 0)}</td>
                        <td style={{ color: 'var(--blue)' }}>${fmt(t.vat_in || 0)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--amb)' }}>${fmt(t.vat_pay || 0)}</td>
                        <td style={{ fontWeight: 600 }}>${fmt(t.profit_bt || 0)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--red)' }}>${fmt(t.corp_tax || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
