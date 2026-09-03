'use client';

import { useMemo, useState } from 'react';
import type { Agent } from '@/lib/types';
import {
  clearFormDraft,
  createFormDraftId,
  readFormDraft,
  writeFormDraft,
} from '@/lib/form-drafts/storage';
import { toast } from '@/lib/toast';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

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
  onSave: (agent: Agent) => void | Promise<void>;
  draftStorageId?: string | null;
  onDraftStorageIdChange?: (id: string | null) => void;
  onDraftsChanged?: () => void;
}

function nextAgentId(agents: Agent[]): string {
  const nums = agents.map((a) => parseInt(a.id.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `AGT-${String(next).padStart(3, '0')}`;
}

function initialForm(mode: AgentFormModalProps['mode'], agent: AgentFormModalProps['agent'], agents: Agent[]): AgentFormData {
  if (mode === 'edit' && agent) {
    return {
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
    };
  }
  return { ...EMPTY, id: nextAgentId(agents) };
}

function agentDraftLabel(form: AgentFormData, untitled: string): string {
  return form.name.trim() || form.email.trim() || untitled;
}

function isAgentDraftPayload(value: unknown): value is AgentFormData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<AgentFormData>;
  return typeof v.name === 'string' && typeof v.id === 'string';
}

function loadAgentFormSession(
  mode: AgentFormModalProps['mode'],
  agent: AgentFormModalProps['agent'],
  agents: Agent[],
  draftStorageId: string | null | undefined,
): { form: AgentFormData; fromDraft: boolean } {
  if (draftStorageId) {
    const draft = readFormDraft<AgentFormData>('agents', mode, draftStorageId);
    if (draft && isAgentDraftPayload(draft.payload)) {
      return { form: { ...EMPTY, ...draft.payload }, fromDraft: true };
    }
  }
  return { form: initialForm(mode, agent, agents), fromDraft: false };
}

export default function AgentFormModal({
  open,
  mode,
  agent,
  agents,
  onClose,
  onSave,
  draftStorageId = null,
  onDraftStorageIdChange,
  onDraftsChanged,
}: AgentFormModalProps) {
  const formKey = `${open}-${mode}-${draftStorageId ?? ''}-${agent ? JSON.stringify(agent) : agents.map((item) => item.id).join(',')}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftStorageId);
  const [form, setForm] = useState<AgentFormData>(
    () => loadAgentFormSession(mode, agent, agents, draftStorageId).form,
  );

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    const session = loadAgentFormSession(mode, agent, agents, draftStorageId);
    setForm(session.form);
    setActiveDraftId(draftStorageId);
  }

  const { language, tp, tc } = useLanguage();
  const baselineForm = useMemo(
    () => loadAgentFormSession(mode, agent, agents, draftStorageId).form,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session tied to formKey
    [formKey],
  );
  const dirty = useFormDirty(open, baselineForm, form, undefined, formKey);

  function resolveDraftWriteId(): string | null {
    if (mode === 'edit') return agent?.id ?? null;
    if (activeDraftId) return activeDraftId;
    return createFormDraftId();
  }

  const { requestClose } = useConfirmClose({
    open,
    dirty,
    onClose: () => {
      onDraftsChanged?.();
      onClose();
    },
    language,
    onSaveDraft: () => {
      const id = resolveDraftWriteId();
      if (!id) return;
      writeFormDraft('agents', mode, id, form, agentDraftLabel(form, tc('formDraftUntitled')));
      if (mode === 'add' && id !== activeDraftId) {
        setActiveDraftId(id);
        onDraftStorageIdChange?.(id);
      }
      onDraftsChanged?.();
    },
    onDiscard: () => {
      const id = mode === 'edit' ? agent?.id ?? null : activeDraftId;
      if (id) clearFormDraft('agents', mode, id);
      setActiveDraftId(null);
      onDraftStorageIdChange?.(null);
      onDraftsChanged?.();
    },
  });

  if (!open) return null;

  function set<K extends keyof AgentFormData>(key: K, value: AgentFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.warning(tp('agents', 'errNameRequired'));
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
    try {
      await onSave(saved);
      const id = mode === 'edit' ? agent?.id ?? null : activeDraftId;
      if (id) clearFormDraft('agents', mode, id);
      onDraftsChanged?.();
      onClose();
    } catch {
      // Parent already toasted; keep modal open for retry.
    }
  }

  return (
    <div className="overlay open" onClick={() => void requestClose()}>
      <div className="modal agent-form-modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green">
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{mode === 'edit' ? tp('agents', 'formTitleEdit') : tp('agents', 'formTitleAdd')}</div>
          <button type="button" className="modal-close-btn" onClick={() => void requestClose()}>
            ✕
          </button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            <div className="fg" style={{ gridColumn: '1 / 3' }}>
              <label className="lbl">{tp('agents', 'formName')}</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={tp('agents', 'formNamePlaceholder')} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('agents', 'formCountry')}</label>
              <input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder={tp('agents', 'formCountryPlaceholder')} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('agents', 'formTier')}</label>
              <select value={form.tier} onChange={(e) => set('tier', e.target.value)}>
                {['Direct', 'Bronze', 'Silver', 'Gold', 'Platinum'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('agents', 'formCommissionPct')}</label>
              <input type="number" min={0} max={30} value={form.commissionPct} onChange={(e) => set('commissionPct', +e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('agents', 'formCurrency')}</label>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                {['USD', 'EUR', 'AUD', 'VND'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('agents', 'formStatus')}</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="fg" style={{ gridColumn: '1 / 3' }}>
              <label className="lbl">{tp('agents', 'formContactName')}</label>
              <input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder={tp('agents', 'formContactPlaceholder')} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('agents', 'formEmail')}</label>
              <input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder={tp('agents', 'formEmailPlaceholder')} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('agents', 'formPhone')}</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder={tp('agents', 'formPhonePlaceholder')} />
            </div>
          </div>
          <div className="fg">
            <label className="lbl">{tp('agents', 'formNotes')}</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ minHeight: 60 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-s btn-sm" type="button" onClick={() => void requestClose()}>
              {tc('cancel')}
            </button>
            <button className="btn btn-p btn-sm" type="button" onClick={handleSave}>
              {tp('agents', 'formSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
