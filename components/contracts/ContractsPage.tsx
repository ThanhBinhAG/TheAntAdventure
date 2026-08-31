'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildContractHTML, downloadContractWord, printContract } from '@/lib/contracts/contract-html';
import type { ContractListItem } from '@/lib/contracts/contract-input';
import type { ContractInput } from '@/lib/contracts/contract-input';
import type { BookingListItem } from '@/lib/bookings/booking-input';
import { localTodayIso } from '@/lib/core/date-utils';
import { useStore } from '@/hooks/useStore';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { useContractsPage } from '@/hooks/useContractsPage';
import { useCreateContract } from '@/hooks/useCreateContract';
import { useUpdateContract } from '@/hooks/useUpdateContract';
import { useDeleteContract } from '@/hooks/useDeleteContract';
import { useEnsureBookingsCatalogLoaded } from '@/hooks/useEnsureBookingsCatalogLoaded';
import { useEnsureCustomersCatalogLoaded } from '@/hooks/useEnsureCustomersCatalogLoaded';
import ContractFormModal from '@/components/contracts/ContractFormModal';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { usePagePermission } from '@/hooks/usePagePermission';
import type { CreateContractOutcome } from '@/hooks/useCreateContract';

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Draft: { bg: '#FEF3C7', color: '#92400E', border: '#D97706' },
  Sent: { bg: '#DBEAFE', color: '#1e3a8a', border: '#1565C0' },
  Signed: { bg: '#E8F5EE', color: '#1a5c38', border: '#2E7D52' },
};

