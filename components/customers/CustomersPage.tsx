'use client';

import { useMemo, useState } from 'react';
import { SRC_COLORS, STAGE_COLORS, fmt } from '@/lib/constants';
import { SALES_PEOPLE } from '@/lib/customers/customer-form';
import { customerMatchesSearch, getClientPipeline } from '@/lib/core/crm-utils';
import { npsBadgeClass, npsIcon } from '@/lib/core/page-helpers';
import { useStore } from '@/hooks/useStore';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import { usePagePermission } from '@/hooks/usePagePermission';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import CustomerProfileModal from '@/components/customers/CustomerProfileModal';
import { useRegisterCustomer } from '@/hooks/useRegisterCustomer';
import { useDeleteCustomer } from '@/hooks/useDeleteCustomer';
import { toast } from '@/lib/toast';

import { confirmDialog } from '@/lib/confirm';

const TYPE_FILTERS: { value: string; label: string; style?: React.CSSProperties }[] = [
  { value: '', label: 'All (B2B + B2C)' },
  { value: 'b2b', label: 'B2B', style: { borderColor: '#6B21A8', color: '#6B21A8' } },
  { value: 'b2c', label: 'B2C', style: { borderColor: '#1565C0', color: '#1565C0' } },
];

const STAGE_FILTERS: { value: string; label: string; style?: React.CSSProperties }[] = [
  { value: '', label: 'All Clients' },
  { value: 'Inquiry', label: 'Inquiry', style: { borderColor: '#1565C0', color: '#1565C0' } },
  { value: 'Designing', label: 'Designing', style: { borderColor: '#D97706', color: '#D97706' } },
  { value: 'Quoted', label: 'Quoted', style: { borderColor: '#D97706', color: '#D97706' } },
  { value: 'Negotiation', label: 'Negotiation', style: { borderColor: '#D97706', color: '#D97706' } },
  { value: 'Pending', label: 'Pending', style: { borderColor: '#D97706', color: '#D97706' } },
  { value: 'Confirmed', label: 'Confirmed', style: { borderColor: '#2E7D52', color: '#2E7D52' } },
  { value: 'On Tour', label: 'On Tour', style: { borderColor: '#6B21A8', color: '#6B21A8' } },
  { value: 'Completed', label: 'Completed', style: { borderColor: '#6B7F74', color: '#6B7F74' } },
  { value: 'none', label: 'No Activity', style: { borderColor: '#C0392B', color: '#C0392B' } },
];

