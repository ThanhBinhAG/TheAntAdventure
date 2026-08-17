'use client';

import Link from 'next/link';
import { getTourDraftForLead } from '@/lib/tour-design/tour-design-leads';
import { getCustomerName } from '@/lib/core/crm-utils';
import type { Customer, Lead, TourDraft } from '@/lib/types';

export function TourDesignQueueCards({
  pendingLeads,
  awaitingOutline,
  leadId,
  customers,
  tourDrafts,
}: {
  pendingLeads: Lead[];
  awaitingOutline: Lead[];
  leadId: string;
  customers: Customer[];
  tourDrafts: TourDraft[];
}) {
  return (
    <>
      {pendingLeads.length > 0 && !leadId && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-hd">
            <span className="card-title">New clients from Sales Pipeline</span>
          </div>
          <div className="card-body" style={{ padding: 12 }}>
            {pendingLeads.map((l) => (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--b)',
                }}
              >
                <div style={{ fontSize: 13 }}>
                  <strong>{getCustomerName(customers, l.custId)}</strong>
                  <span style={{ color: 'var(--m)', marginLeft: 8 }}>{l.month}</span>
                </div>
                <Link
                  href={`/tourdesign?leadId=${encodeURIComponent(l.id)}&custId=${encodeURIComponent(l.custId)}&step=0`}
                  className="btn btn-p btn-sm"
                >
                  Continue →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {awaitingOutline.length > 0 && (
        <div className="card" style={{ marginBottom: 14, borderColor: 'var(--amb)' }}>
          <div className="card-hd">
            <span className="card-title">Awaiting outline approval</span>
          </div>
          <div className="card-body" style={{ padding: 12 }}>
            {awaitingOutline.map((l) => {
              const draft = getTourDraftForLead(l.id, tourDrafts);
              return (
                <div
                  key={l.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--b)',
                  }}
                >
                  <div style={{ fontSize: 13 }}>
                    <strong>{getCustomerName(customers, l.custId)}</strong>
                    <span style={{ color: 'var(--m)', marginLeft: 8 }}>
                      Outline v{draft?.outlineRevision ?? 1} sent — waiting for client
                    </span>
                  </div>
                  <Link
                    href={`/tourdesign?leadId=${encodeURIComponent(l.id)}&custId=${encodeURIComponent(l.custId)}&step=1`}
                    className="btn btn-s btn-sm"
                  >
                    Open outline →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