function statusBadge(status?: string) {
  const s = STATUS_STYLE[status || 'Draft'] || STATUS_STYLE.Draft;
  return (
    <span className="ctr-status-badge" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {status}
    </span>
  );
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Contracts() {
  const { canWrite } = usePagePermission('contracts');
  const { items: contracts, loading, error, reload } = useContractsPage();
  const { createContract } = useCreateContract();
  const { patchContract } = useUpdateContract();
  const { deleteContract } = useDeleteContract();
  const { ensureCatalog } = useEnsureBookingsCatalogLoaded();
  const { ensureCatalog: ensureCustomersCatalog } = useEnsureCustomersCatalogLoaded();
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<ContractListItem | null>(null);

  useEffect(() => {
    void ensureCatalog();
    void ensureCustomersCatalog();
  }, [ensureCatalog, ensureCustomersCatalog]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contracts.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (q && !`${c.clientName} ${c.tourName} ${c.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contracts, search, filter]);

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(filtered, pageSize, [search, filter, pageSize]);
  const { paginatedItems } = pagination;

  const kpis = useMemo(() => {
    const draft = contracts.filter((c) => c.status === 'Draft').length;
    const sent = contracts.filter((c) => c.status === 'Sent').length;
    const signed = contracts.filter((c) => c.status === 'Signed').length;
    const pipeline = contracts.filter((c) => c.status !== 'Draft').reduce((s, c) => s + Number(c.total || 0), 0);
    return { total: contracts.length, draft, sent, signed, pipeline };
  }, [contracts]);

  const handleCreateContract = async (contract: ContractInput): Promise<CreateContractOutcome> => {
    setSaving(true);
    const outcome = await createContract({
      ...contract,
      createdAt: localTodayIso(),
    });
    setSaving(false);

    if (!outcome.ok) {
      return outcome;
    }

    setPreview(outcome.contract);
    await reload();
    return outcome;
  };

  const changeStatus = async (status: string) => {
    if (!preview || !canWrite) return;
    const signedAt = status === 'Signed' ? localTodayIso() : null;
    const outcome = await patchContract(preview.id, { status, signedAt });
    if (!outcome.ok) {
      toast.error(outcome.message);
      return;
    }
    setPreview(outcome.contract);
  };

  async function handleDeleteContract(contract: ContractListItem) {
    if (!canWrite) return;
    const ok = await confirmDialog(
      `Delete ${contract.id} (${contract.clientName})? This cannot be undone.`,
      { title: 'Delete contract', confirmLabel: 'Delete' },
    );
    if (!ok) return;

    const outcome = await deleteContract(contract.id);
    if (!outcome.ok) {
      toast.error(outcome.message);
      return;
    }

    if (preview?.id === contract.id) setPreview(null);
    await reload();
    toast.success('Contract deleted.');
  }

  return (
    <div>
      <div className="ctr-header-bar">
        <input className="ctr-search" placeholder="🔍  Search contracts…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="ctr-filters">
          {(['all', 'Draft', 'Sent', 'Signed'] as const).map((f) => (
            <button key={f} type="button" className={`ctr-filter-btn${filter === f ? ' on' : ''}`} data-status={f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        <button
          className="btn btn-p btn-sm"
          type="button"
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            void ensureCatalog();
            void ensureCustomersCatalog();
            setShowNew(true);
          }}
          disabled={!canWrite}
          title={!canWrite ? 'You need write permission for Contracts to create a contract' : undefined}
        >
          ＋ New Contract
        </button>
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: 12, color: 'var(--r)' }}>
          {error}{' '}
          <button type="button" className="btn btn-s btn-sm" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="ctr-kpi-row">
        {[
          ['Total Contracts', kpis.total, 'var(--gd)'],
          ['Draft', kpis.draft, '#D97706'],
          ['Sent to Client', kpis.sent, 'var(--blue)'],
          ['Signed', kpis.signed, 'var(--g)'],
          ['Pipeline Value', `$${kpis.pipeline.toLocaleString('en-US')}`, 'var(--pur)'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="ctr-kpi-pill">
            <div className="ctr-kpi-val" style={{ color: color as string }}>
              {value}
            </div>
            <div className="ctr-kpi-lbl">{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Contract No.</th>
              <th>Client</th>
              <th>Tour</th>
              <th>Pax</th>
              <th>Value</th>
              <th>Departure</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && contracts.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--mu)' }}>
                  Loading contracts…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 0, border: 'none' }}>
                  <EmptyState
                    className="crm-empty-state--table"
                    size="compact"
                    variant="docs"
                    title="No contracts found"
                    description="Create a contract from a confirmed booking, or adjust filters if you expected results."
                    action={
                      <button
                        type="button"
                        className="btn btn-p btn-sm"
                        onClick={() => setShowNew(true)}
                        disabled={!canWrite}
                        title={!canWrite ? 'You need write permission for Contracts to create a contract' : undefined}
                      >
                        ＋ New Contract
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : (
              paginatedItems.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setPreview(c)}>
                  <td>
                    <b style={{ color: 'var(--gd)' }}>{c.id}</b>
                  </td>
                  <td>{c.clientName}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.tourName}>
                    {c.tourName}
                  </td>
                  <td style={{ textAlign: 'center' }}>{c.pax}</td>
                  <td>
                    <b>
                      {c.currency} {Number(c.total).toLocaleString('en-US')}
                    </b>
                  </td>
                  <td>{fmtDate(c.departureDate)}</td>
                  <td>{statusBadge(c.status)}</td>
                  <td>{fmtDate(c.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-s btn-sm" type="button" onClick={() => setPreview(c)}>
                        👁 View
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        type="button"
                        disabled={!canWrite}
                        title={!canWrite ? 'You need write permission for Contracts to delete' : undefined}
                        onClick={() => void handleDeleteContract(c)}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
      </div>

      <ContractFormModal
        open={showNew}
        bookings={bookings as BookingListItem[]}
        customers={customers}
        saving={saving}
        onClose={() => setShowNew(false)}
        onCreate={handleCreateContract}
      />

      {preview && (
        <div className="overlay open" onClick={() => setPreview(null)}>
          <div className="modal ctr-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd modal-hd-green" style={{ borderRadius: '12px 12px 0 0' }}>
              <div style={{ color: '#fff', fontWeight: 700 }}>
                📄 {preview.id} — {preview.clientName}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={preview.status}
                  disabled={!canWrite}
                  title={!canWrite ? 'You need write permission for Contracts to change status' : undefined}
                  onChange={(e) => void changeStatus(e.target.value)}
                  className="ctr-status-select"
                >
                  <option>Draft</option>
                  <option>Sent</option>
                  <option>Signed</option>
                </select>
                <button className="modal-close-btn" type="button" onClick={() => setPreview(null)}>
                  ✕
                </button>
              </div>
            </div>
            <div className="ctr-preview-body" dangerouslySetInnerHTML={{ __html: buildContractHTML(preview) }} />
            <div style={{ padding: '12px 22px 22px', display: 'flex', gap: 8, borderTop: '1px solid var(--b)', flexWrap: 'wrap' }}>
              <button className="btn btn-p btn-sm" type="button" onClick={() => printContract(preview)}>
                🖨 Print / PDF
              </button>
              <button className="btn btn-s btn-sm" type="button" onClick={() => downloadContractWord(preview)}>
                📄 Download Word
              </button>
              <button
                className="btn btn-danger btn-sm"
                type="button"
                style={{ marginLeft: 'auto' }}
                disabled={!canWrite}
                title={!canWrite ? 'You need write permission for Contracts to delete' : undefined}
                onClick={() => void handleDeleteContract(preview)}
              >
                🗑 Delete Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
