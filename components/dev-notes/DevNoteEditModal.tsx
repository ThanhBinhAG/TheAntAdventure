'use client';

import type { FormEvent } from 'react';
import {
  devNoteCategorySchema,
  devNotePrioritySchema,
  devNoteStatusSchema,
  type DevNoteEditPayload,
  type DevNoteListItem,
} from '@/lib/dev-notes/dev-notes-input';

type Props = {
  note: DevNoteListItem;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: DevNoteEditPayload) => void;
};

export default function DevNoteEditModal({ note, saving, onClose, onSave }: Props) {
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
          <span>✏️ Edit Note</span>
          <button className="modal-close-btn" type="button" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="modal-body" style={{ padding: 20 }} onSubmit={submit}>
          <div className="dn-form-grid">
            <div className="fg">
              <label className="lbl">Note Title *</label>
              <input name="title" defaultValue={note.title} required />
            </div>
            <div className="fg">
              <label className="lbl">Assign To</label>
              <input name="assignee" defaultValue={note.assignee || ''} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div className="fg">
              <label className="lbl">Priority</label>
              <select name="priority" defaultValue={note.priority || 'medium'}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Category</label>
              <select name="category" defaultValue={note.category || 'feature'}>
                <option value="feature">Feature</option>
                <option value="bug">Bug Fix</option>
                <option value="design">Design</option>
                <option value="data">Data</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Status</label>
              <select name="status" defaultValue={stKey}>
                <option value="open">Open</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="fg">
            <label className="lbl">Description *</label>
            <textarea name="body" style={{ minHeight: 120 }} defaultValue={note.body || ''} required />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button className="btn btn-s" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-p" type="submit" disabled={saving}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
