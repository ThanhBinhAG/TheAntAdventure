'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useSalaryPage } from '@/hooks/useSalaryPage';
import EmptyState from '@/components/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';

const SALARY_BANDS = [
  { pos: 'CEO / Founder', dept: 'Management', min: 2000, mid: 3000, max: 5000, currency: 'USD', cycle: 'Annual' },
  { pos: 'Senior Sales', dept: 'Sales & Product', min: 900, mid: 1300, max: 1800, currency: 'USD', cycle: 'Annual' },
  { pos: 'Operations Manager', dept: 'Operations', min: 1100, mid: 1400, max: 1900, currency: 'USD', cycle: 'Annual' },
  { pos: 'Finance Officer', dept: 'Finance', min: 900, mid: 1100, max: 1500, currency: 'USD', cycle: 'Annual' },
  { pos: 'Content Manager', dept: 'Marketing', min: 600, mid: 900, max: 1300, currency: 'USD', cycle: 'Annual' },
  { pos: 'Senior Guide', dept: 'Guides', min: 85, mid: 90, max: 110, currency: 'USD/day', cycle: 'Per day' },
  { pos: 'Experienced Guide', dept: 'Guides', min: 70, mid: 80, max: 90, currency: 'USD/day', cycle: 'Per day' },
];

type SalTab = 'payroll' | 'structure' | 'bonus';

const MONTH_KEYS = [
  'monthJanuary', 'monthFebruary', 'monthMarch', 'monthApril', 'monthMay', 'monthJune',
  'monthJuly', 'monthAugust', 'monthSeptember', 'monthOctober', 'monthNovember', 'monthDecember',
] as const;

