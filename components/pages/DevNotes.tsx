'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/hooks/useStore';

type DevNote = {
  id?: string;
  title?: string;
  status?: string;
  priority?: string;
  category?: string;
  body?: string;
  assignee?: string;
  author?: string;
  date?: string;
};

const PRIORITY_META: Record<string, { dot: string; label: string; bg: string; fg: string }> = {
  high: { dot: '🔴', label: 'High', bg: '#FDECEA', fg: '#C0392B' },
  medium: { dot: '🟡', label: 'Medium', bg: '#FEF3C7', fg: '#D97706' },
  low: { dot: '🟢', label: 'Low', bg: 'var(--gl)', fg: 'var(--gd)' },
  info: { dot: '💡', label: 'Info', bg: '#E3F2FD', fg: '#1565C0' },
};

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  open: { label: 'Open', bg: '#E3F2FD', fg: '#1565C0' },
  inprogress: { label: 'In Progress', bg: 'var(--amb-l)', fg: 'var(--amb)' },
  done: { label: 'Done', bg: 'var(--gl)', fg: 'var(--gd)' },
  Open: { label: 'Open', bg: '#E3F2FD', fg: '#1565C0' },
  'In Progress': { label: 'In Progress', bg: 'var(--amb-l)', fg: 'var(--amb)' },
  Done: { label: 'Done', bg: 'var(--gl)', fg: 'var(--gd)' },
};

const CAT_LABELS: Record<string, string> = {
  feature: '✨ New Feature',
  bug: '🐛 Bug Fix',
  design: '🎨 Design Change',
  data: '📊 Data / Content',
  other: '📌 Other',
};

function normStatus(s?: string) {
  if (!s) return 'open';
  if (s === 'In Progress') return 'inprogress';
  if (s === 'Done') return 'done';
  if (s === 'Open') return 'open';
  return s.toLowerCase();
}

