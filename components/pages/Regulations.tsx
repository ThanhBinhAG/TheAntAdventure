'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

type RegTab = 'tour' | 'team';

const CANCEL_ROWS = [
  ['regCancel60plus', 'regCancelDepositForfeited'],
  ['regCancel45to59', 'regCancel30pct'],
  ['regCancel30to44', 'regCancel50pct'],
  ['regCancel15to29', 'regCancel75pct'],
  ['regCancel0to14', 'regCancel100pct'],
] as const;

const CHECKLIST = [
  {
    titleKey: 'regStageSales',
    items: ['regDocProposal', 'regDocPricingTable', 'regDocIntake', 'regDocTerms'] as const,
  },
  {
    titleKey: 'regStageBooking',
    items: ['regDocConfirmation', 'regDocDepositInvoice', 'regDocPaymentReceipt', 'regDocInsurance'] as const,
  },
  {
    titleKey: 'regStageOperations',
    items: ['regDocGuideBrief', 'regDocHotelVouchers', 'regDocTransportSchedule', 'regDocEmergencyContact'] as const,
  },
] as const;

export default function Regulations() {
  const { tp } = useLanguage();
  const [tab, setTab] = useState<RegTab>('tour');

  return (
    <div>
      <div className="info-bar" style={{ marginBottom: 14 }}>
        {tp('portal', 'regIntro')}{' '}
        <Link href="/sales" style={{ color: 'var(--g)', fontWeight: 600 }}>
          {tp('portal', 'regSalesLink')}
        </Link>
        .
      </div>
      <div className="tabs">
        <div className={`tab${tab === 'tour' ? ' on' : ''}`} onClick={() => setTab('tour')} role="button" tabIndex={0}>
          {tp('portal', 'regTabTour')}
        </div>
        <div className={`tab${tab === 'team' ? ' on' : ''}`} onClick={() => setTab('team')} role="button" tabIndex={0}>
          {tp('portal', 'regTabTeam')}
        </div>
      </div>

      {tab === 'tour' && (
        <>
          <div className="reg-grid-2">
            <div className="card">
              <div className="card-hd">
                <span className="card-title">📋 {tp('portal', 'regBookingPayment')}</span>
              </div>
              <div className="card-body reg-policy-list">
                <div className="reg-policy-item">
                  <span className="reg-pill reg-pill-g">30%</span>
                  <span>{tp('portal', 'regDeposit30')}</span>
                </div>
                <div className="reg-policy-item">
                  <span className="reg-pill reg-pill-g">70%</span>
                  <span>{tp('portal', 'regBalance70')}</span>
                </div>
                <div className="reg-policy-item">
                  <span className="reg-pill reg-pill-b">FX</span>
                  <span>{tp('portal', 'regFx')}</span>
                </div>
                <div className="reg-policy-item">
                  <span className="reg-pill reg-pill-p">B2B</span>
                  <span>{tp('portal', 'regB2b')}</span>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-hd">
                <span className="card-title">🚫 {tp('portal', 'regCancellation')}</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{tp('portal', 'regNoticePeriod')}</th>
                      <th>{tp('portal', 'regPenalty')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CANCEL_ROWS.map(([periodKey, penaltyKey]) => (
                      <tr key={periodKey}>
                        <td>{tp('portal', periodKey)}</td>
                        <td style={periodKey === 'regCancel0to14' ? { color: 'var(--red)', fontWeight: 600 } : undefined}>
                          {tp('portal', penaltyKey)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="reg-force-majeure">⚠ {tp('portal', 'regForceMajeure')}</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-hd">
              <span className="card-title">📁 {tp('portal', 'regDocChecklist')}</span>
            </div>
            <div className="card-body">
              <div className="reg-checklist-grid">
                {CHECKLIST.map(({ titleKey, items }) => (
                  <div key={titleKey} className="reg-checklist-col">
                    <div className="reg-checklist-title">{tp('portal', titleKey)}</div>
                    {items.map((itemKey) => (
                      <div key={itemKey}>☐ {tp('portal', itemKey)}</div>
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
              <span className="card-title">⏰ {tp('portal', 'regWorkingHours')}</span>
            </div>
            <div className="card-body reg-policy-list">
              <div className="reg-policy-item">
                <span className="reg-pill reg-pill-g">HOURS</span>
                <span>{tp('portal', 'regHours')}</span>
              </div>
              <div className="reg-policy-item">
                <span className="reg-pill reg-pill-a">LATE</span>
                <span>{tp('portal', 'regLate')}</span>
              </div>
              <div className="reg-policy-item">
                <span className="reg-pill reg-pill-r">ABS</span>
                <span>{tp('portal', 'regAbsence')}</span>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">📱 {tp('portal', 'regCommunication')}</span>
            </div>
            <div className="card-body" style={{ fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="sal-bonus-pill">{tp('portal', 'regClientResponse')}</div>
              <div className="sal-bonus-pill">{tp('portal', 'regCrmCompliance')}</div>
              <div className="sal-bonus-pill sal-bonus-tet">{tp('portal', 'regZeroTolerance')}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
