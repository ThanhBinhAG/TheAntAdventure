'use client';

import { useMemo, useState } from 'react';
import { SRC_COLORS, STAGE_COLORS, fmt } from '@/lib/constants';
import { npsBadgeClass, npsIcon } from '@/lib/page-helpers';
import { getClientPipeline } from '@/lib/crm-utils';
import { useStore } from '@/hooks/useStore';
import type { Customer } from '@/lib/types';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import CustomerProfileModal from '@/components/customers/CustomerProfileModal';

const STAGE_FILTERS: { value: string; label: string; style?: React.CSSProperties }[] = [
  { value: '', label: 'All Clients' },
  { value: 'Inquiry', label: 'Inquiry', style: { borderColor: '#1565C0', color: '#1565C0' } },
  { value: 'Designing', label: 'Designing', style: { borderColor: '#D97706', color: '#D97706' } },
  { value: 'Quoted', label: 'Quoted', style: { borderColor: '#D97706', color: '#D97706' } },
  { value: 'Negotiation', label: 'Negotiation', style: { borderColor: '#D97706', color: '#D97706' } },
  { value: 'Confirmed', label: 'Confirmed', style: { borderColor: '#2E7D52', color: '#2E7D52' } },
  { value: 'Completed', label: 'Completed', style: { borderColor: '#6B7F74', color: '#6B7F74' } },
  { value: 'none', label: 'No Activity', style: { borderColor: '#C0392B', color: '#C0392B' } },
];

export default function Customers() {
  const customers = useStore((s) => s.customers);
  const leads = useStore((s) => s.leads);
  const feedback = useStore((s) => s.feedback) as { custId?: string; nps?: number }[];
  const addCustomer = useStore((s) => s.addCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const deleteCustomer = useStore((s) => s.deleteCustomer);

  const [search, setSearch] = useState('');
  const [sourceF, setSourceF] = useState('');
  const [countryF, setCountryF] = useState('');
  const [stageF, setStageF] = useState('');
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = customers.filter(
      (c) =>
        (!search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())) &&
        (!sourceF || c.source === sourceF) &&
        (!countryF || c.country === countryF)
    );
    if (stageF === 'none') {
      list = list.filter((c) => leads.filter((l) => l.custId === c.id && l.stage !== 'Lost').length === 0);
    } else if (stageF) {
      list = list.filter((c) => getClientPipeline(c.id, leads).stage === stageF);
    }
    return list;
  }, [customers, leads, search, sourceF, countryF, stageF]);

  const profileCustomer = profileId ? customers.find((c) => c.id === profileId) : null;
  const editCustomer = editId ? customers.find((c) => c.id === editId) : null;

  function handleSave(customer: Customer) {
    if (formMode === 'edit') {
      updateCustomer(customer.id, customer);
      setEditId(null);
    } else {
      addCustomer(customer);
    }
    setFormMode(null);
  }

  return (
    <div>
      <div className="search-row">
        <input type="text" placeholder="Tìm khách hàng / Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
        <div style={{ flex: 1 }} />
        <button className="btn btn-p btn-sm" type="button" onClick={() => setFormMode('add')}>
          + Add Customer
        </button>
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
              {filtered.map((c) => {
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
                        <span className={`bdg ${STAGE_COLORS[p.stage] || 'bdg-w'}`} style={{ fontSize: 10 }}>
                          {p.stage}
                        </span>
                      ) : (
                        <span className="bdg bdg-w" style={{ fontSize: 10 }}>
                          No Activity
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--g)' }}>
                      {p.value > 0 ? `$${fmt(p.value)}` : <span style={{ color: 'var(--m)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>{p.count || <span style={{ color: 'var(--m)' }}>0</span>}</td>
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
                      <button className="btn btn-s btn-sm" type="button" style={{ marginRight: 4 }} onClick={() => setProfileId(c.id)}>
                        View
                      </button>
                      <button
                        className="btn btn-s btn-sm"
                        type="button"
                        style={{ marginRight: 4 }}
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
                        onClick={() => {
                          if (confirm(`Delete ${c.name}?`)) deleteCustomer(c.id);
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
          onClose={() => setProfileId(null)}
          onEdit={() => {
            setProfileId(null);
            setEditId(profileCustomer.id);
            setFormMode('edit');
          }}
          onDelete={() => {
            if (confirm(`Delete ${profileCustomer.name}?`)) {
              deleteCustomer(profileCustomer.id);
              setProfileId(null);
            }
          }}
        />
      )}
    </div>
  );
}