export default function DevNotes() {
  const notes = useStore((s) => s.devNotes) as DevNote[];
  const addDevNote = useStore((s) => s.addDevNote);
  const updateDevNote = useStore((s) => s.updateDevNote);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('feature');
  const [statusF, setStatusF] = useState('');
  const [catF, setCatF] = useState('');

  const filtered = useMemo(
    () =>
      notes.filter((n) => {
        const st = normStatus(n.status);
        if (statusF && st !== statusF) return false;
        if (catF && n.category !== catF) return false;
        return true;
      }),
    [notes, statusF, catF]
  );

  const summary = useMemo(() => {
    const total = notes.length;
    const open = notes.filter((n) => normStatus(n.status) === 'open').length;
    const inpro = notes.filter((n) => normStatus(n.status) === 'inprogress').length;
    const done = notes.filter((n) => normStatus(n.status) === 'done').length;
    const high = notes.filter((n) => n.priority === 'high' && normStatus(n.status) !== 'done').length;
    return { total, open, inpro, done, high };
  }, [notes]);

  const saveNote = () => {
    if (!title.trim() || !body.trim()) return;
    addDevNote({
      id: `DN-${String(notes.length + 1).padStart(3, '0')}`,
      title: title.trim(),
      body: body.trim(),
      assignee: assignee.trim() || 'Dev Team',
      priority,
      category,
      status: 'open',
      author: 'Tai Pham',
      date: new Date().toISOString().split('T')[0],
    });
    setTitle('');
    setBody('');
    setAssignee('');
  };

  return (
    <div className="dn-layout">
      <div>
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-hd">
            <span className="card-title">📝 New Requirement / Note</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}>
                <option value="high">🔴 High Priority</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
                <option value="info">💡 Info / Idea</option>
              </select>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}>
                <option value="feature">✨ New Feature</option>
                <option value="bug">🐛 Bug Fix</option>
                <option value="design">🎨 Design Change</option>
                <option value="data">📊 Data / Content</option>
                <option value="other">📌 Other</option>
              </select>
            </div>
          </div>
          <div className="card-body">
            <div className="dn-form-grid">
              <div className="fg">
                <label className="lbl">Note Title *</label>
                <input placeholder="e.g. Add PDF export to Tour Design Studio" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="fg">
                <label className="lbl">Assign To (technician/engineer)</label>
                <input placeholder="e.g. Dev Team, John, Claude AI…" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
              </div>
            </div>
            <div className="fg">
              <label className="lbl">Detailed Requirements / Description *</label>
              <textarea style={{ minHeight: 120 }} placeholder="Describe exactly what you need built or changed…" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-s btn-sm" type="button" onClick={() => { setTitle(''); setBody(''); }}>
                Clear
              </button>
              <button className="btn btn-p" type="button" onClick={saveNote}>
                📝 Save Note
              </button>
            </div>
          </div>
        </div>

        <div className="dn-filter-row">
          <span className="dn-filter-label">All Notes</span>
          <div style={{ flex: 1 }} />
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="inprogress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <select value={catF} onChange={(e) => setCatF(e.target.value)}>
            <option value="">All Categories</option>
            <option value="feature">Feature</option>
            <option value="bug">Bug Fix</option>
            <option value="design">Design</option>
            <option value="data">Data</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="dn-empty">No notes found. Add your first requirement above.</div>
        ) : (
          filtered.map((n, i) => {
            const pri = PRIORITY_META[n.priority || 'medium'] || PRIORITY_META.medium;
            const stKey = normStatus(n.status);
            const st = STATUS_META[stKey] || STATUS_META.open;
            const cat = CAT_LABELS[n.category || 'other'] || n.category;
            return (
              <div key={n.id || i} className="dn-note-card">
                <div className="dn-note-hd">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span>{pri.dot}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{n.title}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="dn-pri-tag" style={{ background: pri.bg, color: pri.fg }}>
                        {pri.label}
                      </span>
                      <span className="dn-cat-tag">{cat}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--m)' }}>
                        → {n.assignee || 'Dev Team'} · {n.author || '—'} · {n.date || '—'}
                      </span>
                    </div>
                  </div>
                  <select
                    value={stKey}
                    onChange={(e) => n.id && updateDevNote(n.id, { status: e.target.value })}
                    style={{ background: st.bg, color: st.fg, fontWeight: 500, fontSize: 12, padding: '4px 8px', border: '1px solid var(--b)', borderRadius: 7 }}
                  >
                    <option value="open">Open</option>
                    <option value="inprogress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="dn-note-body">{n.body}</div>
              </div>
            );
          })
        )}
      </div>

      <div className="dn-sidebar">
        <div className="card">
          <div className="card-hd">
            <span className="card-title">📊 Summary</span>
          </div>
          <div className="card-body dn-summary">
            {[
              ['Total Notes', summary.total, 'var(--t)'],
              ['🔴 High Priority', summary.high, 'var(--red)'],
              ['Open', summary.open, 'var(--blue)'],
              ['In Progress', summary.inpro, 'var(--amb)'],
              ['Done', summary.done, 'var(--g)'],
            ].map(([label, val, col]) => (
              <div key={String(label)} className="dn-summary-row">
                <span>{label}</span>
                <span style={{ fontWeight: 700, color: col as string }}>{val as number}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">💡 How to Use</span>
          </div>
          <div className="card-body ai-steps">
            {[
              'Write your requirement in plain language — no technical jargon needed.',
              'Set priority and category so the dev team can triage efficiently.',
              'The dev team opens this page, reads your notes, and updates the status as they build.',
              'No emails, no WhatsApp — everything is tracked here in the CRM.',
            ].map((text, i) => (
              <div key={i} className="ai-step">
                <div className="ai-step-num">{i + 1}</div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">🏷 Status Legend</span>
          </div>
          <div className="card-body dn-legend">
            {[
              ['Open', '#E3F2FD', '#1565C0', 'Just logged, not started'],
              ['In Progress', 'var(--amb-l)', 'var(--amb)', 'Dev team working on it'],
              ['Done', 'var(--gl)', 'var(--gd)', 'Built and deployed'],
            ].map(([label, bg, fg, desc]) => (
              <div key={String(label)} className="dn-legend-row">
                <span className="dn-pri-tag" style={{ background: bg as string, color: fg as string }}>
                  {label}
                </span>
                <span style={{ color: 'var(--m)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
