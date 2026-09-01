'use client';

import { useMemo, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { useHrPage } from '@/hooks/useHrPage';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import { HR_ONBOARD_M1_KEYS, HR_ONBOARD_W1_KEYS } from '@/lib/i18n/pages/hr';
import type { HrStaffListItem } from '@/lib/hr/hr-input';

type HRTab = 'staff' | 'onboarding' | 'performance' | 'leave';

const ONBOARD_W1 = HR_ONBOARD_W1_KEYS;
const ONBOARD_M1 = HR_ONBOARD_M1_KEYS;

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

export default function HrPage() {
  const { tp, tpl, tc } = useLanguage();
  const { staff, loading, error, reload } = useHrPage();
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
    [staff, search, deptF],
  );

  const fullTime = staff.filter((s) => s.contract === 'Full-time');

  const { pageSize, setPageSize } = usePageSize();
  const staffPagination = usePagination(filtered, pageSize, [search, deptF, tab, pageSize]);
  const { paginatedItems: staffPage } = staffPagination;

  const fullTimeIndexed = useMemo(() => fullTime.map((s, index) => ({ staff: s, index })), [fullTime]);
  const perfPagination = usePagination(fullTimeIndexed, pageSize, [tab, pageSize]);
  const leavePagination = usePagination(fullTimeIndexed, pageSize, [tab, pageSize]);
  const { paginatedItems: perfPage } = perfPagination;
  const { paginatedItems: leavePage } = leavePagination;

  if (loading && staff.length === 0) {
    return <div className="crm-loading-hint">{tp('hr', 'loading')}</div>;
  }

  if (error && staff.length === 0) {
    return (
      <EmptyState
        variant="access"
        title={tp('hr', 'loadErrorTitle')}
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
    <div>
      <div className="tabs">
        {(
          [
            ['staff', tp('hr', 'tabStaff')],
            ['onboarding', tp('hr', 'tabOnboarding')],
            ['performance', tp('hr', 'tabPerformance')],
            ['leave', tp('hr', 'tabLeave')],
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
            <input placeholder={tp('hr', 'searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
            <select value={deptF} onChange={(e) => setDeptF(e.target.value)}>
              <option value="">{tp('hr', 'allDepartments')}</option>
              <option>Sales & Product</option>
              <option>Operations</option>
              <option>Finance</option>
              <option>Marketing</option>
              <option>Guides</option>
            </select>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p btn-sm" type="button">
              {tp('hr', 'addStaff')}
            </button>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{tp('hr', 'colId')}</th>
                    <th>{tp('hr', 'colName')}</th>
                    <th>{tp('hr', 'colEnglishName')}</th>
                    <th>{tp('hr', 'colDepartment')}</th>
                    <th>{tp('hr', 'colPosition')}</th>
                    <th>{tp('hr', 'colPhone')}</th>
                    <th>{tp('hr', 'colEmail')}</th>
                    <th>{tp('hr', 'colStartDate')}</th>
                    <th>{tp('hr', 'colContract')}</th>
                    <th>{tp('hr', 'colStatus')}</th>
                    <th>{tp('hr', 'colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {staffPage.map((s: HrStaffListItem) => (
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
                          {tc('edit')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <PaginationBar {...staffPagination} onPageSizeChange={setPageSize} />
            </div>
          </div>
        </>
      )}

      {tab === 'onboarding' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('hr', 'onboardingTitle')}</span>
          </div>
          <div className="card-body">
            <div className="hr-onboard-grid">
              <div>
                <div className="hr-onboard-label">{tp('hr', 'onboardWeek1')}</div>
                <div className="hr-onboard-list">
                  {ONBOARD_W1.map((item) => (
                    <label key={item} className="hr-onboard-item">
                      <input type="checkbox" />
                      <span>{tp('hr', item)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="hr-onboard-label">{tp('hr', 'onboardMonth1')}</div>
                <div className="hr-onboard-list">
                  {ONBOARD_M1.map((item) => (
                    <label key={item} className="hr-onboard-item">
                      <input type="checkbox" />
                      <span>{tp('hr', item)}</span>
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
            <span className="card-title">{tp('hr', 'performanceTitle')}</span>
            <select defaultValue="Mid-Year" style={{ padding: '5px 9px', border: '1px solid var(--b)', borderRadius: 6, fontSize: 12 }}>
              <option>{tp('hr', 'perfQ1')}</option>
              <option>{tp('hr', 'perfQ2')}</option>
              <option>{tp('hr', 'perfMidYear')}</option>
              <option>{tp('hr', 'perfAnnual')}</option>
            </select>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{tp('hr', 'colStaff')}</th>
                  <th>{tp('hr', 'colDepartment')}</th>
                  <th>{tp('hr', 'colKpiScore')}</th>
                  <th>{tp('hr', 'colTargetMet')}</th>
                  <th>{tp('hr', 'colManagerNotes')}</th>
                  <th>{tp('hr', 'colNextReview')}</th>
                  <th>{tp('hr', 'colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {perfPage.map(({ staff: s, index: i }) => {
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
                      <td>{met ? <span style={{ color: 'var(--g)', fontWeight: 600 }}>{tp('hr', 'targetYes')}</span> : <span style={{ color: 'var(--red)' }}>{tp('hr', 'targetNo')}</span>}</td>
                      <td style={{ color: 'var(--m)', fontSize: 12 }}>{met ? tp('hr', 'notesStrong') : tp('hr', 'notesImprove')}</td>
                      <td>Sep 2026</td>
                      <td>
                        <button className="btn btn-s btn-sm" type="button">
                          {tp('hr', 'review')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <PaginationBar {...perfPagination} onPageSizeChange={setPageSize} />
          </div>
        </div>
      )}

      {tab === 'leave' && (
        <div className="hr-leave-grid">
          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('hr', 'leaveSummaryTitle')}</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{tp('hr', 'colStaff')}</th>
                    <th>{tp('hr', 'colAnnualLeave')}</th>
                    <th>{tp('hr', 'colUsed')}</th>
                    <th>{tp('hr', 'colRemaining')}</th>
                    <th>{tp('hr', 'colSickLeave')}</th>
                  </tr>
                </thead>
                <tbody>
                  {leavePage.map(({ staff: s, index: i }) => {
                    const [total, used, rem, sick] = LEAVE_DATA[i] || [12, 0, 12, 0];
                    return (
                      <tr key={s.id}>
                        <td>
                          <b>{s.name}</b>
                        </td>
                        <td style={{ textAlign: 'center' }}>{tpl('hr', 'days', { count: total })}</td>
                        <td style={{ textAlign: 'center', color: 'var(--amb)' }}>{tpl('hr', 'days', { count: used })}</td>
                        <td style={{ textAlign: 'center', color: 'var(--g)', fontWeight: 600 }}>
                          {tpl('hr', 'days', { count: rem })}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--blue)' }}>
                          {tpl('hr', sick !== 1 ? 'days' : 'day', { count: sick })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <PaginationBar {...leavePagination} onPageSizeChange={setPageSize} />
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('hr', 'leavePolicyTitle')}</span>
            </div>
            <div className="card-body hr-leave-policy">
              <div className="sal-bonus-pill">
                <b>{tp('hr', 'leaveAnnual')}</b> {tp('hr', 'leaveAnnualDesc')}
              </div>
              <div className="sal-bonus-pill">
                <b>{tp('hr', 'leaveSick')}</b> {tp('hr', 'leaveSickDesc')}
              </div>
              <div className="sal-bonus-pill">
                <b>{tp('hr', 'leavePublic')}</b> {tp('hr', 'leavePublicDesc')}
              </div>
              <div className="sal-bonus-pill">
                <b>{tp('hr', 'leaveProbation')}</b> {tp('hr', 'leaveProbationDesc')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
