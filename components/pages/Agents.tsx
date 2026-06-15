'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { TIER_BG, TIER_COLORS } from '@/lib/page-helpers';
import { useStore } from '@/hooks/useStore';
import type { Agent } from '@/lib/types';
import AgentFormModal from '@/components/agents/AgentFormModal';

export default function Agents() {
  const agents = useStore((s) => s.agents);
  const leads = useStore((s) => s.leads);
  const addAgent = useStore((s) => s.addAgent);
  const updateAgent = useStore((s) => s.updateAgent);
  const deleteAgent = useStore((s) => s.deleteAgent);

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return agents.filter(
      (a) => !q || a.name.toLowerCase().includes(q) || a.country.toLowerCase().includes(q) || (a.tier || '').toLowerCase().includes(q)
    );
  }, [agents, search]);

  const totalAgents = agents.filter((a) => a.id !== 'AGT-001').length;
  const activeAgents = agents.filter((a) => a.id !== 'AGT-001' && a.status === 'Active').length;
  const totalComm = leads.reduce((s, l) => {
    const ag = agents.find((a) => a.id === l.agentId);
    if (!ag || ag.commissionPct === 0) return s;
    return s + (l.value || 0) * (ag.commissionPct / 100);
  }, 0);

  const summaryRows = useMemo(() => {
    let grandGross = 0;
    let grandComm = 0;
    const rows = agents.map((a) => {
      const agLeads = leads.filter((l) => l.agentId === a.id && ['Confirmed', 'Completed', 'On Tour'].includes(l.stage));
      const gross = agLeads.reduce((s, l) => s + (l.value || 0), 0);
      const comm = Math.round(gross * (a.commissionPct / 100));
      const net = gross - comm;
      grandGross += gross;
      grandComm += comm;
      return { agent: a, gross, comm, net, bookings: agLeads.length };
    });
    return { rows, grandGross, grandComm, grandNet: grandGross - grandComm };
  }, [agents, leads]);

  const profile = profileId ? agents.find((a) => a.id === profileId) : null;
  const editAgent = editId ? agents.find((a) => a.id === editId) : null;

  function handleDelete(id: string) {
    if (id === 'AGT-001') return;
    if (confirm('Delete this agent?')) {
      deleteAgent(id);
      setProfileId(null);
    }
  }

  function handleSave(agent: Agent) {
    if (formMode === 'edit') {
      updateAgent(agent.id, agent);
      setEditId(null);
    } else {
      addAgent(agent);
    }
    setFormMode(null);
  }

  function renderAgentCard(a: Agent) {
    const agLeads = leads.filter((l) => l.agentId === a.id);
    const pipelineValue = agLeads.reduce((s, l) => s + (l.value || 0), 0);
    const commEarned = Math.round(pipelineValue * (a.commissionPct / 100));
    const tc = TIER_COLORS[a.tier] || '#6B7F74';
    const tb = TIER_BG[a.tier] || '#f9f9f9';

    return (
      <div key={a.id} className="agent-card" onClick={() => setProfileId(a.id)} role="button" tabIndex={0}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--td)' }}>{a.name}</div>
            <div style={{ fontSize: 12, color: 'var(--m)' }}>
              {a.country} · {a.contactName !== '—' ? a.contactName : 'No contact'}
            </div>
          </div>
          <span className="agent-tier-pill" style={{ background: tb, color: tc, borderColor: tc }}>
            {a.tier}
          </span>
        </div>
        <div className="agent-stats-grid">
          <div className="agent-stat">
            <div className="agent-stat-lbl">Commission</div>
            <div className="agent-stat-val" style={{ color: 'var(--gold)' }}>
              {a.commissionPct}%
            </div>
          </div>
          <div className="agent-stat">
            <div className="agent-stat-lbl">Active Leads</div>
            <div className="agent-stat-val" style={{ color: 'var(--g)' }}>
              {agLeads.length}
            </div>
          </div>
          <div className="agent-stat">
            <div className="agent-stat-lbl">Pipeline Value</div>
            <div className="agent-stat-val">${fmt(pipelineValue)}</div>
          </div>
          <div className="agent-stat" style={{ background: '#FDF6E3' }}>
            <div className="agent-stat-lbl">Est. Commission</div>
            <div className="agent-stat-val" style={{ color: 'var(--gold)' }}>
              ${fmt(commEarned)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--m)', borderTop: '1px solid #E2E8E4', paddingTop: 8 }}>
          {a.status === 'Active' ? <span style={{ color: 'var(--g)' }}>● Active</span> : <span style={{ color: 'var(--red)' }}>● Inactive</span>} · {a.currency} ·{' '}
          {a.email !== '—' ? (
            <a href={`mailto:${a.email}`} style={{ color: 'var(--blue)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
              {a.email}
            </a>
          ) : (
            'No email'
          )}
        </div>
      </div>
    );
  }

  function renderProfileBody(a: Agent) {
    const leadsForAgent = leads.filter((l) => l.agentId === a.id);
    const pipelineValue = leadsForAgent.reduce((s, l) => s + (l.value || 0), 0);
    const commEarned = Math.round(pipelineValue * (a.commissionPct / 100));
    const tc = TIER_COLORS[a.tier] || '#6B7F74';
    const tb = TIER_BG[a.tier] || '#f9f9f9';

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, color: 'var(--td)' }}>{a.name}</h2>
            <div style={{ fontSize: 13, color: 'var(--m)' }}>
              {a.country} · {a.id}
            </div>
          </div>
          <span style={{ background: tb, color: tc, border: `1.5px solid ${tc}`, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>
            {a.tier}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
          <div style={{ background: '#E8F5EE', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: 0.7 }}>Commission</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)' }}>{a.commissionPct}%</div>
          </div>
          <div style={{ background: '#E8F5EE', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: 0.7 }}>Pipeline</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--g)' }}>${fmt(pipelineValue)}</div>
          </div>
          <div style={{ background: '#FDF6E3', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: 0.7 }}>Est. Comm.</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)' }}>${fmt(commEarned)}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18, fontSize: 13 }}>
          <div>
            <span style={{ color: 'var(--m)' }}>Contact Name:</span> <b>{a.contactName !== '—' ? a.contactName : '—'}</b>
          </div>
          <div>
            <span style={{ color: 'var(--m)' }}>Currency:</span> <b>{a.currency}</b>
          </div>
          <div>
            <span style={{ color: 'var(--m)' }}>Email:</span>{' '}
            {a.email && a.email !== '—' ? (
              <a href={`mailto:${a.email}`} style={{ color: 'var(--blue)' }}>
                {a.email}
              </a>
            ) : (
              '—'
            )}
          </div>
          <div>
            <span style={{ color: 'var(--m)' }}>Phone:</span>{' '}
            {a.phone && a.phone !== '—' ? (
              <a href={`tel:${a.phone}`} style={{ color: 'var(--t)' }}>
                {a.phone}
              </a>
            ) : (
              '—'
            )}
          </div>
          <div>
            <span style={{ color: 'var(--m)' }}>Status:</span>{' '}
            <b style={{ color: a.status === 'Active' ? 'var(--g)' : 'var(--red)' }}>{a.status}</b>
          </div>
        </div>
        {a.notes && (
          <div style={{ background: '#F7F8F6', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--td)', marginBottom: 18 }}>
            <b>Notes:</b> {a.notes}
          </div>
        )}
        {leadsForAgent.length ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--m)', marginBottom: 8 }}>
              Associated Leads ({leadsForAgent.length})
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Lead ID</th>
                  <th>Tour</th>
                  <th>Stage</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {leadsForAgent.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{l.id}</code>
                    </td>
                    <td>{l.tour || '—'}</td>
                    <td>{l.stage}</td>
                    <td style={{ fontWeight: 600 }}>${fmt(l.value || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ color: 'var(--m)', fontSize: 13 }}>No leads linked to this agent yet.</div>
        )}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--b)', display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          {a.id !== 'AGT-001' && (
            <>
              <button
                type="button"
                className="btn btn-s btn-sm"
                onClick={() => {
                  setProfileId(null);
                  setEditId(a.id);
                  setFormMode('edit');
                }}
              >
                ✎ Edit
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>
                🗑 Delete Agent
              </button>
            </>
          )}
          <button type="button" className="btn btn-s btn-sm" onClick={() => setProfileId(null)}>
            Close
          </button>
        </div>
      </>
    );
  }

  return (
    <div>
      <div className="agents-header">
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>🤝 B2B Agent Management</h2>
          <div style={{ fontSize: 12, color: 'var(--m)' }}>Commission tracking · Revenue by agent · YTD performance</div>
        </div>
        <div className="view-toggle">
          <button type="button" className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}>
            ⊞ Grid
          </button>
          <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>
            ☰ List
          </button>
        </div>
        <input
          type="text"
          placeholder="🔍 Search agents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '6px 11px', border: '1.5px solid var(--b)', borderRadius: 8, fontFamily: 'inherit', fontSize: 12, width: 170 }}
        />
        <button className="btn btn-p btn-sm" type="button" onClick={() => setFormMode('add')}>
          + Add Agent
        </button>
      </div>

      <div className="agents-summary-pills">
        <div className="agent-pill" style={{ background: '#E8F5EE' }}>
          <div className="agent-pill-lbl">Total Agents</div>
          <div className="agent-pill-val" style={{ color: 'var(--g)' }}>
            {totalAgents}
          </div>
        </div>
        <div className="agent-pill" style={{ background: '#E8F5EE' }}>
          <div className="agent-pill-lbl">Active</div>
          <div className="agent-pill-val" style={{ color: 'var(--g)' }}>
            {activeAgents}
          </div>
        </div>
        <div className="agent-pill" style={{ background: '#FDF6E3' }}>
          <div className="agent-pill-lbl">Est. Commission (Pipeline)</div>
          <div className="agent-pill-val" style={{ color: 'var(--gold)' }}>
            ${fmt(Math.round(totalComm))}
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="agents-grid">{filtered.length ? filtered.map(renderAgentCard) : <div style={{ color: 'var(--m)', padding: 20 }}>No agents found.</div>}</div>
      ) : (
        <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Country</th>
                  <th>Tier</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th style={{ textAlign: 'right' }}>Comm %</th>
                  <th style={{ textAlign: 'right' }}>Active Leads</th>
                  <th style={{ textAlign: 'right' }}>Pipeline</th>
                  <th style={{ textAlign: 'right' }}>Est. Comm.</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const agLeads = leads.filter((l) => l.agentId === a.id);
                  const pipeline = agLeads.reduce((s, l) => s + (l.value || 0), 0);
                  const comm = Math.round(pipeline * (a.commissionPct / 100));
                  const tc = TIER_COLORS[a.tier] || '#6B7F74';
                  const tb = TIER_BG[a.tier] || '#f9f9f9';
                  return (
                    <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setProfileId(a.id)}>
                      <td>
                        <b>{a.name}</b>
                        <div style={{ fontSize: 10.5, color: 'var(--m)' }}>{a.country}</div>
                      </td>
                      <td>{a.country}</td>
                      <td>
                        <span className="agent-tier-pill" style={{ background: tb, color: tc, borderColor: tc, fontSize: 10.5, padding: '1px 8px' }}>
                          {a.tier}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{a.contactName !== '—' ? <b>{a.contactName}</b> : '—'}</td>
                      <td style={{ fontSize: 11.5 }}>{a.phone && a.phone !== '—' ? a.phone : '—'}</td>
                      <td style={{ fontSize: 11.5 }}>{a.email && a.email !== '—' ? a.email : '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold)' }}>{a.commissionPct}%</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--g)' }}>{agLeads.length}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>${fmt(pipeline)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--gold)' }}>{comm > 0 ? `$${fmt(comm)}` : '—'}</td>
                      <td>
                        <span style={{ color: a.status === 'Active' ? 'var(--g)' : 'var(--red)' }}>● {a.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }} onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-s btn-sm" type="button" onClick={() => setProfileId(a.id)}>
                            View
                          </button>
                          {a.id !== 'AGT-001' && (
                            <button className="btn btn-danger btn-sm" type="button" onClick={() => handleDelete(a.id)}>
                              🗑
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-hd">
          <span className="card-title">B2B Revenue Summary — YTD 2026</span>
          <span className="bdg bdg-g">${fmt(summaryRows.grandGross)} gross</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Tier</th>
                <th>Bookings</th>
                <th style={{ textAlign: 'right' }}>Gross Revenue</th>
                <th style={{ textAlign: 'right' }}>Commission %</th>
                <th style={{ textAlign: 'right' }}>Commission Owed</th>
                <th style={{ textAlign: 'right' }}>Net to Ant Adventures</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.rows.map(({ agent: a, gross, comm, net, bookings }) => {
                const tc = TIER_COLORS[a.tier] || '#6B7F74';
                const tb = TIER_BG[a.tier] || '#f9f9f9';
                return (
                  <tr key={a.id}>
                    <td>
                      <b>{a.name}</b>
                    </td>
                    <td>
                      <span className="agent-tier-pill" style={{ background: tb, color: tc, borderColor: tc, fontSize: 10.5, padding: '1px 8px' }}>
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
                <td colSpan={3}>TOTAL</td>
                <td style={{ textAlign: 'right' }}>${fmt(summaryRows.grandGross)}</td>
                <td></td>
                <td style={{ textAlign: 'right', color: 'var(--gold)' }}>${fmt(summaryRows.grandComm)}</td>
                <td style={{ textAlign: 'right', color: 'var(--g)' }}>${fmt(summaryRows.grandNet)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {profile && (
        <div className="modal-overlay open" onClick={() => setProfileId(null)}>
          <div className="modal agent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="agent-modal-hd">
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{profile.name} — Agent Profile</div>
              <button type="button" className="agent-modal-close" onClick={() => setProfileId(null)}>
                ✕ Close
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
        agents={agents}
        onClose={() => {
          setFormMode(null);
          setEditId(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
