'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/hooks/useStore';

type HRTab = 'staff' | 'onboarding' | 'performance' | 'leave';

type Staff = {
  id: string;
  name: string;
  ename?: string;
  dept: string;
  pos: string;
  phone?: string;
  email?: string;
  start?: string;
  contract?: string;
  status: string;
};

const ONBOARD_W1 = [
  'Sign employment contract',
  'ID & tax registration',
  'Company email setup',
  'CRM system access & training',
  'Meet all team members',
  'Review company handbook',
  'Tour product orientation',
  'Shadow senior sales/ops for 3 days',
];

const ONBOARD_M1 = [
  'Complete product knowledge test',
  'First independent client inquiry',
  'Set 90-day personal targets',
  'Introduction to key suppliers',
  'Complete first tour operation',
  '30-day check-in with manager',
  'CRM data entry proficiency',
  'Language & communication training',
];

const LEAVE_DATA = [
  [12, 3, 9, 1],
  [12, 5, 7, 2],
  [12, 2, 10, 0],
  [12, 4, 8, 1],
  [6, 1, 5, 0],
];

const PERF_SCORES = [88, 92, 78, 95, 82];

function deptBadge(dept: string) {
  if (dept === 'Sales & Product') return 'bdg-g';
  if (dept === 'Operations') return 'bdg-b';
  if (dept === 'Finance') return 'bdg-a';
  if (dept === 'Guides') return 'bdg-p';
  return 'bdg-w';
}

