'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { useFinancePage } from '@/hooks/useFinancePage';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';

type FinTab = 'overview' | 'cashflow' | 'pl' | 'ar' | 'ap';

export default function FinancePage() {
  const { tp, tpl, tc } = useLanguage();
  const { finance, ar, ap, loading, error, reload } = useFinancePage();
  const [tab, setTab] = useState<FinTab>('overview');
  const [arFilter, setArFilter] = useState('');
  const [apFilter, setApFilter] = useState('');

  const totalRev = finance.filter((f) => f.type === 'Tour').reduce((s, f) => s + (f.rev || 0), 0);
  const totalCost = finance.filter((f) => f.type === 'Tour').reduce((s, f) => s + (f.cost || 0), 0);
  const totalCashIn = finance.reduce((s, f) => s + (f.cashIn || 0), 0);
  const totalCashOut = finance.reduce((s, f) => s + (f.cashOut || 0), 0);
  const grossProfit = totalRev - totalCost;
  const totalAR = ar.filter((r) => r.status !== 'Paid').reduce((s, r) => s + (r.balance || 0), 0);
  const totalAP = ap.filter((p) => p.status !== 'Paid').reduce((s, p) => s + (p.amount || 0), 0);

  const monthlyCash = useMemo(() => {
    const map: Record<string, { in: number; out: number }> = {};
    finance.forEach((f) => {
      const m = f.month || 'Unknown';
      if (!map[m]) map[m] = { in: 0, out: 0 };
      map[m].in += f.cashIn || 0;
      map[m].out += f.cashOut || 0;
    });
    return Object.entries(map);
  }, [finance]);

  const maxCash = Math.max(...monthlyCash.flatMap(([, v]) => [v.in, v.out]), 1);

  const arFiltered = ar.filter((r) => !arFilter || r.status === arFilter);
  const apFiltered = ap.filter((p) => !apFilter || p.status === apFilter);

  const { pageSize, setPageSize } = usePageSize();
  const financePagination = usePagination(finance, pageSize, [tab, pageSize]);
  const arPagination = usePagination(arFiltered, pageSize, [arFilter, tab, pageSize]);
  const apPagination = usePagination(apFiltered, pageSize, [apFilter, tab, pageSize]);

  const { paginatedItems: financePage } = financePagination;
  const { paginatedItems: arPage } = arPagination;
  const { paginatedItems: apPage } = apPagination;

  return (
    <div>
      {error && (
        <EmptyState
          title={tp('finance', 'loadErrorTitle')}
          description={error}
          action={
            <button type="button" className="btn btn-s" onClick={() => void reload()}>
              {tc('retry')}
            </button>
          }
          role="alert"
        />
      )}
      <div className="fin-kpi fin-kpi-5">
        <div className="fin-k">
          <div className="fin-k-l">{tp('finance', 'kpiRevenueYtd')}</div>
          <div className="fin-k-v" style={{ color: 'var(--g)' }}>
            {loading ? '…' : `$${fmt(totalRev)}`}
          </div>
        </div>
        <div className="fin-k">
          <div className="fin-k-l">{tp('finance', 'kpiGrossProfit')}</div>
          <div className="fin-k-v" style={{ color: 'var(--g)' }}>
            {loading ? '…' : `$${fmt(grossProfit)}`}
          </div>
        </div>
        <div className="fin-k">
          <div className="fin-k-l">{tp('finance', 'kpiCashIn')}</div>
          <div className="fin-k-v" style={{ color: 'var(--blue)' }}>
            {loading ? '…' : `$${fmt(totalCashIn)}`}
          </div>
        </div>
        <div className="fin-k">
          <div className="fin-k-l">{tp('finance', 'kpiOutstandingAr')}</div>
          <div className="fin-k-v" style={{ color: 'var(--amb)' }}>
            {loading ? '…' : `$${fmt(totalAR)}`}
          </div>
        </div>
        <div className="fin-k">
          <div className="fin-k-l">{tp('finance', 'kpiPendingAp')}</div>
          <div className="fin-k-v" style={{ color: 'var(--red)' }}>
            {loading ? '…' : `$${fmt(totalAP)}`}
          </div>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            ['overview', tp('finance', 'tabOverview')],
            ['cashflow', tp('finance', 'tabCashflow')],
            ['pl', tp('finance', 'tabPl')],
            ['ar', tp('finance', 'tabAr')],
            ['ap', tp('finance', 'tabAp')],
          ] as const
        ).map(([id, label]) => (
          <div key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} role="button" tabIndex={0}>
            {label}
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <EmptyState title={tp('finance', 'loadingRecords')} size="compact" />
            ) : financePage.length === 0 ? (
              <EmptyState title={tp('finance', 'noRecords')} size="compact" />
            ) : (
              <>
                <table className="tbl">
              <thead>
                <tr>
                  <th>{tp('finance', 'colId')}</th>
                  <th>{tp('finance', 'colBooking')}</th>
                  <th>{tp('finance', 'colClient')}</th>
                  <th>{tp('finance', 'colType')}</th>
                  <th>{tp('finance', 'colMonth')}</th>
                  <th>{tp('finance', 'colRevenue')}</th>
                  <th>{tp('finance', 'colCost')}</th>
                  <th>{tp('finance', 'colCashIn')}</th>
                  <th>{tp('finance', 'colCashOut')}</th>
                  <th>{tp('finance', 'colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {financePage.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{f.id}</code>
                    </td>
                    <td style={{ fontSize: 11 }}>{f.bkid || '—'}</td>
                    <td>{f.custName || f.notes || '—'}</td>
                    <td>
                      <span className={`bdg ${f.type === 'Tour' ? 'bdg-g' : 'bdg-w'}`}>{f.type}</span>
                    </td>
                    <td>{f.month || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{f.rev ? `$${fmt(f.rev)}` : '—'}</td>
                    <td>{f.cost ? `$${fmt(f.cost)}` : '—'}</td>
                    <td style={{ color: 'var(--blue)' }}>{f.cashIn ? `$${fmt(f.cashIn)}` : '—'}</td>
                    <td style={{ color: 'var(--red)' }}>{f.cashOut ? `$${fmt(f.cashOut)}` : '—'}</td>
                    <td>
                      <span className={`bdg ${f.status === 'Paid' ? 'bdg-g' : 'bdg-a'}`}>{f.status || '—'}</span>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
              <PaginationBar {...financePagination} onPageSizeChange={setPageSize} />
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'cashflow' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('finance', 'monthlyCashflow')}</span>
            <span style={{ fontSize: 12, color: 'var(--m)' }}>
              {tpl('finance', 'cashOutTotal', { amount: `$${loading ? '…' : fmt(totalCashOut)}` })}
            </span>
          </div>
          <div className="card-body">
            {loading ? (
              <EmptyState title={tp('finance', 'loadingCashflow')} size="compact" />
            ) : monthlyCash.length === 0 ? (
              <EmptyState title={tp('finance', 'noCashflow')} size="compact" />
            ) : (
              monthlyCash.map(([month, { in: cin, out: cout }]) => (
              <div key={month} className="fin-cf-row">
                <div className="fin-cf-label">{month}</div>
                <div className="fin-cf-bars">
                  <div className="fin-cf-bar-wrap">
                    <div className="fin-cf-bar fin-cf-in" style={{ width: `${(cin / maxCash) * 100}%` }} title={tpl('finance', 'cashInTooltip', { amount: fmt(cin) })} />
                    <span className="fin-cf-val">${fmt(cin)}</span>
                  </div>
                  <div className="fin-cf-bar-wrap">
                    <div className="fin-cf-bar fin-cf-out" style={{ width: `${(cout / maxCash) * 100}%` }} title={tpl('finance', 'cashOutTooltip', { amount: fmt(cout) })} />
                    <span className="fin-cf-val">${fmt(cout)}</span>
                  </div>
                </div>
                <div className="fin-cf-net" style={{ color: cin - cout >= 0 ? 'var(--g)' : 'var(--red)' }}>
                  {cin - cout >= 0 ? '+' : ''}${fmt(cin - cout)}
                </div>
                </div>
              ))
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11.5 }}>
              <span>
                <span className="fin-cf-legend fin-cf-in" /> {tp('finance', 'cashInLegend')}
              </span>
              <span>
                <span className="fin-cf-legend fin-cf-out" /> {tp('finance', 'cashOutLegend')}
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === 'pl' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('finance', 'plSummary')}</span>
          </div>
          <div className="card-body">
            <table className="tbl" style={{ maxWidth: 480 }}>
              <tbody>
                <tr>
                  <td>{tp('finance', 'plTourRevenue')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--g)' }}>${fmt(totalRev)}</td>
                </tr>
                <tr>
                  <td>{tp('finance', 'plTourCosts')}</td>
                  <td style={{ textAlign: 'right', color: 'var(--red)' }}>(${fmt(totalCost)})</td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--b)' }}>
                  <td>
                    <b>{tp('finance', 'plGrossProfit')}</b>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--g)' }}>${fmt(grossProfit)}</td>
                </tr>
                <tr>
                  <td>{tp('finance', 'plOperatingExpenses')}</td>
                  <td style={{ textAlign: 'right', color: 'var(--red)' }}>(${fmt(totalCashOut)})</td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--g)' }}>
                  <td>
                    <b>{tp('finance', 'plNetPosition')}</b>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>${fmt(grossProfit - totalCashOut)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ar' && (
        <>
          <div className="search-row">
            <select value={arFilter} onChange={(e) => setArFilter(e.target.value)}>
              <option value="">{tp('finance', 'allStatuses')}</option>
              <option>Outstanding</option>
              <option>Overdue</option>
              <option>Paid</option>
            </select>
            <span className="bdg bdg-a">{tpl('finance', 'outstandingBadge', { amount: fmt(totalAR) })}</span>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{tp('finance', 'colId')}</th>
                    <th>{tp('finance', 'colClient')}</th>
                    <th>{tp('finance', 'colTour')}</th>
                    <th>{tp('finance', 'colInvoice')}</th>
                    <th>{tp('finance', 'colDeposit')}</th>
                    <th>{tp('finance', 'colBalance')}</th>
                    <th>{tp('finance', 'colDue')}</th>
                    <th>{tp('finance', 'colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState title={tp('finance', 'loadingReceivables')} size="compact" />
                      </td>
                    </tr>
                  ) : arPage.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          title={tp('finance', 'noReceivablesMatch')}
                          size="compact"
                        />
                      </td>
                    </tr>
                  ) : (
                    arPage.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{r.id}</code>
                      </td>
                      <td>
                        <b>{r.custName}</b>
                      </td>
                      <td style={{ fontSize: 12 }}>{r.tour}</td>
                      <td style={{ fontWeight: 600 }}>${fmt(r.invoiceAmt || 0)}</td>
                      <td style={{ color: 'var(--blue)' }}>${fmt(r.depositPaid || 0)}</td>
                      <td style={{ fontWeight: 600, color: (r.balance || 0) > 0 ? 'var(--amb)' : 'var(--g)' }}>
                        ${fmt(r.balance || 0)}
                      </td>
                      <td style={{ fontSize: 12, color: r.status === 'Overdue' ? 'var(--red)' : 'var(--m)' }}>{r.dueDate}</td>
                      <td>
                        <span className={`bdg ${r.status === 'Paid' ? 'bdg-g' : r.status === 'Overdue' ? 'bdg-r' : 'bdg-a'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
              <PaginationBar {...arPagination} onPageSizeChange={setPageSize} />
            </div>
          </div>
        </>
      )}

      {tab === 'ap' && (
        <>
          <div className="search-row">
            <select value={apFilter} onChange={(e) => setApFilter(e.target.value)}>
              <option value="">{tp('finance', 'allStatuses')}</option>
              <option>Pending</option>
              <option>Overdue</option>
              <option>Paid</option>
            </select>
            <span className="bdg bdg-r">{tpl('finance', 'pendingBadge', { amount: fmt(totalAP) })}</span>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{tp('finance', 'colId')}</th>
                    <th>{tp('finance', 'colSupplier')}</th>
                    <th>{tp('finance', 'colDescription')}</th>
                    <th>{tp('finance', 'colCategory')}</th>
                    <th>{tp('finance', 'colAmount')}</th>
                    <th>{tp('finance', 'colDue')}</th>
                    <th>{tp('finance', 'colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState title={tp('finance', 'loadingPayables')} size="compact" />
                      </td>
                    </tr>
                  ) : apPage.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState title={tp('finance', 'noPayablesMatch')} size="compact" />
                      </td>
                    </tr>
                  ) : (
                    apPage.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{p.id}</code>
                      </td>
                      <td>
                        <b>{p.supplier}</b>
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 220 }}>{p.description}</td>
                      <td>
                        <span className="bdg bdg-w">{p.category}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>${fmt(p.amount || 0)}</td>
                      <td style={{ fontSize: 12, color: p.status === 'Overdue' ? 'var(--red)' : 'var(--m)' }}>{p.dueDate}</td>
                      <td>
                        <span className={`bdg ${p.status === 'Paid' ? 'bdg-g' : p.status === 'Overdue' ? 'bdg-r' : 'bdg-a'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
              <PaginationBar {...apPagination} onPageSizeChange={setPageSize} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
