'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { useStore } from '@/hooks/useStore';

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

export default function Salary() {
  const staff = useStore((s) => s.staff);
  const [tab, setTab] = useState<SalTab>('payroll');
  const [month, setMonth] = useState('May 2026');

  const payroll = useMemo(() => {
    let grand = 0;
    const rows = staff.map((s) => {
      const base = (s.baseSalary as number) || 0;
      const bonus = s.dept === 'Sales & Product' ? Math.round(base * 0.05) : 0;
      const deductions = Math.round(base * 0.105);
      const total = base + bonus - deductions;
      grand += total;
      return { ...s, base, bonus, deductions, total };
    });
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

  return (
    <div className="salary-page">
      <div className="tabs">
        {(
          [
            ['payroll', 'Monthly Payroll'],
            ['structure', 'Salary Structure'],
            ['bonus', 'Bonus & Commission'],
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
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                <option key={m}>{m} 2026</option>
              ))}
            </select>
            <div style={{ flex: 1 }} />
            <div className="sal-total-badge">Total: ${fmt(payroll.grand)}/month</div>
            <button className="btn btn-p btn-sm" type="button" onClick={exportPayroll}>
              ⬇ Export Payroll
            </button>
          </div>
          <div className="card sal-payroll-card">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Base Salary (USD)</th>
                  <th>Guide Days</th>
                  <th>Day Rate</th>
                  <th>Bonus</th>
                  <th>Deductions</th>
                  <th>Total Payable</th>
                  <th>Status</th>
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
                      <span className="bdg bdg-a">Pending</span>
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
            <span className="card-title">Salary Bands by Position</span>
            <button className="btn btn-p btn-sm" type="button">
              + Add Band
            </button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Position</th>
                <th>Department</th>
                <th>Min (USD/mo)</th>
                <th>Mid (USD/mo)</th>
                <th>Max (USD/mo)</th>
                <th>Currency</th>
                <th>Review Cycle</th>
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
              <span className="card-title">Guide Commission Structure</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Rating Tier</th>
                    <th>Day Rate (USD)</th>
                    <th>Condition</th>
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
              <span className="card-title">Sales Bonus Policy</span>
            </div>
            <div className="card-body" style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div className="sal-bonus-pill">
                <b>Monthly Target Bonus:</b> Achieve 100%+ of monthly sales target → 5% of overachievement
              </div>
              <div className="sal-bonus-pill">
                <b>Quarterly Bonus:</b> Top performer of quarter → $300 bonus + recognition
              </div>
              <div className="sal-bonus-pill">
                <b>Annual Bonus:</b> Company profit-sharing pool — distributed proportionally to salary grade
              </div>
              <div className="sal-bonus-pill sal-bonus-tet">
                <b>Tet/Holiday Bonus:</b> 1 month base salary paid before Lunar New Year
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
