'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { getTourDraftForLead } from '@/lib/tour-design/tour-design-leads';
import { getCustomerName } from '@/lib/core/crm-utils';
import type { Customer, Lead, TourDraft } from '@/lib/types';

function sessionHref(lead: Lead, step: number) {
  return `/tourdesign?leadId=${encodeURIComponent(lead.id)}&custId=${encodeURIComponent(lead.custId)}&step=${step}`;
}

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
  const { tp, tpl } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const total = pendingLeads.length + awaitingOutline.length;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (total === 0) return null;

  return (
    <div className="td-queue" ref={rootRef}>
      <button
        type="button"
        className="td-queue-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{tp('tour-design', 'queueTourTasks')}</span>
        <span className="td-queue-badge">{total}</span>
        <span className="td-queue-chevron" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <div className="td-queue-popover" role="dialog" aria-label={tp('tour-design', 'queueDialogAria')}>
          {pendingLeads.length > 0 && (
            <section className="td-queue-group">
              <div className="td-queue-group-hd">{tp('tour-design', 'queueNewFromSales')}</div>
              <ul className="td-queue-list">
                {pendingLeads.map((l) => {
                  const current = l.id === leadId;
                  return (
                    <li key={l.id} className={`td-queue-item${current ? ' is-current' : ''}`}>
                      <div className="td-queue-item-copy">
                        <strong>{getCustomerName(customers, l.custId)}</strong>
                        {l.month ? <span className="td-queue-meta">{l.month}</span> : null}
                      </div>
                      {current ? (
                        <span className="td-queue-current">{tp('tour-design', 'queueOpen')}</span>
                      ) : (
                        <Link
                          href={sessionHref(l, 0)}
                          className="btn btn-p btn-sm"
                          onClick={() => setOpen(false)}
                        >
                          {tp('tour-design', 'queueOpen')}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {awaitingOutline.length > 0 && (
            <section className="td-queue-group">
              <div className="td-queue-group-hd">{tp('tour-design', 'queueAwaitingApproval')}</div>
              <ul className="td-queue-list">
                {awaitingOutline.map((l) => {
                  const draft = getTourDraftForLead(l.id, tourDrafts);
                  const current = l.id === leadId;
                  return (
                    <li key={l.id} className={`td-queue-item${current ? ' is-current' : ''}`}>
                      <div className="td-queue-item-copy">
                        <strong>{getCustomerName(customers, l.custId)}</strong>
                        <span className="td-queue-meta">
                          {tpl('tour-design', 'queueOutlineSent', {
                            revision: draft?.outlineRevision ?? 1,
                          })}
                        </span>
                      </div>
                      {current ? (
                        <span className="td-queue-current">{tp('tour-design', 'queueOpen')}</span>
                      ) : (
                        <Link
                          href={sessionHref(l, 1)}
                          className="btn btn-s btn-sm"
                          onClick={() => setOpen(false)}
                        >
                          {tp('tour-design', 'queueOpen')}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
