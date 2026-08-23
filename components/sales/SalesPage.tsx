'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { STAGE_COLORS, STAGE_PROB_V22, fmt, KANBAN_STAGES } from '@/lib/constants';
import { getCustomerName } from '@/lib/core/crm-utils';
import { ensureBookingForConfirmedLead } from '@/lib/sales/booking-from-lead';
import { patchOutlineApproved } from '@/lib/tour-design/tour-design-lead';
import { applyOutlineWorkflowPatch } from '@/lib/tour-design/tour-outline-workflow';
import { getTourDraftForLead } from '@/lib/tour-design/tour-design-leads';
import {
  PIPELINE_CARDS_LIMIT,
  filterLeadsByTime,
  getLeadWeightedValue,
  getUniqueTravelMonths,
  groupLeadsByTravelMonth,
  hasActiveFilters,
  leadMatchesCustomerName,
  leadMatchesSearch,
  sortLeads,
  type ListSortField,
  type ListSortState,
  type SalesTimeFilterMode,
  type SalesTimeFilterState,
} from '@/lib/sales/sales-lead-utils';
import { localTodayIso } from '@/lib/core/date-utils';
import { useStore } from '@/hooks/useStore';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import { useRegisterCustomer } from '@/hooks/useRegisterCustomer';
import type { SalesKey } from '@/lib/i18n/pages/sales';
import type { Lead } from '@/lib/types';
import { toast } from '@/lib/toast';
import { usePagePermission } from '@/hooks/usePagePermission';
import { STAGE_SELECT_OPTIONS, SalesPolicyView, PipeCard, ListFollowUpCell, SortableTh } from '@/components/sales/SalesWidgets';

const LOST_REASONS = ['Price too high', 'Chose competitor', 'Dates unavailable', 'No response', 'Changed plans', 'Other'];

const TIME_FILTER_MODES: SalesTimeFilterMode[] = [
  'all',
  'followUpToday',
  'followUpWeek',
  'overdue',
  'travelMonth',
  'followUpRange',
];

const TIME_FILTER_LABELS: Record<SalesTimeFilterMode, SalesKey> = {
  all: 'filterAll',
  followUpToday: 'filterFollowUpToday',
  followUpWeek: 'filterFollowUpWeek',
  overdue: 'filterOverdue',
  travelMonth: 'filterByTravelMonth',
  followUpRange: 'filterFollowUpRange',
};

type SalesTab = 'pipeline' | 'list' | 'policy';

function timeFilterLabel(mode: SalesTimeFilterMode, tsf: (key: SalesKey) => string): string {
  return tsf(TIME_FILTER_LABELS[mode]);
}