export default function HR() {
  const staff = useStore((s) => s.staff) as Staff[];
  const [tab, setTab] = useState<HRTab>('staff');
  const [search, setSearch] = useState('');
  const [deptF, setDeptF] = useState('');

  const filtered = useMemo(
    () =>
      staff.filter((s) => {
        const q = search.toLowerCase();
        const matchQ =
          !q ||
          s.name.toLowerCase().includes(q) ||
          (s.ename || '').toLowerCase().includes(q) ||
          s.pos.toLowerCase().includes(q);
        const matchD = !deptF || s.dept === deptF;
        return matchQ && matchD;
      }),
    [staff, search, deptF]
  );

  const fullTime = staff.filter((s) => s.contract === 'Full-time');

  return (
    <div>
      <div className="tabs">
        {(
          [
            ['staff', 'Staff Directory'],
            ['onboarding', 'Onboarding'],
            ['performance', 'Performance'],
            ['leave', 'Leave Tracker'],
          ] as const
        ).map(([id, label]) => (
          <div key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} role="button" tabIndex={0}>
            {label}
          </div>
        ))}
      </div>

      {tab === 'staff' && (
        <>
          <div className="search-row" style={{ marginBottom: 14 }}>
            <input placeholder="Search staff…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
            <select value={deptF} onChange={(e) => setDeptF(e.target.value)}>
              <option value="">All Departments</option>
              <option>Sales & Product</option>
              <option>Operations</option>
              <option>Finance</option>
              <option>Marketing</option>
              <option>Guides</option>
            </select>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p btn-sm" type="button">
              + Add Staff
            </button>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>English Name</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Start Date</th>
                    <th>Contract</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{s.id}</code>
                      </td>
                      <td>
                        <b>{s.name}</b>
                      </td>
                      <td>{s.ename || '—'}</td>
                      <td>
                        <span className={`bdg ${deptBadge(s.dept)}`}>{s.dept}</span>
                      </td>
                      <td>{s.pos}</td>
                      <td style={{ color: 'var(--m)' }}>{s.phone || '—'}</td>
                      <td style={{ color: 'var(--m)', fontSize: 11.5 }}>{s.email || '—'}</td>
                      <td>{s.start || '—'}</td>
                      <td>
                        <span className={`bdg ${s.contract === 'Full-time' ? 'bdg-g' : 'bdg-a'}`}>{s.contract || '—'}</span>
                      </td>
                      <td>
                        <span className={`bdg ${s.status === 'Active' ? 'bdg-g' : 'bdg-r'}`}>{s.status}</span>
                      </td>
                      <td>
                        <button className="btn btn-s btn-sm" type="button">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'onboarding' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">Onboarding Checklist</span>
          </div>
          <div className="card-body">
            <div className="hr-onboard-grid">
              <div>
                <div className="hr-onboard-label">Week 1 — Orientation</div>
                <div className="hr-onboard-list">
                  {ONBOARD_W1.map((item) => (
                    <label key={item} className="hr-onboard-item">
                      <input type="checkbox" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="hr-onboard-label">Month 1 — Integration</div>
                <div className="hr-onboard-list">
                  {ONBOARD_M1.map((item) => (
                    <label key={item} className="hr-onboard-item">
                      <input type="checkbox" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">Performance Reviews 2026</span>
            <select defaultValue="Mid-Year" style={{ padding: '5px 9px', border: '1px solid var(--b)', borderRadius: 6, fontSize: 12 }}>
              <option>Q1 2026</option>
              <option>Q2 2026</option>
              <option>Mid-Year</option>
              <option>Annual</option>
            </select>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Department</th>
                  <th>KPI Score</th>
                  <th>Target Met?</th>
                  <th>Manager Notes</th>
                  <th>Next Review</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {fullTime.map((s, i) => {
                  const score = PERF_SCORES[i] ?? 85;
                  const met = score >= 80;
                  return (
                    <tr key={s.id}>
                      <td>
                        <b>{s.name}</b>
                        <br />
                        <span style={{ fontSize: 11, color: 'var(--m)' }}>{s.pos}</span>
                      </td>
                      <td>{s.dept}</td>
                      <td>
                        <div className="hr-perf-bar-wrap">
                          <div className="hr-perf-bar-track">
                            <div
                              className="hr-perf-bar-fill"
                              style={{
                                width: `${score}%`,
                                background: score >= 85 ? 'var(--g)' : score >= 70 ? 'var(--amb)' : 'var(--red)',
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 700, color: score >= 85 ? 'var(--g)' : score >= 70 ? 'var(--amb)' : 'var(--red)' }}>
                            {score}%
                          </span>
                        </div>
                      </td>
                      <td>{met ? <span style={{ color: 'var(--g)', fontWeight: 600 }}>✓ Yes</span> : <span style={{ color: 'var(--red)' }}>✗ No</span>}</td>
                      <td style={{ color: 'var(--m)', fontSize: 12 }}>{met ? 'Strong performance, keep it up' : 'Needs improvement in client follow-up'}</td>
                      <td>Sep 2026</td>
                      <td>
                        <button className="btn btn-s btn-sm" type="button">
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'leave' && (
        <div className="hr-leave-grid">
          <div className="card">
            <div className="card-hd">
              <span className="card-title">Leave Balance Summary</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Annual Leave</th>
                    <th>Used</th>
                    <th>Remaining</th>
                    <th>Sick Leave</th>
                  </tr>
                </thead>
                <tbody>
                  {fullTime.map((s, i) => {
                    const [total, used, rem, sick] = LEAVE_DATA[i] || [12, 0, 12, 0];
                    return (
                      <tr key={s.id}>
                        <td>
                          <b>{s.name}</b>
                        </td>
                        <td style={{ textAlign: 'center' }}>{total} days</td>
                        <td style={{ textAlign: 'center', color: 'var(--amb)' }}>{used} days</td>
                        <td style={{ textAlign: 'center', color: 'var(--g)', fontWeight: 600 }}>
                          {rem} days
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--blue)' }}>
                          {sick} day{sick !== 1 ? 's' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">Leave Policy</span>
            </div>
            <div className="card-body hr-leave-policy">
              <div className="sal-bonus-pill">
                <b>Annual Leave:</b> 12 days/year (1 day/month). Carry-over max 5 days.
              </div>
              <div className="sal-bonus-pill">
                <b>Sick Leave:</b> Up to 5 days/year with medical certificate.
              </div>
              <div className="sal-bonus-pill">
                <b>Public Holidays:</b> All Vietnamese national holidays + Tet (7 days).
              </div>
              <div className="sal-bonus-pill">
                <b>Probation:</b> No paid leave during 2-month probation period.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
