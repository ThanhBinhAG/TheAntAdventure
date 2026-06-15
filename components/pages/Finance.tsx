'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { useStore } from '@/hooks/useStore';

type FinTab = 'overview' | 'cashflow' | 'pl' | 'ar' | 'ap';

type FinRow = {
  id: string;
  bkid?: string;
  custName?: string;
  type: string;
  date?: string;
  month?: string;
  rev?: number;
  cost?: number;
  cashIn?: number;
  cashOut?: number;
  status?: string;
  inv?: string;
  notes?: string;
};

type ARRow = {
  id: string;
  custName?: string;
  tour?: string;
  invoiceAmt?: number;
  depositPaid?: number;
  balance?: number;
  dueDate?: string;
  status?: string;
};

type APRow = {
  id: string;
  supplier?: string;
  description?: string;
  amount?: number;
  dueDate?: string;
  status?: string;
  category?: string;
};

export default function Finance() {
  const finance = useStore((s) => s.finance) as FinRow[];
  const ar = useStore((s) => s.ar) as ARRow[];
  const ap = useStore((s) => s.ap) as APRow[];
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

  return (
    <div>
      <div className="fin-kpi fin-kpi-5">
        <div className="fin-k">
          <div className="fin-k-l">Revenue YTD</div>
          <div className="fin-k-v" style={{ color: 'var(--g)' }}>${fmt(totalRev)}</div>
        </div>
        <div className="fin-k">
          <div className="fin-k-l">Gross Profit</div>
          <div className="fin-k-v" style={{ color: 'var(--g)' }}>${fmt(grossProfit)}</div>
        </div>
        <div className="fin-k">
          <div className="fin-k-l">Cash In</div>
          <div className="fin-k-v" style={{ color: 'var(--blue)' }}>${fmt(totalCashIn)}</div>
        </div>
        <div className="fin-k">
          <div className="fin-k-l">Outstanding AR</div>
          <div className="fin-k-v" style={{ color: 'var(--amb)' }}>${fmt(totalAR)}</div>
        </div>
        <div className="fin-k">
          <div className="fin-k-l">Pending AP</div>
          <div className="fin-k-v" style={{ color: 'var(--red)' }}>${fmt(totalAP)}</div>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            ['overview', 'Overview'],
            ['cashflow', 'Cashflow'],
            ['pl', 'P&L'],
            ['ar', 'Accounts Receivable'],
            ['ap', 'Accounts Payable'],
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
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Booking</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Cash In</th>
                  <th>Cash Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {finance.map((f) => (
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
          </div>
        </div>
      )}

      {tab === 'cashflow' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">Monthly Cashflow</span>
            <span style={{ fontSize: 12, color: 'var(--m)' }}>Cash Out: ${fmt(totalCashOut)} total</span>
          </div>
          <div className="card-body">
            {monthlyCash.map(([month, { in: cin, out: cout }]) => (
              <div key={month} className="fin-cf-row">
                <div className="fin-cf-label">{month}</div>
                <div className="fin-cf-bars">
                  <div className="fin-cf-bar-wrap">
                    <div className="fin-cf-bar fin-cf-in" style={{ width: `${(cin / maxCash) * 100}%` }} title={`In: $${fmt(cin)}`} />
                    <span className="fin-cf-val">${fmt(cin)}</span>
                  </div>
                  <div className="fin-cf-bar-wrap">
                    <div className="fin-cf-bar fin-cf-out" style={{ width: `${(cout / maxCash) * 100}%` }} title={`Out: $${fmt(cout)}`} />
                    <span className="fin-cf-val">${fmt(cout)}</span>
                  </div>
                </div>
                <div className="fin-cf-net" style={{ color: cin - cout >= 0 ? 'var(--g)' : 'var(--red)' }}>
                  {cin - cout >= 0 ? '+' : ''}${fmt(cin - cout)}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11.5 }}>
              <span>
                <span className="fin-cf-legend fin-cf-in" /> Cash In
              </span>
              <span>
                <span className="fin-cf-legend fin-cf-out" /> Cash Out
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === 'pl' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">Profit & Loss Summary</span>
          </div>
          <div className="card-body">
            <table className="tbl" style={{ maxWidth: 480 }}>
              <tbody>
                <tr>
                  <td>Tour Revenue</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--g)' }}>${fmt(totalRev)}</td>
                </tr>
                <tr>
                  <td>Tour Costs</td>
                  <td style={{ textAlign: 'right', color: 'var(--red)' }}>(${fmt(totalCost)})</td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--b)' }}>
                  <td>
                    <b>Gross Profit</b>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--g)' }}>${fmt(grossProfit)}</td>
                </tr>
                <tr>
                  <td>Operating Expenses (Salaries)</td>
                  <td style={{ textAlign: 'right', color: 'var(--red)' }}>(${fmt(totalCashOut)})</td>
                </tr>
                <tr style={{ borderTop: '2px solid var(--g)' }}>
                  <td>
                    <b>Net Position (approx.)</b>
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
              <option value="">All Statuses</option>
              <option>Outstanding</option>
              <option>Overdue</option>
              <option>Paid</option>
            </select>
            <span className="bdg bdg-a">${fmt(totalAR)} outstanding</span>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Client</th>
                    <th>Tour</th>
                    <th>Invoice</th>
                    <th>Deposit</th>
                    <th>Balance</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {arFiltered.map((r) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'ap' && (
        <>
          <div className="search-row">
            <select value={apFilter} onChange={(e) => setApFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option>Pending</option>
              <option>Overdue</option>
              <option>Paid</option>
            </select>
            <span className="bdg bdg-r">${fmt(totalAP)} pending</span>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Supplier</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Due</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {apFiltered.map((p) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
