'use client';

import { useEffect, useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import {
  isActivePipelineLead,
  isEarnedCommissionStage,
  summarizeAgentCommissions,
} from '@/lib/sales/agents-commission';
import { TIER_BG, TIER_COLORS } from '@/lib/core/page-helpers';
import { useStore } from '@/hooks/useStore';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize, type PageSizeOption } from '@/hooks/usePageSize';
import { useAgentPage } from '@/hooks/useAgentPage';
import { useRegisterAgent } from '@/hooks/useRegisterAgent';
import { useDeleteAgent } from '@/hooks/useDeleteAgent';
import { useEnsureAgentsCatalogLoaded } from '@/hooks/useEnsureAgentsCatalogLoaded';
import { PROTECTED_AGENT_ID } from '@/lib/agents/agent-ids';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import type { Agent } from '@/lib/types';
import AgentFormModal from '@/components/agents/AgentFormModal';
import { toast } from '@/lib/toast';

import { confirmDialog } from '@/lib/confirm';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useLanguage } from '@/hooks/useLanguage';

export default function Agents() {
  const { tp, tpl, tc, tStage } = useLanguage();
  const { canWrite } = usePagePermission('agents');
  const storeAgents = useStore((s) => s.agents);
  const leads = useStore((s) => s.leads);
  const { saveFromAgent } = useRegisterAgent();
  const { deleteAgent } = useDeleteAgent();
  const { applyCatalogItems, ensureCatalog, reloadCatalog } =
    useEnsureAgentsCatalogLoaded();

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const { pageSize, setPageSize } = usePageSize();
  const pageSizeOption = pageSize as PageSizeOption;

  function goToFirstPage() {
    setPage(1);
  }

  const {
    items: agentsPage,
    totalCount,
    totalPages,
    error: listError,
    isLoading,
    retry,
    refresh,
  } = useAgentPage({
    page,
    pageSize: pageSizeOption,
    q: search.trim() || undefined,
  });

  // Prefer one list GET: when the page already holds the full unfiltered set, seed the
  // commission catalog from it. Only hit pageSize=96 when the list is a partial page.
  useEffect(() => {
    if (isLoading || listError) return;
    const unfilteredFullSet =
      !search.trim() && agentsPage.length === totalCount;
    if (unfilteredFullSet) {
      void applyCatalogItems(agentsPage);
      return;
    }
    void ensureCatalog();
  }, [
    isLoading,
    listError,
    search,
    agentsPage,
    totalCount,
    applyCatalogItems,
    ensureCatalog,
  ]);

  const totalAgents = storeAgents.filter((a) => a.id !== PROTECTED_AGENT_ID).length;
  const activeAgents = storeAgents.filter(
    (a) => a.id !== PROTECTED_AGENT_ID && a.status === 'Active',
  ).length;
  const summaryRows = useMemo(
    () => summarizeAgentCommissions(storeAgents, leads),
    [storeAgents, leads]
  );

  const summaryPagination = usePagination(summaryRows.rows, pageSize, [search, view, pageSize]);
  const { paginatedItems: summaryPage } = summaryPagination;

  const totalEarnedComm = summaryRows.grandComm;
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSizeOption + 1;
  const rangeEnd = Math.min(page * pageSizeOption, totalCount);

  const profile =
    (profileId && agentsPage.find((a) => a.id === profileId)) ||
    (profileId ? storeAgents.find((a) => a.id === profileId) : null) ||
    null;
  const editAgent =
    (editId && agentsPage.find((a) => a.id === editId)) ||
    (editId ? storeAgents.find((a) => a.id === editId) : null) ||
    null;

  async function handleDelete(id: string) {
    if (id === PROTECTED_AGENT_ID) return;
    const ok = await confirmDialog(tp('agents', 'deleteAgentConfirm'), { title: tp('agents', 'deleteAgentTitle') });
    if (!ok) return;
    const result = await deleteAgent(id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setProfileId(null);
    toast.success(tp('agents', 'toastDeleted'));
    refresh();
    void reloadCatalog();
  }

  async function handleSave(agent: Agent) {
    const mode = formMode === 'edit' ? 'edit' : 'add';
    const result = await saveFromAgent(agent, mode);
    if (!result.ok) {
      toast.error(result.message);
      throw new Error(result.message);
    }
    if (result.message) toast.success(result.message);
    else toast.success(mode === 'edit' ? tp('agents', 'toastUpdated') : tp('agents', 'toastCreated'));
    setEditId(null);
    setFormMode(null);
    refresh();
    void reloadCatalog();
  }

  function openEdit(id: string) {
    setProfileId(null);
    setEditId(id);
    setFormMode('edit');
  }

  function changePageSize(size: number) {
    setPageSize(size);
    goToFirstPage();
  }

  const agentsListPagination = {
    page,
    setPage,
    totalPages: Math.max(totalPages, 1),
    total: totalCount,
    pageSize: pageSizeOption,
    rangeStart,
    rangeEnd,
    onPageSizeChange: changePageSize,
  };

  function renderAgentCard(a: Agent) {
    const agLeads = leads.filter((l) => l.agentId === a.id && isActivePipelineLead(l.stage));
    const pipelineValue = agLeads.reduce((s, l) => s + (l.value || 0), 0);
    const pipelineComm = Math.round(pipelineValue * (a.commissionPct / 100));
    const tierColor = TIER_COLORS[a.tier] || '#6B7F74';
    const tierBg = TIER_BG[a.tier] || '#f9f9f9';

    return (
      <div key={a.id} className="agent-card" onClick={() => setProfileId(a.id)} role="button" tabIndex={0}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--td)' }}>{a.name}</div>
            <div style={{ fontSize: 12, color: 'var(--m)' }}>
              {a.country} · {a.contactName !== '—' ? a.contactName : tp('agents', 'cardNoContact')}
            </div>
          </div>
          <span className="agent-tier-pill" style={{ background: tierBg, color: tierColor, borderColor: tierColor }}>
            {a.tier}
          </span>
        </div>
        <div className="agent-stats-grid">
          <div className="agent-stat">
            <div className="agent-stat-lbl">{tp('agents', 'cardCommission')}</div>
            <div className="agent-stat-val" style={{ color: 'var(--gold)' }}>
              {a.commissionPct}%
            </div>
          </div>
          <div className="agent-stat">
            <div className="agent-stat-lbl">{tp('agents', 'cardActiveLeads')}</div>
            <div className="agent-stat-val" style={{ color: 'var(--g)' }}>
              {agLeads.length}
            </div>
          </div>
          <div className="agent-stat">
            <div className="agent-stat-lbl">{tp('agents', 'cardPipelineValue')}</div>
            <div className="agent-stat-val">${fmt(pipelineValue)}</div>
          </div>
          <div className="agent-stat" style={{ background: '#FDF6E3' }}>
            <div className="agent-stat-lbl">{tp('agents', 'cardEstPipelineComm')}</div>
            <div className="agent-stat-val" style={{ color: 'var(--gold)' }}>
              ${fmt(pipelineComm)}
            </div>
          </div>
        </div>
        <div className={`agent-note-preview${a.notes ? '' : ' empty'}`} title={a.notes || undefined}>
          {a.notes ? (
            <>
              <div className="agent-note-preview-lbl">{tp('agents', 'cardNote')}</div>
              <div className="agent-note-preview-text">{a.notes}</div>
            </>
          ) : (
            '—'
          )}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--m)', borderTop: '1px solid #E2E8E4', paddingTop: 8 }}>
          {a.status === 'Active' ? (
            <span style={{ color: 'var(--g)' }}>{tp('agents', 'statusActive')}</span>
          ) : (
            <span style={{ color: 'var(--red)' }}>{tp('agents', 'statusInactive')}</span>
          )}{' '}
          · {a.currency} ·{' '}
          {a.email !== '—' ? (
            <a href={`mailto:${a.email}`} style={{ color: 'var(--blue)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
              {a.email}
            </a>
          ) : (
            tp('agents', 'cardNoEmail')
          )}
        </div>
      </div>
    );
  }

  function renderProfileBody(a: Agent) {
    const pipelineLeads = leads.filter((l) => l.agentId === a.id && isActivePipelineLead(l.stage));
    const pipelineValue = pipelineLeads.reduce((s, l) => s + (l.value || 0), 0);
    const pipelineComm = Math.round(pipelineValue * (a.commissionPct / 100));
    const earnedLeads = leads.filter((l) => l.agentId === a.id && isEarnedCommissionStage(l.stage));
    const earnedGross = earnedLeads.reduce((s, l) => s + (l.value || 0), 0);
    const earnedComm = Math.round(earnedGross * (a.commissionPct / 100));
    const leadsForAgent = leads.filter((l) => l.agentId === a.id);
    const tierColor = TIER_COLORS[a.tier] || '#6B7F74';
    const tierBg = TIER_BG[a.tier] || '#f9f9f9';

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, color: 'var(--td)' }}>{a.name}</h2>
            <div style={{ fontSize: 13, color: 'var(--m)' }}>
              {a.country} · {a.id}
            </div>
          </div>
          <span style={{ background: tierBg, color: tierColor, border: `1.5px solid ${tierColor}`, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>
            {a.tier}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
          <div style={{ background: '#E8F5EE', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: 0.7 }}>{tp('agents', 'profileCommission')}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)' }}>{a.commissionPct}%</div>
          </div>
          <div style={{ background: '#E8F5EE', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: 0.7 }}>{tp('agents', 'profilePipeline')}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--g)' }}>${fmt(pipelineValue)}</div>
          </div>
          <div style={{ background: '#FDF6E3', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: 0.7 }}>{tp('agents', 'profileEstPipelineComm')}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)' }}>${fmt(pipelineComm)}</div>
          </div>
          <div style={{ background: '#F3FAF6', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: 0.7 }}>{tp('agents', 'profileEarnedComm')}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--g)' }}>${fmt(earnedComm)}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18, fontSize: 13 }}>
          <div>
            <span style={{ color: 'var(--m)' }}>{tp('agents', 'profileContactName')}</span> <b>{a.contactName !== '—' ? a.contactName : '—'}</b>
          </div>
          <div>
            <span style={{ color: 'var(--m)' }}>{tp('agents', 'profileCurrency')}</span> <b>{a.currency}</b>
          </div>
          <div>
            <span style={{ color: 'var(--m)' }}>{tp('agents', 'profileEmail')}</span>{' '}
            {a.email && a.email !== '—' ? (
              <a href={`mailto:${a.email}`} style={{ color: 'var(--blue)' }}>
                {a.email}
              </a>
            ) : (
              '—'
            )}
          </div>
          <div>
            <span style={{ color: 'var(--m)' }}>{tp('agents', 'profilePhone')}</span>{' '}
            {a.phone && a.phone !== '—' ? (
              <a href={`tel:${a.phone}`} style={{ color: 'var(--t)' }}>
                {a.phone}
              </a>
            ) : (
              '—'
            )}
          </div>
          <div>
            <span style={{ color: 'var(--m)' }}>{tp('agents', 'profileStatus')}</span>{' '}
            <b style={{ color: a.status === 'Active' ? 'var(--g)' : 'var(--red)' }}>{a.status}</b>
          </div>
        </div>
        {a.notes && (
          <div style={{ background: '#F7F8F6', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--td)', marginBottom: 18 }}>
            <b>{tp('agents', 'profileNotes')}</b> {a.notes}
          </div>
        )}
        {leadsForAgent.length ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--m)', marginBottom: 8 }}>
              {tpl('agents', 'profileAssociatedLeads', { count: leadsForAgent.length })}
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{tp('agents', 'colLeadId')}</th>
                  <th>{tp('agents', 'colTour')}</th>
                  <th>{tp('agents', 'colStage')}</th>
                  <th>{tp('agents', 'colValue')}</th>
                </tr>
              </thead>
              <tbody>
                {leadsForAgent.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{l.id}</code>
                    </td>
                    <td>{l.tour || '—'}</td>
                    <td>{tStage(l.stage)}</td>
                    <td style={{ fontWeight: 600 }}>${fmt(l.value || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ color: 'var(--m)', fontSize: 13 }}>{tp('agents', 'profileNoLeads')}</div>
        )}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--b)', display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          {a.id !== PROTECTED_AGENT_ID && (
            <>
              <button
                type="button"
                className="btn btn-s btn-sm"
                disabled={!canWrite}
                onClick={() => {
                  setProfileId(null);
                  openEdit(a.id);
                }}
              >
                {tp('agents', 'profileEdit')}
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={!canWrite}
                onClick={() => handleDelete(a.id)}
              >
                {tp('agents', 'profileDelete')}
              </button>
            </>
          )}
          <button type="button" className="btn btn-s btn-sm" onClick={() => setProfileId(null)}>
            {tc('close')}
          </button>
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="agents-header">
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{tp('agents', 'pageTitle')}</h2>
          <div style={{ fontSize: 12, color: 'var(--m)' }}>{tp('agents', 'pageSubtitle')}</div>
        </div>
        <div className="view-toggle">
          <button type="button" className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}>
            {tp('agents', 'viewGrid')}
          </button>
          <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>
            {tp('agents', 'viewList')}
          </button>
        </div>
        <input
          type="text"
          placeholder={tp('agents', 'searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            goToFirstPage();
          }}
          style={{ padding: '6px 11px', border: '1.5px solid var(--b)', borderRadius: 8, fontFamily: 'inherit', fontSize: 12, width: 170 }}
        />
        <button
          className="btn btn-p btn-sm"
          type="button"
          disabled={!canWrite}
          onClick={() => setFormMode('add')}
        >
          {tp('agents', 'addAgent')}
        </button>
      </div>

      <div className="agents-summary-pills">
        <div className="agent-pill" style={{ background: '#E8F5EE' }}>
          <div className="agent-pill-lbl">{tp('agents', 'pillTotalAgents')}</div>
          <div className="agent-pill-val" style={{ color: 'var(--g)' }}>
            {totalAgents}
          </div>
        </div>
        <div className="agent-pill" style={{ background: '#E8F5EE' }}>
          <div className="agent-pill-lbl">{tp('agents', 'pillActive')}</div>
          <div className="agent-pill-val" style={{ color: 'var(--g)' }}>
            {activeAgents}
          </div>
        </div>
        <div className="agent-pill" style={{ background: '#FDF6E3' }}>
          <div className="agent-pill-lbl">{tp('agents', 'pillEarnedCommission')}</div>
          <div className="agent-pill-val" style={{ color: 'var(--gold)' }}>
            ${fmt(Math.round(totalEarnedComm))}
          </div>
        </div>
      </div>

      {listError && !isLoading && !agentsPage.length ? (
        <EmptyState
          className="crm-empty-state--flush"
          variant="agents"
          title={tp('agents', 'emptyLoadTitle')}
          description={listError}
          action={
            <button type="button" className="btn btn-p btn-sm" onClick={retry}>
              {tc('retry')}
            </button>
          }
        />
      ) : !agentsPage.length && !isLoading ? (
        <EmptyState
          className="crm-empty-state--flush"
          variant="agents"
          title={search.trim() ? tp('agents', 'emptyNoMatchTitle') : tp('agents', 'emptyNoAgentsTitle')}
          description={
            search.trim() ? tp('agents', 'emptyNoMatchDesc') : tp('agents', 'emptyNoAgentsDesc')
          }
          action={
            <>
              {search.trim() && (
                <button
                  type="button"
                  className="btn btn-s btn-sm"
                  onClick={() => {
                    setSearch('');
                    goToFirstPage();
                  }}
                >
                  {tc('clearSearch')}
                </button>
              )}
              <button
                type="button"
                className="btn btn-p btn-sm"
                disabled={!canWrite}
                onClick={() => setFormMode('add')}
              >
                {tp('agents', 'addAgent')}
              </button>
            </>
          }
        />
      ) : view === 'grid' ? (
        <>
          <div className="agents-grid">{agentsPage.map(renderAgentCard)}</div>
          <PaginationBar {...agentsListPagination} />
        </>
      ) : (
        <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{tp('agents', 'colAgent')}</th>
                  <th>{tp('agents', 'colCountry')}</th>
                  <th>{tp('agents', 'colTier')}</th>
                  <th>{tp('agents', 'colContact')}</th>
                  <th>{tp('agents', 'colPhone')}</th>
                  <th>{tp('agents', 'colEmail')}</th>
                  <th>{tp('agents', 'colNote')}</th>
                  <th style={{ textAlign: 'right' }}>{tp('agents', 'colCommPct')}</th>
                  <th style={{ textAlign: 'right' }}>{tp('agents', 'colActiveLeads')}</th>
                  <th style={{ textAlign: 'right' }}>{tp('agents', 'colPipeline')}</th>
                  <th style={{ textAlign: 'right' }}>{tp('agents', 'colEstComm')}</th>
                  <th>{tp('agents', 'colStatus')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {agentsPage.map((a) => {
                  const agLeads = leads.filter((l) => l.agentId === a.id);
                  const pipeline = agLeads.reduce((s, l) => s + (l.value || 0), 0);
                  const comm = Math.round(pipeline * (a.commissionPct / 100));
                  const tierColor = TIER_COLORS[a.tier] || '#6B7F74';
                  const tierBg = TIER_BG[a.tier] || '#f9f9f9';
                  return (
                    <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setProfileId(a.id)}>
                      <td>
                        <b>{a.name}</b>
                        <div style={{ fontSize: 10.5, color: 'var(--m)' }}>{a.country}</div>
                      </td>
                      <td>{a.country}</td>
                      <td>
                        <span className="agent-tier-pill" style={{ background: tierBg, color: tierColor, borderColor: tierColor, fontSize: 10.5, padding: '1px 8px' }}>
                          {a.tier}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{a.contactName !== '—' ? <b>{a.contactName}</b> : '—'}</td>
                      <td style={{ fontSize: 11.5 }}>{a.phone && a.phone !== '—' ? a.phone : '—'}</td>
                      <td style={{ fontSize: 11.5 }}>{a.email && a.email !== '—' ? a.email : '—'}</td>
                      <td className="agent-note-cell" title={a.notes || undefined}>
                        {a.notes ? <span className="agent-note-cell-text">{a.notes}</span> : <span className="agent-note-cell-empty">—</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold)' }}>{a.commissionPct}%</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--g)' }}>{agLeads.length}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>${fmt(pipeline)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--gold)' }}>{comm > 0 ? `$${fmt(comm)}` : '—'}</td>
                      <td>
                        <span style={{ color: a.status === 'Active' ? 'var(--g)' : 'var(--red)' }}>
                          {a.status === 'Active' ? tp('agents', 'statusActive') : tp('agents', 'statusInactive')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }} onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-s btn-sm" type="button" onClick={() => setProfileId(a.id)}>
                            {tc('view')}
                          </button>
                          {a.id !== PROTECTED_AGENT_ID && (
                            <>
                              <button
                                className="btn btn-s btn-sm"
                                type="button"
                                disabled={!canWrite}
                                onClick={() => openEdit(a.id)}
                              >
                                {tc('edit')}
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                type="button"
                                disabled={!canWrite}
                                onClick={() => handleDelete(a.id)}
                              >
                                🗑
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar {...agentsListPagination} />
        </div>
      )}

      <div className="card">
        <div className="card-hd">
          <span className="card-title">{tp('agents', 'summaryTitle')}</span>
          <span className="bdg bdg-g">{tpl('agents', 'summaryGross', { amount: `$${fmt(summaryRows.grandGross)}` })}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{tp('agents', 'colAgent')}</th>
                <th>{tp('agents', 'colTier')}</th>
                <th>{tp('agents', 'colBookings')}</th>
                <th style={{ textAlign: 'right' }}>{tp('agents', 'colGrossRevenue')}</th>
                <th style={{ textAlign: 'right' }}>{tp('agents', 'colCommissionPct')}</th>
                <th style={{ textAlign: 'right' }}>{tp('agents', 'colCommissionOwed')}</th>
                <th style={{ textAlign: 'right' }}>{tp('agents', 'colNetToAnt')}</th>
              </tr>
            </thead>
            <tbody>
              {summaryPage.map(({ agent: a, gross, comm, net, bookings }) => {
                const tierColor = TIER_COLORS[a.tier] || '#6B7F74';
                const tierBg = TIER_BG[a.tier] || '#f9f9f9';
                return (
                  <tr key={a.id}>
                    <td>
                      <b>{a.name}</b>
                    </td>
                    <td>
                      <span className="agent-tier-pill" style={{ background: tierBg, color: tierColor, borderColor: tierColor, fontSize: 10.5, padding: '1px 8px' }}>
                        {a.tier}
                      </span>
                    </td>
                    <td>{bookings}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{gross > 0 ? `$${fmt(gross)}` : '—'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--gold)' }}>{a.commissionPct}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--gold)' }}>{comm > 0 ? `$${fmt(comm)}` : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--g)' }}>{net > 0 ? `$${fmt(net)}` : '—'}</td>
                  </tr>
                );
              })}
              <tr style={{ background: 'var(--gl)', fontWeight: 700 }}>
                <td colSpan={3}>{tp('agents', 'summaryTotal')}</td>
                <td style={{ textAlign: 'right' }}>${fmt(summaryRows.grandGross)}</td>
                <td></td>
                <td style={{ textAlign: 'right', color: 'var(--gold)' }}>${fmt(summaryRows.grandComm)}</td>
                <td style={{ textAlign: 'right', color: 'var(--g)' }}>${fmt(summaryRows.grandNet)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <PaginationBar {...summaryPagination} onPageSizeChange={setPageSize} />
      </div>

      {profile && (
        <div className="modal-overlay open" onClick={() => setProfileId(null)}>
          <div className="modal agent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="agent-modal-hd">
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{tpl('agents', 'profileTitle', { name: profile.name })}</div>
              <button type="button" className="agent-modal-close" onClick={() => setProfileId(null)}>
                {tp('agents', 'profileClose')}
              </button>
            </div>
            <div style={{ padding: 22 }}>{renderProfileBody(profile)}</div>
          </div>
        </div>
      )}

      <AgentFormModal
        open={formMode !== null}
        mode={formMode === 'edit' ? 'edit' : 'add'}
        agent={editAgent}
        agents={storeAgents}
        onClose={() => {
          setFormMode(null);
          setEditId(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
