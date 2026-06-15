'use client';

import { useEffect, useState } from 'react';
import type { Agent } from '@/lib/types';

export type AgentFormData = {
  id: string;
  name: string;
  country: string;
  tier: string;
  commissionPct: number;
  currency: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
  status: string;
};

const EMPTY: AgentFormData = {
  id: '',
  name: '',
  country: 'USA',
  tier: 'Bronze',
  commissionPct: 8,
  currency: 'USD',
  contactName: '',
  email: '',
  phone: '',
  notes: '',
  status: 'Active',
};

interface AgentFormModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  agent?: Agent | null;
  agents: Agent[];
  onClose: () => void;
  onSave: (agent: Agent) => void;
}

function nextAgentId(agents: Agent[]): string {
  const nums = agents.map((a) => parseInt(a.id.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `AGT-${String(next).padStart(3, '0')}`;
}

export default function AgentFormModal({ open, mode, agent, agents, onClose, onSave }: AgentFormModalProps) {
  const [form, setForm] = useState<AgentFormData>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && agent) {
      setForm({
        id: agent.id,
        name: agent.name,
        country: agent.country,
        tier: agent.tier,
        commissionPct: agent.commissionPct,
        currency: agent.currency,
        contactName: agent.contactName !== '—' ? agent.contactName : '',
        email: agent.email !== '—' ? agent.email : '',
        phone: agent.phone !== '—' ? agent.phone : '',
        notes: agent.notes || '',
        status: agent.status,
      });
    } else {
      setForm({ ...EMPTY, id: nextAgentId(agents) });
    }
  }, [open, mode, agent, agents]);

  if (!open) return null;

  function set<K extends keyof AgentFormData>(key: K, value: AgentFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    if (!form.name.trim()) {
      alert('Agent name is required.');
      return;
    }
    const saved: Agent = {
      id: form.id,
      name: form.name.trim(),
      country: form.country.trim() || 'USA',
      tier: form.tier,
      commissionPct: form.commissionPct,
      currency: form.currency,
      contactName: form.contactName.trim() || '—',
      email: form.email.trim() || '—',
      phone: form.phone.trim() || '—',
      notes: form.notes.trim(),
      status: form.status as Agent['status'],
    };
    onSave(saved);
    onClose();
  }

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal agent-form-modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green">
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{mode === 'edit' ? 'Edit B2B Agent' : 'Add B2B Agent'}</div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            <div className="fg" style={{ gridColumn: '1 / 3' }}>
              <label className="lbl">Agent / Company Name *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Virtuoso" />
            </div>
            <div className="fg">
              <label className="lbl">Country</label>
              <input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="USA" />
            </div>
            <div className="fg">
              <label className="lbl">Tier</label>
              <select value={form.tier} onChange={(e) => set('tier', e.target.value)}>
                {['Direct', 'Bronze', 'Silver', 'Gold', 'Platinum'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Commission %</label>
              <input type="number" min={0} max={30} value={form.commissionPct} onChange={(e) => set('commissionPct', +e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Currency</label>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                {['USD', 'EUR', 'AUD', 'VND'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="fg" style={{ gridColumn: '1 / 3' }}>
              <label className="lbl">Contact Name</label>
              <input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Primary contact at agency" />
            </div>
            <div className="fg">
              <label className="lbl">Email</label>
              <input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="agent@company.com" />
            </div>
            <div className="fg">
              <label className="lbl">Phone</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 xxx xxx xxxx" />
            </div>
          </div>
          <div className="fg">
            <label className="lbl">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ minHeight: 60 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-s btn-sm" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-p btn-sm" type="button" onClick={handleSave}>
              💾 Save Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
