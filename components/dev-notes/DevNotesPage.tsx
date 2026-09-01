'use client';

import { useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import DevNoteEditModal from '@/components/dev-notes/DevNoteEditModal';
import { useCreateDevNote } from '@/hooks/useCreateDevNote';
import { useDeleteDevNote } from '@/hooks/useDeleteDevNote';
import { useDevNotesPage } from '@/hooks/useDevNotesPage';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useUpdateDevNote } from '@/hooks/useUpdateDevNote';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import type {
  DevNoteCategory,
  DevNoteEditPayload,
  DevNoteListItem,
  DevNotePriority,
  DevNoteStatus,
} from '@/lib/dev-notes/dev-notes-input';
import { useLanguage } from '@/hooks/useLanguage';
import {
  DEV_NOTES_CAT_KEYS,
  DEV_NOTES_HOWTO_KEYS,
  DEV_NOTES_LEGEND_KEYS,
  DEV_NOTES_PRIORITY_LABEL_KEYS,
} from '@/lib/i18n/pages/dev-notes';

const PRIORITY_META: Record<string, { dot: string; labelKey: string; bg: string; fg: string }> = {
  high: { dot: '🔴', labelKey: 'high', bg: '#FDECEA', fg: '#C0392B' },
  medium: { dot: '🟡', labelKey: 'medium', bg: '#FEF3C7', fg: '#D97706' },
  low: { dot: '🟢', labelKey: 'low', bg: 'var(--gl)', fg: 'var(--gd)' },
  info: { dot: '💡', labelKey: 'info', bg: '#E3F2FD', fg: '#1565C0' },
};

const STATUS_META: Record<string, { labelKey: string; bg: string; fg: string }> = {
  open: { labelKey: 'open', bg: '#E3F2FD', fg: '#1565C0' },
  inprogress: { labelKey: 'inprogress', bg: 'var(--amb-l)', fg: 'var(--amb)' },
  done: { labelKey: 'done', bg: 'var(--gl)', fg: 'var(--gd)' },
};

function normStatus(s?: string) {
  if (!s) return 'open';
  if (s === 'In Progress') return 'inprogress';
  if (s === 'Done') return 'done';
  if (s === 'Open') return 'open';
  return s.toLowerCase();
}