export default function SalaryPage() {
  const { tp, tpl, tc } = useLanguage();
  const { canWrite } = usePagePermission('salary');
  const { staff, loading, error, reload } = useSalaryPage();
  const [tab, setTab] = useState<SalTab>('payroll');
  const [month, setMonth] = useState('May 2026');

  const payroll = useMemo(() => {
    const rows = staff.map((s) => {
      const base = s.baseSalary ?? 0;
      const bonus = s.dept === 'Sales & Product' ? Math.round(base * 0.05) : 0;
      const deductions = Math.round(base * 0.105);
      const total = base + bonus - deductions;
      return { ...s, base, bonus, deductions, total };
    });
    const grand = rows.reduce((sum, row) => sum + row.total, 0);
    return { rows, grand };
  }, [staff]);

  const exportPayroll = () => {
    const header = ['Staff ID', 'Name', 'Department', 'Position', 'Base Salary', 'Bonus', 'Deductions', 'Total Payable', 'Month'];
    const body = payroll.rows.map((s) => [
      s.id,
      s.name,
      s.dept,
      s.pos,
      fmt(s.base),
      fmt(s.bonus),
      fmt(s.deductions),
      fmt(s.total),
      month,
    ]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${month.replace(/\s/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && staff.length === 0) {
    return <div className="crm-loading-hint">{tp('salary', 'loading')}</div>;
  }

  if (error && staff.length === 0) {
    return (
      <EmptyState
        variant="access"
        title={tp('salary', 'loadErrorTitle')}
        description={error}
        action={
          <button className="btn btn-p btn-sm" type="button" onClick={() => void reload()}>
            {tc('retry')}
          </button>
        }
      />
    );
  }

  return (
    <div className="salary-page">
      <div className="tabs">
        {(
          [
            ['payroll', tp('salary', 'tabPayroll')],
            ['structure', tp('salary', 'tabStructure')],
            ['bonus', tp('salary', 'tabBonus')],
          ] as const
        ).map(([id, label]) => (
          <div key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} role="button" tabIndex={0}>
            {label}
          </div>
        ))}
      </div>

      {tab === 'payroll' && (
        <>
          <div className="sal-payroll-bar">
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="sal-month-sel">
              {MONTH_KEYS.map((key) => (
                <option key={key}>{tp('salary', key)} 2026</option>
              ))}
            </select>
            <div style={{ flex: 1 }} />
            <div className="sal-total-badge">{tpl('salary', 'totalBadge', { amount: fmt(payroll.grand) })}</div>
            <button className="btn btn-p btn-sm" type="button" onClick={exportPayroll} disabled={!canWrite} title={!canWrite ? tp('salary', 'readOnlyExport') : undefined}>
              {tp('salary', 'exportPayroll')}
            </button>
          </div>
          <div className="card sal-payroll-card">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{tp('salary', 'colStaffId')}</th>
                  <th>{tp('salary', 'colName')}</th>
                  <th>{tp('salary', 'colDepartment')}</th>
                  <th>{tp('salary', 'colPosition')}</th>
                  <th>{tp('salary', 'colBaseSalary')}</th>
                  <th>{tp('salary', 'colGuideDays')}</th>
                  <th>{tp('salary', 'colDayRate')}</th>
                  <th>{tp('salary', 'colBonus')}</th>
                  <th>{tp('salary', 'colDeductions')}</th>
                  <th>{tp('salary', 'colTotalPayable')}</th>
                  <th>{tp('salary', 'colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {payroll.rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{s.id}</code>
                    </td>
                    <td>
                      <b>{s.name}</b>
                    </td>
                    <td>
                      <span className="bdg bdg-w">{s.dept}</span>
                    </td>
                    <td>{s.pos}</td>
                    <td style={{ fontWeight: 600 }}>${fmt(s.base)}</td>
                    <td>—</td>
                    <td>—</td>
                    <td style={{ color: 'var(--blue)' }}>{s.bonus ? `$${fmt(s.bonus)}` : '—'}</td>
                    <td style={{ color: 'var(--red)' }}>-${fmt(s.deductions)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--g)' }}>${fmt(s.total)}</td>
                    <td>
                      <span className="bdg bdg-a">{tp('salary', 'statusPending')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'structure' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('salary', 'structureTitle')}</span>
            <button className="btn btn-p btn-sm" type="button">
              {tp('salary', 'addBand')}
            </button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>{tp('salary', 'colPosition')}</th>
                <th>{tp('salary', 'colDepartment')}</th>
                <th>{tp('salary', 'colMin')}</th>
                <th>{tp('salary', 'colMid')}</th>
                <th>{tp('salary', 'colMax')}</th>
                <th>{tp('salary', 'colCurrency')}</th>
                <th>{tp('salary', 'colReviewCycle')}</th>
              </tr>
            </thead>
            <tbody>
              {SALARY_BANDS.map((b) => (
                <tr key={b.pos}>
                  <td>
                    <b>{b.pos}</b>
                  </td>
                  <td>
                    <span className="bdg bdg-w">{b.dept}</span>
                  </td>
                  <td style={{ color: 'var(--red)' }}>${fmt(b.min)}</td>
                  <td style={{ color: 'var(--blue)', fontWeight: 600 }}>${fmt(b.mid)}</td>
                  <td style={{ color: 'var(--g)', fontWeight: 600 }}>${fmt(b.max)}</td>
                  <td>{b.currency}</td>
                  <td>{b.cycle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bonus' && (
        <div className="sal-bonus-grid">
          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('salary', 'guideCommissionTitle')}</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{tp('salary', 'colRatingTier')}</th>
                    <th>{tp('salary', 'colDayRateUsd')}</th>
                    <th>{tp('salary', 'colCondition')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>★★★★★ Senior</td>
                    <td style={{ color: 'var(--g)', fontWeight: 600 }}>$90–$110/day</td>
                    <td>5+ years, Nat. license</td>
                  </tr>
                  <tr>
                    <td>★★★★ Experienced</td>
                    <td style={{ color: 'var(--g)', fontWeight: 600 }}>$75–$90/day</td>
                    <td>2–5 years</td>
                  </tr>
                  <tr>
                    <td>★★★ Junior</td>
                    <td style={{ color: 'var(--g)', fontWeight: 600 }}>$60–$75/day</td>
                    <td>&lt;2 years</td>
                  </tr>
                  <tr>
                    <td>Trainee</td>
                    <td style={{ color: 'var(--amb)', fontWeight: 600 }}>$45–$60/day</td>
                    <td>First year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('salary', 'salesBonusTitle')}</span>
            </div>
            <div className="card-body" style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div className="sal-bonus-pill">
                <b>{tp('salary', 'bonusMonthly')}</b> {tp('salary', 'bonusMonthlyDesc')}
              </div>
              <div className="sal-bonus-pill">
                <b>{tp('salary', 'bonusQuarterly')}</b> {tp('salary', 'bonusQuarterlyDesc')}
              </div>
              <div className="sal-bonus-pill">
                <b>{tp('salary', 'bonusAnnual')}</b> {tp('salary', 'bonusAnnualDesc')}
              </div>
              <div className="sal-bonus-pill sal-bonus-tet">
                <b>{tp('salary', 'bonusTet')}</b> {tp('salary', 'bonusTetDesc')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
