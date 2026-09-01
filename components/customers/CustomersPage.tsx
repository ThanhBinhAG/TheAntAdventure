'use client';

import { useState } from 'react';
import { SRC_COLORS, STAGE_COLORS, fmt } from '@/lib/constants';
import { SALES_PEOPLE } from '@/lib/customers/customer-form';
import { npsBadgeClass, npsIcon } from '@/lib/core/page-helpers';
import { usePageSize, type PageSizeOption } from '@/hooks/usePageSize';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import { usePagePermission } from '@/hooks/usePagePermission';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import CustomerProfileModal from '@/components/customers/CustomerProfileModal';
import { useRegisterCustomer } from '@/hooks/useRegisterCustomer';
import { useDeleteCustomer } from '@/hooks/useDeleteCustomer';
import { useCustomerPage } from '@/hooks/useCustomerPage';
import type { CustomerListItem } from '@/lib/customers/customer-list-input';
import type { CustomerPipelineStageFilter } from '@/lib/customers/customer-list-input';
import { toast } from '@/lib/toast';
import { confirmDialog } from '@/lib/confirm';
import { useLanguage } from '@/hooks/useLanguage';

const TYPE_FILTER_VALUES = [
  { value: '', style: undefined },
  { value: 'b2b', style: { borderColor: '#6B21A8', color: '#6B21A8' } },
  { value: 'b2c', style: { borderColor: '#1565C0', color: '#1565C0' } },
] as const;

const STAGE_FILTER_VALUES: {
  value: '' | CustomerPipelineStageFilter;
  style?: React.CSSProperties;
}[] = [
  { value: '' },
  { value: 'Inquiry', style: { borderColor: '#1565C0', color: '#1565C0' } },
  { value: 'Designing', style: { borderColor: '#D97706', color: '#D97706' } },
  { value: 'Quoted', style: { borderColor: '#D97706', color: '#D97706' } },
  { value: 'Negotiation', style: { borderColor: '#D97706', color: '#D97706' } },
  { value: 'Pending', style: { borderColor: '#D97706', color: '#D97706' } },
  { value: 'Confirmed', style: { borderColor: '#2E7D52', color: '#2E7D52' } },
  { value: 'On Tour', style: { borderColor: '#6B21A8', color: '#6B21A8' } },
  { value: 'Completed', style: { borderColor: '#6B7F74', color: '#6B7F74' } },
  { value: 'none', style: { borderColor: '#C0392B', color: '#C0392B' } },
];

