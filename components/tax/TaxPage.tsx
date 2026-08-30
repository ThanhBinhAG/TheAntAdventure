'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useTaxPage } from '@/hooks/useTaxPage';
import EmptyState from '@/components/EmptyState';
import { toast } from '@/lib/toast';

export default function TaxPage() {
  const { canWrite } = usePagePermission('tax');
  const [period, setPeriod] = useState('all');
  const { rows, allPeriods, loading, error, reload } = useTaxPage(period);

  const sourceRows = useMemo(
    () => (period === 'all' ? rows.filter((r) => r.id !== 'TOTAL') : rows),
    [period, rows],
  );

  const calculateQuarter = () => {
    const q = sourceRows;
    if (!q.length) {
      toast.warning('No tax data for selected period.');
      return;
    }
    const sum = q.reduce(
      (acc, t) => ({
        rev: acc.rev + (t.rev || 0),
        vat_pay: acc.vat_pay + (t.vat_pay || 0),
        corp_tax: acc.corp_tax + (t.corp_tax || 0),
      }),
      { rev: 0, vat_pay: 0, corp_tax: 0 },
    );
    toast.info(
      `Tax Summary — ${period === 'all' ? 'All Periods' : period}\n\n` +
        `Revenue: $${fmt(sum.rev)}\n` +
        `VAT Payable: $${fmt(sum.vat_pay)}\n` +
        `Corp Tax Est.: $${fmt(sum.corp_tax)}\n\n` +
        `Total Tax Liability: $${fmt(sum.vat_pay + sum.corp_tax)}`,
      6000,
    );
  };

  const exportReport = async () => {
    const qs = new URLSearchParams({ period });
    const res = await fetch(`/api/tax-reports/export?${qs.toString()}`, {
      credentials: 'same-origin',
    });
    if (!res.ok) {
      toast.error('Could not export tax report.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = period === 'all' ? 'tax-report-ytd.csv' : `tax-report-${period.replace(/\s/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tax-page">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-hd">
          <span className="card-title">Tax Summary / Tổng hợp thuế 2026</span>
        </div>
        <div className="card-body">
          {error && (
            <EmptyState
              title="Could not load tax reports"
              description={error}
              action={
                <button type="button" className="btn btn-s" onClick={() => void reload()}>
                  Retry
                </button>
              }
              role="alert"
            />
          )}
          <div className="tax-controls">
            <div className="fg">
              <label className="lbl">Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="all">All Periods</option>
                {allPeriods.map((t) => (
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
            <button
              className="btn btn-p btn-sm"
              type="button"
              onClick={calculateQuarter}
              disabled={!canWrite || loading}
              title={!canWrite ? 'Read-only mode: calculation disabled' : undefined}
            >
              📊 Calculate Quarter
            </button>
            <button
              className="btn btn-s btn-sm"
              type="button"
              onClick={exportReport}
              disabled={!canWrite || loading}
              title={!canWrite ? 'Read-only mode: export disabled' : undefined}
            >
              ⬇ Export Tax Report
            </button>
          </div>
          <div className="card" style={{ marginTop: 0 }}>
            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              {loading ? (
                <EmptyState title="Loading tax reports…" size="compact" />
              ) : rows.length === 0 ? (
                <EmptyState title="No tax data for this period" size="compact" />
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
