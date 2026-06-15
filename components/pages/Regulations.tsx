'use client';

import Link from 'next/link';
import { useState } from 'react';

type RegTab = 'tour' | 'team';

export default function Regulations() {
  const [tab, setTab] = useState<RegTab>('tour');

  return (
    <div>
      <div className="info-bar" style={{ marginBottom: 14 }}>
        Internal regulations and operational guidelines. See also{' '}
        <Link href="/sales" style={{ color: 'var(--g)', fontWeight: 600 }}>
          Sales Pipeline → Tour Policy tab
        </Link>
        .
      </div>
      <div className="tabs">
        <div className={`tab${tab === 'tour' ? ' on' : ''}`} onClick={() => setTab('tour')} role="button" tabIndex={0}>
          Tour Regulations
        </div>
        <div className={`tab${tab === 'team' ? ' on' : ''}`} onClick={() => setTab('team')} role="button" tabIndex={0}>
          Team Regulations
        </div>
      </div>

      {tab === 'tour' && (
        <>
          <div className="reg-grid-2">
            <div className="card">
              <div className="card-hd">
                <span className="card-title">📋 Booking & Payment Policy</span>
              </div>
              <div className="card-body reg-policy-list">
                <div className="reg-policy-item">
                  <span className="reg-pill reg-pill-g">30%</span>
                  <span>Non-refundable deposit to confirm. Payable within 7 days of confirmation.</span>
                </div>
                <div className="reg-policy-item">
                  <span className="reg-pill reg-pill-g">70%</span>
                  <span>Balance due 45 days before departure. Bookings within 45 days: full payment at confirmation.</span>
                </div>
                <div className="reg-policy-item">
                  <span className="reg-pill reg-pill-b">FX</span>
                  <span>All prices in USD. Payment via bank transfer or credit card (+2.5% fee).</span>
                </div>
                <div className="reg-policy-item">
                  <span className="reg-pill reg-pill-p">B2B</span>
                  <span>Agent commission paid within 14 days after tour completion. Bronze 8% / Silver 12% / Gold 15% / Platinum 20%.</span>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-hd">
                <span className="card-title">🚫 Cancellation Policy</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Notice Period</th>
                      <th>Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>60+ days before</td>
                      <td>Deposit forfeited</td>
                    </tr>
                    <tr>
                      <td>45–59 days</td>
                      <td>30% of total</td>
                    </tr>
                    <tr>
                      <td>30–44 days</td>
                      <td>50% of total</td>
                    </tr>
                    <tr>
                      <td>15–29 days</td>
                      <td>75% of total</td>
                    </tr>
                    <tr>
                      <td>0–14 days / no-show</td>
                      <td style={{ color: 'var(--red)', fontWeight: 600 }}>100% of total</td>
                    </tr>
                  </tbody>
                </table>
                <div className="reg-force-majeure">⚠ Force majeure handled case-by-case. Credit or rescheduling where possible.</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-hd">
              <span className="card-title">📁 Document Checklist</span>
            </div>
            <div className="card-body">
              <div className="reg-checklist-grid">
                {[
                  ['Sales Stage', ['Tour Proposal (PDF)', 'Pricing Table', 'Client intake form', 'Terms & Conditions']],
                  ['Booking Stage', ['Booking Confirmation', 'Deposit Invoice', 'Full payment receipt', 'Travel insurance proof']],
                  ['Operations Stage', ['Guide Brief', 'Hotel vouchers', 'Transport schedule', 'Emergency contact sheet']],
                ].map(([title, items]) => (
                  <div key={String(title)} className="reg-checklist-col">
                    <div className="reg-checklist-title">{title}</div>
                    {(items as string[]).map((item) => (
                      <div key={item}>☐ {item}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'team' && (
        <div className="reg-grid-2">
          <div className="card">
            <div className="card-hd">
              <span className="card-title">⏰ Working Hours & Attendance</span>
            </div>
            <div className="card-body reg-policy-list">
              <div className="reg-policy-item">
                <span className="reg-pill reg-pill-g">HOURS</span>
                <span>Monday–Saturday, 8:30 AM – 5:30 PM (GMT+7). Lunch 12:00–1:00 PM.</span>
              </div>
              <div className="reg-policy-item">
                <span className="reg-pill reg-pill-a">LATE</span>
                <span>3 late arrivals in a month = formal warning.</span>
              </div>
              <div className="reg-policy-item">
                <span className="reg-pill reg-pill-r">ABS</span>
                <span>Absences must be reported by 8 AM. No-call-no-show is a serious disciplinary matter.</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">📱 Communication Standards</span>
            </div>
            <div className="card-body" style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="sal-bonus-pill">
                <b>Client response time:</b> All enquiries acknowledged within 2 hours during office hours.
              </div>
              <div className="sal-bonus-pill">
                <b>CRM compliance:</b> All interactions MUST be logged in the CRM same day.
              </div>
              <div className="sal-bonus-pill sal-bonus-tet">
                <b>Zero tolerance:</b> Discrimination, harassment, or kickbacks without disclosure — immediate dismissal.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