export default function Customers() {
  const { tp, tpl, tc, tStage } = useLanguage();
  const { canWrite } = usePagePermission('customers');
  const { saveFromForm } = useRegisterCustomer();
  const { deleteCustomer } = useDeleteCustomer();

  const [search, setSearch] = useState('');
  const [sourceF, setSourceF] = useState('');
  const [countryF, setCountryF] = useState('');
  const [salesF, setSalesF] = useState('');
  const [typeF, setTypeF] = useState('');
  const [stageF, setStageF] = useState<'' | CustomerPipelineStageFilter>('');
  const [page, setPage] = useState(1);
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<'overview' | 'pipeline'>('overview');
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { pageSize, setPageSize } = usePageSize();
  const pageSizeOption = pageSize as PageSizeOption;

  function goToFirstPage() {
    setPage(1);
  }

  const {
    items,
    totalCount,
    totalPages,
    error,
    isLoading,
    retry,
    refresh,
  } = useCustomerPage({
    page,
    pageSize: pageSizeOption,
    q: search.trim() || undefined,
    source: sourceF || undefined,
    country: countryF || undefined,
    salesperson: salesF || undefined,
    clientType: typeF === 'b2b' || typeF === 'b2c' ? typeF : undefined,
    stage: stageF || undefined,
  });

  const filtersActive = !!(search || sourceF || countryF || salesF || typeF || stageF);

  function clearFilters() {
    setSearch('');
    setSourceF('');
    setCountryF('');
    setSalesF('');
    setTypeF('');
    setStageF('');
    goToFirstPage();
  }

  function changePageSize(size: number) {
    setPageSize(size);
    goToFirstPage();
  }

  const profileCustomer =
    (profileId && items.find((c) => c.id === profileId)) || null;
  const editCustomer =
    (editId && items.find((c) => c.id === editId)) || null;

  function openProfile(id: string, tab: 'overview' | 'pipeline' = 'overview') {
    setProfileInitialTab(tab);
    setProfileId(id);
  }

  function closeProfile() {
    setProfileId(null);
    setProfileInitialTab('overview');
  }

  async function handleSave(
    payload: Parameters<typeof saveFromForm>[0],
  ): Promise<Awaited<ReturnType<typeof saveFromForm>> | false> {
    try {
      const result = await saveFromForm(payload);
      if (!result.ok) {
        // CustomerFormModal surfaces duplicate_email / save_failed on the form.
        return result;
      }
      if (result.message) toast.success(result.message);
      setFormMode(null);
      setEditId(null);
      refresh();
      return result;
    } catch (err) {
      return {
        ok: false as const,
        error: 'save_failed' as const,
        message: err instanceof Error ? err.message : tp('customers', 'toastSaveFailed'),
      };
    }
  }

  async function handleDeleteCustomer(id: string, name: string, onSuccess?: () => void) {
    const ok = await confirmDialog(tpl('customers', 'deleteCustomerConfirm', { name }), {
      title: tp('customers', 'deleteCustomerTitle'),
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
      toast.success(tp('customers', 'toastCustomerDeleted'));
      refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const rangeStart =
    totalCount === 0 ? 0 : (page - 1) * pageSizeOption + 1;
  const rangeEnd = Math.min(page * pageSizeOption, totalCount);

  return (
    <div>
      <div className="search-row">
        <input
          type="text"
          placeholder={tp('customers', 'searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            goToFirstPage();
          }}
        />
        <select
          value={sourceF}
          onChange={(e) => {
            setSourceF(e.target.value);
            goToFirstPage();
          }}
        >
          <option value="">{tp('customers', 'filterAllSources')}</option>
          <option>Referral</option>
          <option>Website</option>
          <option>Agent</option>
          <option>Virtuoso</option>
          <option>Abercrombie</option>
          <option>Direct</option>
        </select>
        <select
          value={countryF}
          onChange={(e) => {
            setCountryF(e.target.value);
            goToFirstPage();
          }}
        >
          <option value="">{tp('customers', 'filterAllCountries')}</option>
          <option>USA</option>
          <option>Australia</option>
          <option>France</option>
          <option>UK</option>
          <option>Germany</option>
          <option>Japan</option>
        </select>
        <select
          value={salesF}
          onChange={(e) => {
            setSalesF(e.target.value);
            goToFirstPage();
          }}
        >
          <option value="">{tp('customers', 'filterAllSalesPeople')}</option>
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
          title={!canWrite ? tp('customers', 'addCustomerDisabledTitle') : undefined}
        >
          {tp('customers', 'addCustomer')}
        </button>
      </div>

      <div className="csf-bar">
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--m)', marginRight: 2 }}>{tp('customers', 'filterByType')}</span>
        {TYPE_FILTER_VALUES.map((t) => (
          <button
            key={t.value || 'all-type'}
            className={`csf-btn${typeF === t.value ? ' csf-active' : ''}`}
            style={typeF !== t.value ? t.style : undefined}
            onClick={() => {
              setTypeF(t.value);
              goToFirstPage();
            }}
            type="button"
          >
            {t.value === '' ? tp('customers', 'filterAllTypes') : t.value.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="csf-bar">
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--m)', marginRight: 2 }}>{tp('customers', 'filterByStage')}</span>
        {STAGE_FILTER_VALUES.map((s) => (
          <button
            key={s.value || 'all'}
            className={`csf-btn${stageF === s.value ? ' csf-active' : ''}`}
            style={stageF !== s.value ? s.style : undefined}
            onClick={() => {
              setStageF(s.value);
              goToFirstPage();
            }}
            type="button"
          >
            {s.value === ''
              ? tp('customers', 'filterAllClients')
              : s.value === 'none'
                ? tp('customers', 'filterNoActivity')
                : tStage(s.value)}
          </button>
        ))}
        <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--m)' }}>
          {isLoading
            ? '…'
            : tpl('customers', totalCount === 1 ? 'clientCount' : 'clientsCount', { count: totalCount })}
        </span>
        {error && (
          <button type="button" className="btn btn-s btn-sm" style={{ marginLeft: 8 }} onClick={retry}>
            {tc('retry')}
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {error && !isLoading && items.length === 0 ? (
            <EmptyState
              className="crm-empty-state--table"
              variant="clients"
              title={tp('customers', 'emptyLoadErrorTitle')}
              description={error}
              action={
                <button type="button" className="btn btn-p btn-sm" onClick={retry}>
                  {tc('retry')}
                </button>
              }
            />
          ) : !isLoading && totalCount === 0 ? (
            <EmptyState
              className="crm-empty-state--table"
              variant="clients"
              title={filtersActive ? tp('customers', 'emptyNoMatchTitle') : tp('customers', 'emptyNoClientsTitle')}
              description={
                filtersActive
                  ? tp('customers', 'emptyNoMatchDesc')
                  : tp('customers', 'emptyNoClientsDesc')
              }
              action={
                <>
                  {filtersActive && (
                    <button type="button" className="btn btn-s btn-sm" onClick={clearFilters}>
                      {tc('clearFilters')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-p btn-sm"
                    onClick={() => setFormMode('add')}
                    disabled={!canWrite}
                    title={!canWrite ? tp('customers', 'addCustomerDisabledTitle') : undefined}
                  >
                    {tp('customers', 'addCustomer')}
                  </button>
                </>
              }
            />
          ) : (
            <>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{tp('customers', 'colId')}</th>
                    <th>{tp('customers', 'colName')}</th>
                    <th>{tp('customers', 'colEmail')}</th>
                    <th>{tp('customers', 'colCountry')}</th>
                    <th>{tp('customers', 'colType')}</th>
                    <th>{tp('customers', 'colSource')}</th>
                    <th>{tp('customers', 'colPipelineStatus')}</th>
                    <th>{tp('customers', 'colActiveValue')}</th>
                    <th>{tp('customers', 'colLeads')}</th>
                    <th>{tp('customers', 'colNps')}</th>
                    <th>{tp('customers', 'colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(isLoading && items.length === 0
                    ? []
                    : items
                  ).map((c: CustomerListItem) => {
                    const isB2B = c.clientType === 'b2b';
                    const avgNps = c.avgNps;

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
                          {c.pipelineStage ? (
                            <button
                              type="button"
                              className={`bdg ${STAGE_COLORS[c.pipelineStage] || 'bdg-w'}`}
                              style={{ fontSize: 10, border: 'none', cursor: 'pointer' }}
                              onClick={() => openProfile(c.id, 'pipeline')}
                            >
                              {tStage(c.pipelineStage)}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="bdg bdg-w"
                              style={{ fontSize: 10, border: 'none', cursor: 'pointer' }}
                              onClick={() => openProfile(c.id, 'pipeline')}
                            >
                              {tp('customers', 'noActivity')}
                            </button>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--g)' }}>
                          {c.pipelineValue > 0 ? `$${fmt(c.pipelineValue)}` : <span style={{ color: 'var(--m)' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {c.pipelineLeadCount ? (
                            <button
                              type="button"
                              className="btn btn-s btn-sm"
                              style={{ minWidth: 28, padding: '2px 8px' }}
                              onClick={() => openProfile(c.id, 'pipeline')}
                            >
                              {c.pipelineLeadCount}
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
                            {tc('view')}
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
                            {tc('edit')}
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
              {isLoading && items.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--m)', fontSize: 13 }}>
                  {tp('customers', 'loadingClients')}
                </div>
              )}
              <PaginationBar
                page={page}
                setPage={setPage}
                totalPages={Math.max(totalPages, 1)}
                total={totalCount}
                pageSize={pageSizeOption}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onPageSizeChange={changePageSize}
              />
            </>
          )}
        </div>
      </div>

      <CustomerFormModal
        open={formMode !== null}
        mode={formMode === 'edit' ? 'edit' : 'add'}
        customer={editCustomer}
        customers={[]}
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