export default function SalesPage() {
  const { tc, tStage, tsf, tLostReason } = useLanguage();
  const searchParams = useSearchParams();
  const urlCustId = searchParams.get('custId');
  const urlLeadId = searchParams.get('leadId');
  const urlTab = searchParams.get('tab');
  const leads = useStore((s) => s.leads);
  const customers = useStore((s) => s.customers);
  const tourDrafts = useStore((s) => s.tourDrafts);
  const updateLead = useStore((s) => s.updateLead);
  const addBooking = useStore((s) => s.addBooking);
  const bookings = useStore((s) => s.bookings);
  const upsertTourDraft = useStore((s) => s.upsertTourDraft);
  const addComm = useStore((s) => s.addComm);
  const { canWrite } = usePagePermission('sales');
  const { saveFromForm } = useRegisterCustomer();
  const [tab, setTab] = useState<SalesTab>(() =>
    urlLeadId ? 'list' : urlTab === 'list' || urlTab === 'pipeline' ? urlTab : 'pipeline'
  );
  const [lostModal, setLostModal] = useState<{ leadId: string; reason: string; note: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [createdClient, setCreatedClient] = useState<{
    leadId: string;
    custId: string;
    name: string;
    message: string;
  } | null>(null);

  const [today] = useState(localTodayIso);
  const [search, setSearch] = useState('');
  const [custIdFilter, setCustIdFilter] = useState(() => urlCustId ?? '');
  const [highlightLeadId, setHighlightLeadId] = useState(() => urlLeadId ?? '');
  const [timeFilter, setTimeFilter] = useState<SalesTimeFilterState>({ mode: 'all' });
  const [stageFilter, setStageFilter] = useState('');
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [listSort, setListSort] = useState<ListSortState>({ field: 'followUp', direction: 'asc' });
  const [groupByMonth, setGroupByMonth] = useState(false);

  const highlightedLead = useMemo(
    () => leads.find((lead) => lead.id === highlightLeadId),
    [leads, highlightLeadId]
  );
  const effectiveCustIdFilter = custIdFilter || highlightedLead?.custId || '';
  const effectiveExpandedStages = useMemo(() => {
    const stages = new Set(expandedStages);
    if (highlightedLead) stages.add(highlightedLead.stage);
    return stages;
  }, [expandedStages, highlightedLead]);

  const travelMonths = useMemo(() => getUniqueTravelMonths(leads), [leads]);

  const filteredLeads = useMemo(() => {
    let list = leads.filter((l) => l.stage !== 'Lost');
    list = filterLeadsByTime(list, timeFilter, today);
    if (stageFilter) list = list.filter((l) => l.stage === stageFilter);
    if (effectiveCustIdFilter) list = list.filter((l) => l.custId === effectiveCustIdFilter);
    if (search.trim()) {
      const matchesSearch =
        tab === 'pipeline'
          ? (l: Lead) => leadMatchesCustomerName(l, search, customers)
          : (l: Lead) => leadMatchesSearch(l, search, customers);
      list = list.filter(matchesSearch);
    }

    if (highlightLeadId) {
      const highlighted = leads.find((l) => l.id === highlightLeadId);
      if (highlighted && !list.some((l) => l.id === highlightLeadId)) {
        list = [highlighted, ...list];
      }
    }

    return list;
  }, [leads, timeFilter, stageFilter, effectiveCustIdFilter, search, customers, today, highlightLeadId, tab]);

  const activeLeads = filteredLeads.filter((l) => l.stage !== 'Lost' && l.stage !== 'Completed');
  const totalPipelineVal = activeLeads.reduce((s, l) => s + (l.value || 0), 0);
  const weightedForecast = activeLeads.reduce((s, l) => s + getLeadWeightedValue(l), 0);
  const confirmedVal = filteredLeads.filter((l) => l.stage === 'Confirmed').reduce((s, l) => s + (l.value || 0), 0);

  const listLeads = useMemo(() => sortLeads(filteredLeads, listSort, customers), [filteredLeads, listSort, customers]);

  const { pageSize, setPageSize } = usePageSize();
  const listPagination = usePagination(listLeads, pageSize, [
    search,
    timeFilter,
    stageFilter,
    custIdFilter,
    listSort,
    groupByMonth,
    pageSize,
  ]);
  const { paginatedItems: pageLeads } = listPagination;

  const filtersActive = hasActiveFilters(search, timeFilter, stageFilter) || !!effectiveCustIdFilter;

  function clearFilters() {
    setSearch('');
    setTimeFilter({ mode: 'all' });
    setStageFilter('');
    setCustIdFilter('');
    setHighlightLeadId('');
  }

  function handleSortClick(field: ListSortField) {
    setListSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: field === 'followUp' || field === 'customer' || field === 'travelDate' ? 'asc' : 'desc' }
    );
  }

  function toggleStageExpanded(stage: string) {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  }

  function moveStage(leadId: string, newStage: string) {
    if (!canWrite) {
      toast.error('You do not have permission to edit sales.');
      return;
    }
    if (newStage === 'Lost') {
      const lead = leads.find((l) => l.id === leadId);
      setLostModal({
        leadId,
        reason: (lead?.lostReason as string) || '',
        note: (lead?.lostNote as string) || '',
      });
    } else {
      updateLead(leadId, { stage: newStage, probability: STAGE_PROB_V22[newStage] ?? 10 });
      if (newStage === 'Confirmed') {
        const lead = leads.find((l) => l.id === leadId);
        if (lead) {
          const booking = ensureBookingForConfirmedLead(
            { ...lead, stage: 'Confirmed', probability: STAGE_PROB_V22.Confirmed },
            bookings
          );
          if (booking) addBooking(booking);
        }
      }
    }
  }

  function handleApproveOutline(lead: Lead) {
    const draft = getTourDraftForLead(lead.id, tourDrafts);
    if (!draft || draft.outlineStatus !== 'sent') return;
    const name = getCustomerName(customers, lead.custId);
    const patch = patchOutlineApproved(draft, lead.custId, name, lead.owner);
    applyOutlineWorkflowPatch(lead.id, draft, patch, { upsertTourDraft, updateLead, addComm });
  }

  function saveLostReason() {
    if (!lostModal) return;
    updateLead(lostModal.leadId, {
      stage: 'Lost',
      probability: 0,
      lostReason: lostModal.reason,
      lostNote: lostModal.note,
      lostAt: today,
    });
    setLostModal(null);
  }

  function renderLeadRow(l: Lead) {
    const weighted = Math.round(getLeadWeightedValue(l));
    const lostReason = (l.lostReason as string) || '';
    return (
      <tr
        key={l.id}
        data-lead-id={l.id}
        className={l.id === highlightLeadId ? 'sales-lead-highlight' : undefined}
      >
        <td>
          <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{l.id}</code>
        </td>
        <td>
          <b>{getCustomerName(customers, l.custId)}</b>
        </td>
        <td style={{ fontSize: 12, maxWidth: 200 }}>{l.tour}</td>
        <td>{l.pax || '—'}</td>
        <td style={{ fontWeight: 600, color: 'var(--g)' }}>{l.value > 0 ? `$${fmt(l.value)}` : '—'}</td>
        <td style={{ fontWeight: 700, color: 'var(--pur)' }}>{weighted > 0 ? `$${fmt(weighted)}` : '—'}</td>
        <td style={{ fontSize: 12, color: 'var(--m)' }}>{l.month || '—'}</td>
        <ListFollowUpCell lead={l} today={today} onUpdate={updateLead} />
        <td>
          <select
            className="pipe-stage-select"
            value={l.stage}
            onChange={(e) => moveStage(l.id, e.target.value)}
            aria-label={tc('stage')}
          >
            {STAGE_SELECT_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {tStage(st)}
              </option>
            ))}
          </select>
        </td>
        <td style={{ fontSize: 12 }}>{l.owner || 'Tai Pham'}</td>
        <td style={{ fontSize: 11.5, color: 'var(--m)' }}>{lostReason ? tLostReason(lostReason) : '—'}</td>
      </tr>
    );
  }

  const searchActive = search.trim().length > 0;

  const salesToolbar = (tab === 'pipeline' || tab === 'list') && (
    <div className="sales-filter-row">
      {tab === 'list' && (
        <div className="search-row" style={{ marginBottom: 0 }}>
          <input
            type="search"
            placeholder={tsf('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}
      <div className="sales-filter-chips" role="group" aria-label={tsf('filterAll')}>
        {TIME_FILTER_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className={`sales-filter-chip${timeFilter.mode === mode ? ' on' : ''}`}
            onClick={() => setTimeFilter((prev) => ({ ...prev, mode, travelMonth: mode === 'travelMonth' ? prev.travelMonth : undefined }))}
          >
            {timeFilterLabel(mode, tsf)}
          </button>
        ))}
      </div>
      {timeFilter.mode === 'travelMonth' && (
        <select
          className="sales-travel-month-select"
          value={timeFilter.travelMonth || ''}
          onChange={(e) => setTimeFilter((prev) => ({ ...prev, travelMonth: e.target.value }))}
        >
          <option value="">{tsf('filterByTravelMonth')}</option>
          {travelMonths.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      )}
      {timeFilter.mode === 'followUpRange' && (
        <div className="sales-date-range">
          <label>
            {tsf('followUpFrom')}
            <input
              type="date"
              value={timeFilter.followUpFrom || ''}
              onChange={(e) => setTimeFilter((prev) => ({ ...prev, followUpFrom: e.target.value }))}
            />
          </label>
          <label>
            {tsf('followUpTo')}
            <input
              type="date"
              value={timeFilter.followUpTo || ''}
              onChange={(e) => setTimeFilter((prev) => ({ ...prev, followUpTo: e.target.value }))}
            />
          </label>
        </div>
      )}
      <select className="sales-stage-select" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
        <option value="">{tsf('filterStage')}</option>
        {KANBAN_STAGES.map((st) => (
          <option key={st} value={st}>
            {tStage(st)}
          </option>
        ))}
      </select>
      {filtersActive && (
        <button type="button" className="btn btn-s btn-sm" onClick={clearFilters}>
          {tsf('clearFilters')}
        </button>
      )}
      <span className="sales-result-count">
        {filteredLeads.length} {tsf('leadCount')}
      </span>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {(
            [
              ['pipeline', tc('pipelineView')],
              ['list', tc('listView')],
              ['policy', `📋 ${tc('tourPolicy')}`],
            ] as const
          ).map(([id, label]) => (
            <div key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} role="button" tabIndex={0}>
              {label}
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-p btn-sm"
          type="button"
          onClick={() => setFormOpen(true)}
          disabled={!canWrite}
          title={!canWrite ? 'You need write permission for Sales to register a lead' : undefined}
        >
          + Register Lead
        </button>
      </div>

      {salesToolbar}

      {tab === 'pipeline' && (
        <>
          <div className="pipeline-forecast-bar">
            <div style={{ textAlign: 'center', minWidth: 90 }}>
              <div className="pipeline-forecast-val" style={{ color: 'var(--g)' }}>
                ${fmt(Math.round(confirmedVal))}
              </div>
              <div className="pipeline-forecast-lbl">{tc('confirmed')}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 110 }}>
              <div className="pipeline-forecast-val" style={{ color: 'var(--pur)' }}>
                ${fmt(Math.round(weightedForecast))}
              </div>
              <div className="pipeline-forecast-lbl">{tc('weightedForecast')}</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div className="pipeline-forecast-val" style={{ color: 'var(--m)' }}>
                ${fmt(Math.round(totalPipelineVal))}
              </div>
              <div className="pipeline-forecast-lbl">{tc('totalPipeline')}</div>
            </div>
            <div className="pipeline-forecast-search">
              <input
                type="search"
                placeholder={tsf('pipelineSearchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={tsf('pipelineSearchPlaceholder')}
              />
            </div>
            <span style={{ fontSize: 11, color: 'var(--m)' }}>{tsf('weightedFormula')}</span>
          </div>

          {filteredLeads.length === 0 ? (
            <EmptyState
              className="sales-empty-state"
              variant="leads"
              title={filtersActive ? tsf('noResults') : tsf('noLeadsYet')}
              description={filtersActive ? tsf('noResultsHint') : tsf('noLeadsYetHint')}
              action={
                <>
                  {filtersActive && (
                    <button type="button" className="btn btn-s btn-sm" onClick={clearFilters}>
                      {tsf('clearFilters')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-p btn-sm"
                    disabled={!canWrite}
                    onClick={() => setFormOpen(true)}
                  >
                    {tc('newClientBtn')}
                  </button>
                </>
              }
            />
          ) : (
            <div className="pipeline">
              {KANBAN_STAGES.map((stage) => {
                const stageLeads = filteredLeads.filter((l) => l.stage === stage);
                const stageVal = stageLeads.reduce((acc, l) => acc + (l.value || 0), 0);
                const expanded = effectiveExpandedStages.has(stage);
                const showAllInStage = searchActive || expanded;
                const visibleLeads = showAllInStage ? stageLeads : stageLeads.slice(0, PIPELINE_CARDS_LIMIT);
                const hiddenCount = showAllInStage ? 0 : stageLeads.length - visibleLeads.length;
                return (
                  <div className="pipe-col" key={stage}>
                    <div className="pipe-hd">
                      <span>{tStage(stage)}</span>
                      <span className={`bdg ${STAGE_COLORS[stage] || 'bdg-w'}`}>{stageLeads.length}</span>
                      {stageVal > 0 && <span className="pipe-col-val">${fmt(Math.round(stageVal))}</span>}
                    </div>
                    {visibleLeads.map((l) => (
                      <PipeCard
                        key={l.id}
                        lead={l}
                        stage={stage}
                        name={getCustomerName(customers, l.custId)}
                        today={today}
                        tourDrafts={tourDrafts}
                        onStageChange={moveStage}
                        onUpdate={updateLead}
                        onApproveOutline={handleApproveOutline}
                      />
                    ))}
                    {hiddenCount > 0 && (
                      <button type="button" className="sales-show-more-btn" onClick={() => toggleStageExpanded(stage)}>
                        +{hiddenCount} {tsf('showMore')}
                      </button>
                    )}
                    {!searchActive && expanded && stageLeads.length > PIPELINE_CARDS_LIMIT && (
                      <button type="button" className="sales-show-more-btn" onClick={() => toggleStageExpanded(stage)}>
                        {tsf('showLess')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'list' && (
        <div className="card">
          <div className="sales-list-toolbar">
            <label>
              <input type="checkbox" checked={groupByMonth} onChange={(e) => setGroupByMonth(e.target.checked)} />
              {tsf('groupByTravelMonth')}
            </label>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {listLeads.length === 0 ? (
              <EmptyState
                className="sales-empty-state crm-empty-state--table"
                variant="leads"
                title={filtersActive ? tsf('noResults') : tsf('noLeadsYet')}
                description={filtersActive ? tsf('noResultsHint') : tsf('noLeadsYetHint')}
                action={
                  <>
                    {filtersActive && (
                      <button type="button" className="btn btn-s btn-sm" onClick={clearFilters}>
                        {tsf('clearFilters')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-p btn-sm"
                      disabled={!canWrite}
                      onClick={() => setFormOpen(true)}
                    >
                      {tc('newClientBtn')}
                    </button>
                  </>
                }
              />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{tsf('leadId')}</th>
                    <SortableTh field="customer" label={tsf('customer')} listSort={listSort} onSort={handleSortClick} />
                    <th>{tc('tour')}</th>
                    <th>{tc('pax')}</th>
                    <SortableTh field="value" label={tc('value')} listSort={listSort} onSort={handleSortClick} />
                    <SortableTh field="weighted" label={tc('weighted')} listSort={listSort} onSort={handleSortClick} style={{ color: 'var(--pur)' }} />
                    <SortableTh field="travelDate" label={tsf('travelDate')} listSort={listSort} onSort={handleSortClick} />
                    <SortableTh field="followUp" label={tsf('followUp')} listSort={listSort} onSort={handleSortClick} />
                    <SortableTh field="stage" label={tc('stage')} listSort={listSort} onSort={handleSortClick} />
                    <th>{tc('owner')}</th>
                    <th>{tc('lostReason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {groupByMonth
                    ? groupLeadsByTravelMonth(pageLeads).flatMap((group) => [
                        <tr key={`group-${group.label}`} className="sales-group-row">
                          <td colSpan={11}>
                            {group.label === 'TBD' ? tsf('travelMonthUndetermined') : group.label} ({group.leads.length})
                          </td>
                        </tr>,
                        ...group.leads.map((l) => renderLeadRow(l)),
                      ])
                    : pageLeads.map((l) => renderLeadRow(l))}
                </tbody>
              </table>
            )}
            <PaginationBar {...listPagination} onPageSizeChange={setPageSize} />
          </div>
        </div>
      )}

      {tab === 'policy' && <SalesPolicyView />}

      {lostModal && (
        <div className="overlay open" onClick={() => setLostModal(null)}>
          <div className="modal lost-reason-modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd modal-hd-green">
              <div style={{ color: '#fff', fontWeight: 700 }}>{tc('markLost')}</div>
              <button type="button" className="modal-close-btn" onClick={() => setLostModal(null)}>
                ✕
              </button>
            </div>
            <div style={{ padding: 22 }}>
              <div className="fg">
                <label className="lbl">{tc('lostReason')}</label>
                <select value={lostModal.reason} onChange={(e) => setLostModal({ ...lostModal, reason: e.target.value })}>
                  <option value="">{tsf('selectReason')}</option>
                  {LOST_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {tLostReason(r)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">{tc('additionalNotes')}</label>
                <textarea value={lostModal.note} onChange={(e) => setLostModal({ ...lostModal, note: e.target.value })} placeholder={tsf('optionalContext')} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-s" type="button" onClick={() => setLostModal(null)}>
                  {tc('cancel')}
                </button>
                <button className="btn btn-p" type="button" onClick={saveLostReason} disabled={!lostModal.reason}>
                  {tc('confirmLost')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CustomerFormModal
        open={formOpen}
        mode="add"
        customers={customers}
        onClose={() => setFormOpen(false)}
        onSave={async (payload) => {
          try {
            const result = await saveFromForm({ ...payload, flagTourDesign: true });
            if (!result.ok) return result;
            setFormOpen(false);
            if (result.leadId) {
              setCreatedClient({
                leadId: result.leadId,
                custId: result.customer.id,
                name: result.customer.name,
                message: result.message || `Customer ${result.customer.id} created.`,
              });
            } else if (result.message) {
              toast.info(result.message);
            }
            return result;
          } catch (err) {
            return {
              ok: false as const,
              error: 'save_failed' as const,
              message: err instanceof Error ? err.message : 'Không thể tạo khách hàng.',
            };
          }
        }}
      />

      {createdClient && (
        <div className="overlay open" onClick={() => setCreatedClient(null)}>
          <div className="modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd modal-hd-green">
              <div style={{ color: '#fff', fontWeight: 700 }}>{tc('newClientBtn')}</div>
              <button type="button" className="modal-close-btn" onClick={() => setCreatedClient(null)}>
                ✕
              </button>
            </div>
            <div style={{ padding: 22 }}>
              <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>{createdClient.message}</p>
              <p style={{ fontSize: 13, marginBottom: 16 }}>
                Continue in <strong>Tour Design</strong> to complete the client brief for{' '}
                <strong>{createdClient.name}</strong>.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-s" type="button" onClick={() => setCreatedClient(null)}>
                  {tc('cancel')}
                </button>
                <Link
                  href={`/tourdesign?leadId=${encodeURIComponent(createdClient.leadId)}&custId=${encodeURIComponent(createdClient.custId)}`}
                  className="btn btn-p"
                  onClick={() => setCreatedClient(null)}
                >
                  Tour Design →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
