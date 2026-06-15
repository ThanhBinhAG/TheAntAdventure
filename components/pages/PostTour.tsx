'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/hooks/useStore';

type PtTab = 'log' | 'ops' | 'guide' | 'client' | 'agent';

type Feedback = {
  id?: string;
  type?: string;
  date?: string;
  bkid?: string;
  client?: string;
  tour?: string;
  nps?: number;
  overall?: string;
  guide_r?: string;
  hotel_r?: string;
  best?: string;
  improve?: string;
  comments?: string;
  again?: string;
};

const TYPE_LABELS: Record<string, string> = {
  client: 'Client Survey',
  guide: 'Guide Report',
  ops: 'Ops Debrief',
  agent: 'Agent Feedback',
};

export default function PostTour() {
  const feedback = useStore((s) => s.feedback) as Feedback[];
  const addFeedback = useStore((s) => s.addFeedback);
  const [tab, setTab] = useState<PtTab>('log');
  const [typeF, setTypeF] = useState('');
  const [npsF, setNpsF] = useState('');
  const [npsSelected, setNpsSelected] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return feedback.filter((f) => {
      if (typeF && f.type !== typeF) return false;
      if (npsF === 'promoter' && (f.nps || 0) < 9) return false;
      if (npsF === 'passive' && ((f.nps || 0) < 7 || (f.nps || 0) > 8)) return false;
      if (npsF === 'detractor' && (f.nps || 0) > 6) return false;
      return true;
    });
  }, [feedback, typeF, npsF]);

  const avgNps = feedback.length ? feedback.reduce((s, f) => s + (f.nps || 0), 0) / feedback.length : 0;
  const promoters = feedback.filter((f) => (f.nps || 0) >= 9).length;
  const detractors = feedback.filter((f) => (f.nps || 0) <= 6).length;

  const saveClientSurvey = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    addFeedback({
      id: `FB-${Date.now()}`,
      type: 'client',
      date: String(fd.get('date') || new Date().toISOString().slice(0, 10)),
      bkid: fd.get('bkid'),
      client: fd.get('client'),
      nps: npsSelected ?? 9,
      overall: fd.get('overall'),
      guide_r: fd.get('guide_r'),
      hotel_r: fd.get('hotel_r'),
      best: fd.get('best'),
      improve: fd.get('improve'),
      comments: fd.get('comments'),
      again: fd.get('again'),
    });
    setTab('log');
    setNpsSelected(null);
    form.reset();
  };

  return (
    <div>
      <div className="tabs">
        {(
          [
            ['log', '📋 Feedback Log'],
            ['ops', '🔧 Ops Debrief'],
            ['guide', '🧭 Guide Report'],
            ['client', '⭐ Client Survey'],
            ['agent', '🤝 Agent Feedback'],
          ] as const
        ).map(([id, label]) => (
          <div key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} role="button" tabIndex={0}>
            {label}
          </div>
        ))}
      </div>

      {tab === 'log' && (
        <>
          <div className="pt-log-filters">
            <select value={typeF} onChange={(e) => setTypeF(e.target.value)}>
              <option value="">All Types</option>
              <option value="client">Client Survey</option>
              <option value="guide">Guide Report</option>
              <option value="ops">Ops Debrief</option>
              <option value="agent">Agent Feedback</option>
            </select>
            <select value={npsF} onChange={(e) => setNpsF(e.target.value)}>
              <option value="">All NPS</option>
              <option value="promoter">Promoter (9–10)</option>
              <option value="passive">Passive (7–8)</option>
              <option value="detractor">Detractor (0–6)</option>
            </select>
            <div style={{ flex: 1 }} />
            <div className="pt-nps-summary">
              <span>
                Avg NPS: <b style={{ color: 'var(--g)' }}>{avgNps.toFixed(1)}</b>
              </span>
              <span>
                Promoters: <b>{promoters}</b>
              </span>
              <span>
                Detractors: <b style={{ color: 'var(--red)' }}>{detractors}</b>
              </span>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Submitted</th>
                    <th>NPS</th>
                    <th>Overall</th>
                    <th>Highlights</th>
                    <th>Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f, i) => (
                    <tr key={f.id || i}>
                      <td>
                        <code>{f.bkid}</code>
                      </td>
                      <td>
                        <b>{f.client}</b>
                      </td>
                      <td>
                        <span className="bdg bdg-w">{TYPE_LABELS[f.type || 'client'] || f.type}</span>
                      </td>
                      <td style={{ color: 'var(--m)', fontSize: 12 }}>{f.date}</td>
                      <td>
                        <span className={`bdg ${(f.nps || 0) >= 9 ? 'bdg-g' : (f.nps || 0) >= 7 ? 'bdg-b' : 'bdg-a'}`}>{f.nps ?? '—'}</span>
                      </td>
                      <td>{f.overall ? `${f.overall}/5` : '—'}</td>
                      <td style={{ maxWidth: 200, fontSize: 12 }}>{f.best?.slice(0, 80) || '—'}</td>
                      <td style={{ maxWidth: 160, fontSize: 12, color: 'var(--red)' }}>{f.improve?.slice(0, 60) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'ops' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🔧 Operations Post-Tour Debrief</span>
          </div>
          <div className="card-body">
            <div className="pt-form-grid-3">
              <div className="fg">
                <label className="lbl">Booking Reference *</label>
                <input name="bkid" placeholder="BK-2026-001" />
              </div>
              <div className="fg">
                <label className="lbl">Tour Name</label>
                <input placeholder="Vietnam Full 12D" />
              </div>
              <div className="fg">
                <label className="lbl">Lead Guide</label>
                <input placeholder="Minh N." />
              </div>
            </div>
            <div className="pt-form-grid-2">
              <div className="fg">
                <label className="lbl">What went well ✓</label>
                <textarea style={{ minHeight: 90 }} placeholder="Hotels exceeded expectations..." />
              </div>
              <div className="fg">
                <label className="lbl">Issues encountered ✗</label>
                <textarea style={{ minHeight: 90 }} placeholder="Transfer delay on Day 3..." />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
              <button className="btn btn-s" type="button" onClick={() => setTab('log')}>
                Cancel
              </button>
              <button className="btn btn-p" type="button" onClick={() => { addFeedback({ id: `FB-${Date.now()}`, type: 'ops', date: new Date().toISOString().slice(0, 10) }); setTab('log'); }}>
                ✓ Save Debrief
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'guide' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🧭 Post-Tour Guide Report</span>
          </div>
          <div className="card-body">
            <div className="pt-form-grid-3">
              <div className="fg">
                <label className="lbl">Booking Reference *</label>
                <input placeholder="BK-2026-001" />
              </div>
              <div className="fg">
                <label className="lbl">Guide Name</label>
                <input placeholder="Minh N." />
              </div>
              <div className="fg">
                <label className="lbl">Tour Name</label>
                <input placeholder="Vietnam Full 12D" />
              </div>
            </div>
            <div className="pt-form-grid-2">
              <div className="fg">
                <label className="lbl">Client highlights</label>
                <textarea style={{ minHeight: 90 }} />
              </div>
              <div className="fg">
                <label className="lbl">Client complaints</label>
                <textarea style={{ minHeight: 90 }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
              <button className="btn btn-s" type="button" onClick={() => setTab('log')}>
                Cancel
              </button>
              <button className="btn btn-p" type="button" onClick={() => { addFeedback({ id: `FB-${Date.now()}`, type: 'guide', date: new Date().toISOString().slice(0, 10) }); setTab('log'); }}>
                ✓ Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'client' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">⭐ Client Satisfaction Survey</span>
            <span style={{ fontSize: 11.5, color: 'var(--m)' }}>Sent D+2 after tour</span>
          </div>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveClientSurvey(e.currentTarget);
              }}
            >
              <div className="pt-form-grid-3">
                <div className="fg">
                  <label className="lbl">Booking Reference *</label>
                  <input name="bkid" required placeholder="BK-2026-001" />
                </div>
                <div className="fg">
                  <label className="lbl">Client Name</label>
                  <input name="client" placeholder="James & Sarah Miller" />
                </div>
                <div className="fg">
                  <label className="lbl">Submission Date</label>
                  <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
              </div>
              <div className="nps-block">
                <div className="nps-title">NPS — Net Promoter Score</div>
                <div style={{ fontSize: 12.5, color: 'var(--m)', marginBottom: 8 }}>How likely are you to recommend The Ant Adventures? (0–10)</div>
                <div className="nps-buttons">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button key={n} type="button" className={`nps-btn${npsSelected === n ? ' on' : ''}`} onClick={() => setNpsSelected(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-form-grid-3">
                <div className="fg">
                  <label className="lbl">Overall Experience</label>
                  <select name="overall" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {'★'.repeat(n)} ({n})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Guide Rating</label>
                  <select name="guide_r" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Hotel Rating</label>
                  <select name="hotel_r" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-form-grid-2">
                <div className="fg">
                  <label className="lbl">Best moments</label>
                  <textarea name="best" style={{ minHeight: 90 }} />
                </div>
                <div className="fg">
                  <label className="lbl">What could improve?</label>
                  <textarea name="improve" style={{ minHeight: 90 }} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Other comments</label>
                <textarea name="comments" style={{ minHeight: 70 }} />
              </div>
              <div className="fg">
                <label className="lbl">Would you travel with us again?</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <label>
                    <input type="radio" name="again" value="yes" defaultChecked /> Yes
                  </label>
                  <label>
                    <input type="radio" name="again" value="maybe" /> Maybe
                  </label>
                  <label>
                    <input type="radio" name="again" value="no" /> Not likely
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
                <button className="btn btn-s" type="button" onClick={() => setTab('log')}>
                  Cancel
                </button>
                <button className="btn btn-p" type="submit">
                  ✓ Save Survey
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'agent' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🤝 B2B Agent Feedback Form</span>
          </div>
          <div className="card-body">
            <div className="pt-form-grid-3">
              <div className="fg">
                <label className="lbl">Agent Name *</label>
                <input placeholder="Virtuoso — Smith Travel" />
              </div>
              <div className="fg">
                <label className="lbl">Booking Reference</label>
                <input placeholder="BK-2026-001" />
              </div>
              <div className="fg">
                <label className="lbl">Overall Rating (1–5)</label>
                <select defaultValue="5">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="fg">
              <label className="lbl">Agent feedback & commission notes</label>
              <textarea style={{ minHeight: 100 }} placeholder="Service quality, communication, would book again..." />
            </div>
            <div className="info-bar" style={{ marginTop: 12 }}>
              Agent commission paid within 14 days of tour completion per B2B policy.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
              <button className="btn btn-p" type="button" onClick={() => { addFeedback({ id: `FB-${Date.now()}`, type: 'agent', date: new Date().toISOString().slice(0, 10) }); setTab('log'); }}>
                ✓ Save Agent Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