export default function DevNotesPage() {
  const { tp, tpl, tc } = useLanguage();
  const { canWrite } = usePagePermission('devnotes');
  const { items: notes, loading, error, reload } = useDevNotesPage();
  const { createDevNote } = useCreateDevNote();
  const { patchDevNote } = useUpdateDevNote();
  const { deleteDevNote } = useDeleteDevNote();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<DevNotePriority>('medium');
  const [category, setCategory] = useState<DevNoteCategory>('feature');
  const [statusF, setStatusF] = useState('');
  const [catF, setCatF] = useState('');
  const [saving, setSaving] = useState(false);
  const [editNote, setEditNote] = useState<DevNoteListItem | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const filtered = useMemo(
    () =>
      notes.filter((n) => {
        const st = normStatus(n.status);
        if (statusF && st !== statusF) return false;
        if (catF && n.category !== catF) return false;
        return true;
      }),
    [notes, statusF, catF],
  );

  const summary = useMemo(() => {
    const total = notes.length;
    const open = notes.filter((n) => normStatus(n.status) === 'open').length;
    const inpro = notes.filter((n) => normStatus(n.status) === 'inprogress').length;
    const done = notes.filter((n) => normStatus(n.status) === 'done').length;
    const high = notes.filter((n) => n.priority === 'high' && normStatus(n.status) !== 'done').length;
    return { total, open, inpro, done, high };
  }, [notes]);

  const saveNote = async () => {
    if (!canWrite) {
      toast.warning(tp('dev-notes', 'noPermissionCreate'));
      return;
    }
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const result = await createDevNote({
      title: title.trim(),
      body: body.trim(),
      assignee: assignee.trim() || undefined,
      priority,
      category,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setTitle('');
    setBody('');
    setAssignee('');
    toast.success(tp('dev-notes', 'noteSaved'));
  };

  const onStatusChange = async (note: DevNoteListItem, status: string) => {
    if (!canWrite || !note.id) return;
    const result = await patchDevNote(note.id, { status: status as DevNoteStatus });
    if (!result.ok) {
      toast.error(result.message);
    }
  };

  const onDeleteNote = async (note: DevNoteListItem) => {
    if (!canWrite || !note.id) return;
    const ok = await confirmDialog(tpl('dev-notes', 'deleteConfirm', { title: note.title }), { title: tp('dev-notes', 'deleteTitle') });
    if (!ok) return;
    const result = await deleteDevNote(note.id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    if (editNote?.id === note.id) setEditNote(null);
    toast.success(tp('dev-notes', 'noteDeleted'));
  };

  const onSaveEdit = async (payload: DevNoteEditPayload) => {
    if (!canWrite || !editNote?.id) return;
    setEditSaving(true);
    const result = await patchDevNote(editNote.id, {
      title: payload.title,
      body: payload.body,
      assignee: payload.assignee,
      priority: payload.priority,
      category: payload.category,
      status: payload.status,
    });
    setEditSaving(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setEditNote(null);
    toast.success(tp('dev-notes', 'noteUpdated'));
  };

  if (loading && notes.length === 0) {
    return <div className="crm-loading-hint">{tp('dev-notes', 'loading')}</div>;
  }

  if (error && notes.length === 0) {
    return (
      <EmptyState
        variant="access"
        title={tp('dev-notes', 'loadErrorTitle')}
        description={error}
        action={
          <button className="btn btn-p btn-sm" type="button" onClick={() => void reload()}>
            {tc('retry')}
          </button>
        }
      />
    );
  }

  return (
    <div className="dn-layout">
      <div>
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-hd">
            <span className="card-title">{tp('dev-notes', 'newNoteTitle')}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DevNotePriority)}
                disabled={!canWrite}
                style={{ fontSize: 12, padding: '4px 8px' }}
              >
                <option value="high">{tp('dev-notes', 'priorityHigh')}</option>
                <option value="medium">{tp('dev-notes', 'priorityMedium')}</option>
                <option value="low">{tp('dev-notes', 'priorityLow')}</option>
                <option value="info">{tp('dev-notes', 'priorityInfo')}</option>
              </select>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DevNoteCategory)}
                disabled={!canWrite}
                style={{ fontSize: 12, padding: '4px 8px' }}
              >
                <option value="feature">{tp('dev-notes', 'catFeature')}</option>
                <option value="bug">{tp('dev-notes', 'catBug')}</option>
                <option value="design">{tp('dev-notes', 'catDesign')}</option>
                <option value="data">{tp('dev-notes', 'catData')}</option>
                <option value="other">{tp('dev-notes', 'catOther')}</option>
              </select>
            </div>
          </div>
          <div className="card-body">
            <div className="dn-form-grid">
              <div className="fg">
                <label className="lbl">{tp('dev-notes', 'lblNoteTitle')}</label>
                <input placeholder={tp('dev-notes', 'placeholderTitle')} value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canWrite} />
              </div>
              <div className="fg">
                <label className="lbl">{tp('dev-notes', 'lblAssignTo')}</label>
                <input placeholder={tp('dev-notes', 'placeholderAssignee')} value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={!canWrite} />
              </div>
            </div>
            <div className="fg">
              <label className="lbl">{tp('dev-notes', 'lblDescription')}</label>
              <textarea style={{ minHeight: 120 }} placeholder={tp('dev-notes', 'placeholderBody')} value={body} onChange={(e) => setBody(e.target.value)} disabled={!canWrite} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-s btn-sm" type="button" onClick={() => { setTitle(''); setBody(''); }} disabled={!canWrite}>
                {tp('dev-notes', 'clear')}
              </button>
              <button className="btn btn-p" type="button" onClick={() => void saveNote()} disabled={!canWrite || saving}>
                {tp('dev-notes', 'saveNote')}
              </button>
            </div>
          </div>
        </div>

        <div className="dn-filter-row">
          <span className="dn-filter-label">{tp('dev-notes', 'allNotes')}</span>
          <div style={{ flex: 1 }} />
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="">{tp('dev-notes', 'filterAllStatus')}</option>
            <option value="open">{tp('dev-notes', 'statusOpen')}</option>
            <option value="inprogress">{tp('dev-notes', 'statusInProgress')}</option>
            <option value="done">{tp('dev-notes', 'statusDone')}</option>
          </select>
          <select value={catF} onChange={(e) => setCatF(e.target.value)}>
            <option value="">{tp('dev-notes', 'filterAllCategories')}</option>
            <option value="feature">{tp('dev-notes', 'filterFeature')}</option>
            <option value="bug">{tp('dev-notes', 'filterBug')}</option>
            <option value="design">{tp('dev-notes', 'filterDesign')}</option>
            <option value="data">{tp('dev-notes', 'filterData')}</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            className="crm-empty-state--flush"
            size="compact"
            variant="notes"
            title={tp('dev-notes', 'noNotesTitle')}
            description={tp('dev-notes', 'noNotesDesc')}
          />
        ) : (
          filtered.map((n) => {
            const pri = PRIORITY_META[n.priority || 'medium'] || PRIORITY_META.medium;
            const stKey = normStatus(n.status);
            const st = STATUS_META[stKey] || STATUS_META.open;
            const catKey = DEV_NOTES_CAT_KEYS[n.category || 'other'] || 'catOther';
            const priLabelKey = DEV_NOTES_PRIORITY_LABEL_KEYS[pri.labelKey] || 'priorityMediumLabel';
            return (
              <div key={n.id} className="dn-note-card">
                <div className="dn-note-hd">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span>{pri.dot}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{n.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="dn-pri-tag" style={{ background: pri.bg, color: pri.fg }}>
                        {tp('dev-notes', priLabelKey)}
                      </span>
                      <span className="dn-cat-tag">{tp('dev-notes', catKey)}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--m)' }}>
                        → {n.assignee || tp('dev-notes', 'defaultAssignee')} · {n.author || '—'} · {n.date || '—'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {canWrite && (
                      <>
                        <button className="btn btn-s btn-sm" type="button" onClick={() => setEditNote(n)}>
                          {tc('edit')}
                        </button>
                        <button className="btn btn-s btn-sm" type="button" onClick={() => void onDeleteNote(n)}>
                          {tc('delete')}
                        </button>
                      </>
                    )}
                    <select
                      value={stKey}
                      onChange={(e) => void onStatusChange(n, e.target.value)}
                      disabled={!canWrite}
                      style={{ background: st.bg, color: st.fg, fontWeight: 500, fontSize: 12, padding: '4px 8px', border: '1px solid var(--b)', borderRadius: 7 }}
                    >
                      <option value="open">{tp('dev-notes', 'statusOpen')}</option>
                      <option value="inprogress">{tp('dev-notes', 'statusInProgress')}</option>
                      <option value="done">{tp('dev-notes', 'statusDone')}</option>
                    </select>
                  </div>
                </div>
                <div className="dn-note-body">{n.body}</div>
              </div>
            );
          })
        )}
      </div>

      {editNote && (
        <DevNoteEditModal
          note={editNote}
          saving={editSaving}
          onClose={() => setEditNote(null)}
          onSave={(payload) => void onSaveEdit(payload)}
        />
      )}

      <div className="dn-sidebar">
        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('dev-notes', 'summaryTitle')}</span>
          </div>
          <div className="card-body dn-summary">
            {(
              [
                [tp('dev-notes', 'summaryTotal'), summary.total, 'var(--t)'],
                [tp('dev-notes', 'summaryHigh'), summary.high, 'var(--red)'],
                [tp('dev-notes', 'summaryOpen'), summary.open, 'var(--blue)'],
                [tp('dev-notes', 'summaryInProgress'), summary.inpro, 'var(--amb)'],
                [tp('dev-notes', 'summaryDone'), summary.done, 'var(--g)'],
              ] as const
            ).map(([label, val, col]) => (
              <div key={String(label)} className="dn-summary-row">
                <span>{label}</span>
                <span style={{ fontWeight: 700, color: col as string }}>{val as number}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('dev-notes', 'howToUseTitle')}</span>
          </div>
          <div className="card-body ai-steps">
            {DEV_NOTES_HOWTO_KEYS.map((key, i) => (
              <div key={key} className="ai-step">
                <div className="ai-step-num">{i + 1}</div>
                <span>{tp('dev-notes', key)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('dev-notes', 'legendTitle')}</span>
          </div>
          <div className="card-body dn-legend">
            {DEV_NOTES_LEGEND_KEYS.map(({ status, desc }) => (
              <div key={status} className="dn-legend-row">
                <span className="dn-pri-tag" style={{ background: status === 'statusOpen' ? '#E3F2FD' : status === 'statusInProgress' ? 'var(--amb-l)' : 'var(--gl)', color: status === 'statusOpen' ? '#1565C0' : status === 'statusInProgress' ? 'var(--amb)' : 'var(--gd)' }}>
                  {tp('dev-notes', status)}
                </span>
                <span style={{ color: 'var(--m)' }}>{tp('dev-notes', desc)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
