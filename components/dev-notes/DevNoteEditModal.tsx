'use client';

import type { FormEvent } from 'react';
import {
  devNoteCategorySchema,
  devNotePrioritySchema,
  devNoteStatusSchema,
  type DevNoteEditPayload,
  type DevNoteListItem,
} from '@/lib/dev-notes/dev-notes-input';
import { useLanguage } from '@/hooks/useLanguage';

type Props = {
  note: DevNoteListItem;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: DevNoteEditPayload) => void;
};

export default function DevNoteEditModal({ note, saving, onClose, onSave }: Props) {
  const { tp, tc } = useLanguage();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') ?? '').trim();
    const body = String(data.get('body') ?? '').trim();
    if (!title || !body) return;
    onSave({
      title,
      body,
      assignee: String(data.get('assignee') ?? '').trim() || undefined,
      priority: devNotePrioritySchema.parse(String(data.get('priority') ?? 'medium')),
      category: devNoteCategorySchema.parse(String(data.get('category') ?? 'feature')),
      status: devNoteStatusSchema.parse(String(data.get('status') ?? 'open')),
    });
  };

  const stKey = note.status === 'In Progress' ? 'inprogress' : note.status === 'Done' ? 'done' : note.status === 'Open' ? 'open' : (note.status || 'open');

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
        <div className="modal-hd">
          <span>{tp('dev-notes', 'editModalTitle')}</span>
          <button className="modal-close-btn" type="button" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="modal-body" style={{ padding: 20 }} onSubmit={submit}>
          <div className="dn-form-grid">
            <div className="fg">
              <label className="lbl">{tp('dev-notes', 'lblNoteTitle')}</label>
              <input name="title" defaultValue={note.title} required />
            </div>
            <div className="fg">
              <label className="lbl">{tp('dev-notes', 'lblAssignToShort')}</label>
              <input name="assignee" defaultValue={note.assignee || ''} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div className="fg">
              <label className="lbl">{tp('dev-notes', 'lblPriority')}</label>
              <select name="priority" defaultValue={note.priority || 'medium'}>
                <option value="high">{tp('dev-notes', 'priorityHighLabel')}</option>
                <option value="medium">{tp('dev-notes', 'priorityMediumLabel')}</option>
                <option value="low">{tp('dev-notes', 'priorityLowLabel')}</option>
                <option value="info">{tp('dev-notes', 'priorityInfoLabel')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('dev-notes', 'lblCategory')}</label>
              <select name="category" defaultValue={note.category || 'feature'}>
                <option value="feature">{tp('dev-notes', 'filterFeature')}</option>
                <option value="bug">{tp('dev-notes', 'filterBug')}</option>
                <option value="design">{tp('dev-notes', 'filterDesign')}</option>
                <option value="data">{tp('dev-notes', 'filterData')}</option>
                <option value="other">{tp('dev-notes', 'catOther')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('dev-notes', 'lblStatus')}</label>
              <select name="status" defaultValue={stKey}>
                <option value="open">{tp('dev-notes', 'statusOpen')}</option>
                <option value="inprogress">{tp('dev-notes', 'statusInProgress')}</option>
                <option value="done">{tp('dev-notes', 'statusDone')}</option>
              </select>
            </div>
          </div>
          <div className="fg">
            <label className="lbl">{tp('dev-notes', 'lblDescriptionShort')}</label>
            <textarea name="body" style={{ minHeight: 120 }} defaultValue={note.body || ''} required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button className="btn btn-s" type="button" onClick={onClose}>
              {tc('cancel')}
            </button>
            <button className="btn btn-p" type="submit" disabled={saving}>
              {saving ? tp('dev-notes', 'saving') : tp('dev-notes', 'saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