export default function Customers() {
  const { canWrite } = usePagePermission('customers');
  const customers = useStore((s) => s.customers);
  const leads = useStore((s) => s.leads);
  const feedback = useStore((s) => s.feedback) as { custId?: string; nps?: number }[];
  const { saveFromForm } = useRegisterCustomer();
  const { deleteCustomer } = useDeleteCustomer();

  const [search, setSearch] = useState('');
  const [sourceF, setSourceF] = useState('');
  const [countryF, setCountryF] = useState('');
  const [salesF, setSalesF] = useState('');
  const [typeF, setTypeF] = useState('');
  const [stageF, setStageF] = useState('');
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<'overview' | 'pipeline'>('overview');
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = customers.filter(
      (c) =>
        customerMatchesSearch(c, search) &&
        (!sourceF || c.source === sourceF) &&
        (!countryF || c.country === countryF) &&
        (!salesF || c.salesperson === salesF) &&
        (!typeF || (c.clientType ?? 'b2c') === typeF)
    );
    if (stageF === 'none') {
      list = list.filter((c) => leads.filter((l) => l.custId === c.id && l.stage !== 'Lost').length === 0);
    } else if (stageF) {
      list = list.filter((c) => getClientPipeline(c.id, leads).stage === stageF);
    }
    return list;
  }, [customers, leads, search, sourceF, countryF, salesF, typeF, stageF]);

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(filtered, pageSize, [search, sourceF, countryF, salesF, typeF, stageF, pageSize]);
  const { paginatedItems } = pagination;

  const filtersActive = !!(search || sourceF || countryF || salesF || typeF || stageF);

  function clearFilters() {
    setSearch('');
    setSourceF('');
    setCountryF('');
    setSalesF('');
    setTypeF('');
    setStageF('');
  }

  const profileCustomer = profileId ? customers.find((c) => c.id === profileId) : null;
  const editCustomer = editId ? customers.find((c) => c.id === editId) : null;

  function openProfile(id: string, tab: 'overview' | 'pipeline' = 'overview') {
    setProfileInitialTab(tab);
    setProfileId(id);
  }

  function closeProfile() {
    setProfileId(null);
    setProfileInitialTab('overview');
  }

  function handleSave(payload: Parameters<typeof saveFromForm>[0]): boolean {
    const result = saveFromForm(payload);
    if (!result.ok) return false;
    if (result.message) toast.success(result.message);
    setFormMode(null);
    setEditId(null);
    return true;
  }

  async function handleDeleteCustomer(id: string, name: string, onSuccess?: () => void) {
    const ok = await confirmDialog(`Delete ${name}?`, {
      title: 'Delete customer',
    });
    if (!ok) return;

    setDeletingId(id);
    try {
      const result = await deleteCustomer(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      onSuccess?.();
      toast.success('Customer deleted.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="search-row">
        <input
          type="text"
          placeholder="Search name, email, phone, ID, agent…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sourceF} onChange={(e) => setSourceF(e.target.value)}>
          <option value="">All Sources</option>
          <option>Referral</option>
          <option>Website</option>
          <option>Agent</option>
          <option>Virtuoso</option>
          <option>Abercrombie</option>
          <option>Direct</option>
        </select>
        <select value={countryF} onChange={(e) => setCountryF(e.target.value)}>
          <option value="">All Countries</option>
          <option>USA</option>
          <option>Australia</option>
          <option>France</option>
          <option>UK</option>
          <option>Germany</option>
          <option>Japan</option>
        </select>
        <select value={salesF} onChange={(e) => setSalesF(e.target.value)}>
          <option value="">All Sales People</option>
          {SALES_PEOPLE.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-p btn-sm"
          type="button"
          onClick={() => setFormMode('add')}
          disabled={!canWrite}
          title={!canWrite ? 'You need write permission for Customers to add a customer' : undefined}
        >
          + Add Customer
        </button>
      </div>

      <div className="csf-bar">
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--m)', marginRight: 2 }}>Filter by type:</span>
        {TYPE_FILTERS.map((t) => (
          <button
            key={t.value || 'all-type'}
            className={`csf-btn${typeF === t.value ? ' csf-active' : ''}`}
            style={typeF !== t.value ? t.style : undefined}
            onClick={() => setTypeF(t.value)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="csf-bar">
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--m)', marginRight: 2 }}>Filter by stage:</span>
        {STAGE_FILTERS.map((s) => (
          <button
            key={s.value || 'all'}
            className={`csf-btn${stageF === s.value ? ' csf-active' : ''}`}
            style={stageF !== s.value ? s.style : undefined}
            onClick={() => setStageF(s.value)}
            type="button"
          >
            {s.label}
          </button>
        ))}
        <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--m)' }}>
          {filtered.length} client{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <EmptyState
              className="crm-empty-state--table"
              variant="clients"
              title={filtersActive ? 'No clients match your filters' : 'No clients yet'}
              description={
                filtersActive
                  ? 'Try adjusting search or filters, or clear them to see the full client list.'
                  : 'Add your first customer to start tracking inquiries and pipeline activity.'
              }
              action={
                <>
                  {filtersActive && (
                    <button type="button" className="btn btn-s btn-sm" onClick={clearFilters}>
                      Clear filters
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-p btn-sm"
                    onClick={() => setFormMode('add')}
                    disabled={!canWrite}
                    title={!canWrite ? 'You need write permission for Customers to add a customer' : undefined}
                  >
                    + Add Customer
                  </button>
                </>
              }
            />
          ) : (
            <>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name / Tên</th>
                    <th>Email</th>
                    <th>Country</th>
                    <th>Type</th>
                    <th>Source</th>
                    <th>Pipeline Status</th>
                    <th>Active Value</th>
                    <th>Leads</th>
                    <th>NPS</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((c) => {
                    const p = getClientPipeline(c.id, leads);
                    const isB2B = c.clientType === 'b2b';
                    const cfb = feedback.filter((f) => f.custId === c.id);
                    const avgNps = cfb.length ? cfb.reduce((s, f) => s + (f.nps || 0), 0) / cfb.length : null;

                    return (
                      <tr key={c.id}>
                        <td>
                          <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{c.id}</code>
                        </td>
                        <td>
                          <b>{c.name}</b>
                        </td>
                        <td style={{ color: 'var(--m)' }}>{c.email || '—'}</td>
                        <td>{c.country || '—'}</td>
                        <td>
                          <span className={`bdg ${isB2B ? '' : 'bdg-b'}`} style={isB2B ? { background: '#F3E5F5', color: '#6B21A8', fontSize: 10 } : { fontSize: 10 }}>
                            {isB2B ? 'B2B' : 'B2C'}
                          </span>
                        </td>
                        <td>
                          <span className={`bdg ${SRC_COLORS[c.source] || 'bdg-w'}`}>{c.source}</span>
                        </td>
                        <td>
                          {p.stage ? (
                            <button
                              type="button"
                              className={`bdg ${STAGE_COLORS[p.stage] || 'bdg-w'}`}
                              style={{ fontSize: 10, border: 'none', cursor: 'pointer' }}
                              onClick={() => openProfile(c.id, 'pipeline')}
                            >
                              {p.stage}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="bdg bdg-w"
                              style={{ fontSize: 10, border: 'none', cursor: 'pointer' }}
                              onClick={() => openProfile(c.id, 'pipeline')}
                            >
                              No Activity
                            </button>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--g)' }}>
                          {p.value > 0 ? `$${fmt(p.value)}` : <span style={{ color: 'var(--m)' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {p.count ? (
                            <button
                              type="button"
                              className="btn btn-s btn-sm"
                              style={{ minWidth: 28, padding: '2px 8px' }}
                              onClick={() => openProfile(c.id, 'pipeline')}
                            >
                              {p.count}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--m)' }}>0</span>
                          )}
                        </td>
                        <td>
                          {avgNps !== null ? (
                            <span className={`bdg ${npsBadgeClass(avgNps)}`}>
                              {npsIcon(avgNps)} {avgNps.toFixed(1)}
                            </span>
                          ) : (
                            <span className="bdg bdg-w">—</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-s btn-sm" type="button" style={{ marginRight: 4 }} onClick={() => openProfile(c.id)}>
                            View
                          </button>
                           <button
                            className="btn btn-s btn-sm"
                            type="button"
                            style={{ marginRight: 4 }}
                            disabled={!canWrite}
                            onClick={() => {
                              setEditId(c.id);
                              setFormMode('edit');
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={deletingId === c.id || !canWrite}
                            onClick={() => {
                              void handleDeleteCustomer(c.id, c.name);
                            }}
                          >
                            {deletingId === c.id ? '…' : '✕'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
            </>
          )}
        </div>
      </div>

      <CustomerFormModal
        open={formMode !== null}
        mode={formMode === 'edit' ? 'edit' : 'add'}
        customer={editCustomer}
        customers={customers}
        onClose={() => {
          setFormMode(null);
          setEditId(null);
        }}
        onSave={handleSave}
      />

      {profileCustomer && (
        <CustomerProfileModal
          customer={profileCustomer}
          initialTab={profileInitialTab}
          onClose={closeProfile}
          onEdit={() => {
            closeProfile();
            setEditId(profileCustomer.id);
            setFormMode('edit');
          }}
          onDelete={() => {
            void handleDeleteCustomer(profileCustomer.id, profileCustomer.name, closeProfile);
          }}
        />
      )}
    </div>
  );
}
