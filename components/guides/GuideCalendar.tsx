'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import type { CalEvent, Guide } from '@/lib/types';

const CAL_STATUS: Record<string, { cls: string; emoji: string; label: string }> = {
  booked: { cls: 'booked', emoji: '🩵', label: 'Booked' },
  ontour: { cls: 'ontour', emoji: '🔵', label: 'On Tour' },
  standby: { cls: 'standby', emoji: '🟡', label: 'Standby' },
  unavailable: { cls: 'unavailable', emoji: '🔴', label: 'Unavailable' },
  training: { cls: 'training', emoji: '🟣', label: 'Training' },
};

const REG_COLORS: Record<string, string> = { North: '#2E7D52', Central: '#856404', South: '#1565C0' };

const emptyEvent = {
  guideId: '',
  bookingCode: '',
  tour: '',
  clients: '',
  start: '',
  end: '',
  status: 'booked',
  notes: '',
};

export default function GuideCalendar() {
  const guides = useStore((s) => s.guides);
  const calEvents = useStore((s) => s.calEvents) as CalEvent[];
  const addCalEvent = useStore((s) => s.addCalEvent);
  const removeCalEvent = useStore((s) => s.removeCalEvent);

  const [calDate, setCalDate] = useState(() => new Date());
  const [guideF, setGuideF] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyEvent);

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredGuides = useMemo(() => guides.filter((g) => !guideF || g.id === guideF), [guides, guideF]);

  const dayHeaders = useMemo(() => {
    const headers = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const dow = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dt.getDay()];
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      headers.push({ d, dow, dateStr, isWeekend: dt.getDay() === 0 || dt.getDay() === 6, isToday: dateStr === todayStr });
    }
    return headers;
  }, [year, month, daysInMonth, todayStr]);

  const nav = (dir: number) => setCalDate(new Date(year, month + dir, 1));
  const goToday = () => setCalDate(new Date());

  const openAdd = () => {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    setForm({ ...emptyEvent, start: ds, end: ds });
    setShowAdd(true);
  };

  const saveEvent = () => {
    if (!form.guideId || !form.clients || !form.start || !form.end) {
      alert('Please fill in Guide, Guests, Start and End dates.');
      return;
    }
    if (form.end < form.start) {
      alert('End date must be after start date.');
      return;
    }
    addCalEvent({ id: `CE-${Date.now()}`, ...form });
    setShowAdd(false);
    setForm(emptyEvent);
  };

  const editEvent = (ev: CalEvent) => {
    const g = guides.find((x) => x.id === ev.guideId);
    const st = CAL_STATUS[ev.status] || CAL_STATUS.ontour;
    const info = `Guide: ${g?.fullname || ev.guideId} | Tour: ${ev.tour} | ${ev.start} to ${ev.end} | ${st.label}`;
    if (confirm(`${info}\n\nDelete this event?`)) removeCalEvent(ev.id);
  };

  return (
    <div className="guide-cal-wrap">
      <div className="guide-cal-controls">
        <div className="guide-cal-nav">
          <button type="button" onClick={() => nav(-1)}>
            ‹
          </button>
          <span>
            {monthNames[month]} {year}
          </span>
          <button type="button" onClick={() => nav(1)}>
            ›
          </button>
        </div>
        <button className="btn btn-s btn-sm" type="button" onClick={goToday}>
          Today
        </button>
        <select value={guideF} onChange={(e) => setGuideF(e.target.value)}>
          <option value="">All Guides</option>
          {guides.map((g) => (
            <option key={g.id} value={g.id}>
              {g.ename} — {g.specialty}
            </option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-p btn-sm" type="button" onClick={openAdd}>
          + Log Tour / Booking
        </button>
      </div>

      <div className="guide-cal-legend">
        <span className="guide-cal-legend-label">Legend:</span>
        <span className="guide-cal-legend-item guide-cal-leg-avail">🟢 Available</span>
        <span className="guide-cal-legend-item guide-cal-leg-booked">🩵 Booked</span>
        <span className="guide-cal-legend-item guide-cal-leg-ontour">🔵 On Tour</span>
        <span className="guide-cal-legend-item guide-cal-leg-standby">🟡 Standby</span>
        <span className="guide-cal-legend-item guide-cal-leg-unavail">🔴 Unavailable</span>
        <span className="guide-cal-legend-item guide-cal-leg-training">🟣 Training</span>
      </div>

      <div className="guide-cal-grid-wrap">
        <table className="cal-grid-table">
          <thead>
            <tr>
              <th className="guide-col">Guide</th>
              {dayHeaders.map((dh) => (
                <th key={dh.dateStr} className={dh.isToday ? 'today-col' : ''}>
                  <div>{dh.dow}</div>
                  <div>{dh.d}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredGuides.map((g) => {
              const gEvents = calEvents.filter((e) => e.guideId === g.id);
              const avatarBg = REG_COLORS[g.region] || '#2E7D52';
              return (
                <tr key={g.id}>
                  <td className="guide-name-col">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div className="guide-cal-avatar" style={{ background: avatarBg }}>
                        {g.ename.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{g.ename}</div>
                        <div style={{ fontSize: 10, color: 'var(--m)' }}>{g.region}</div>
                      </div>
                    </div>
                  </td>
                  {dayHeaders.map((dh) => {
                    const dayEvents = gEvents.filter((e) => dh.dateStr >= e.start && dh.dateStr <= e.end);
                    const todayCls = dh.isToday ? ' today-col' : dh.isWeekend ? ' weekend-col' : '';
                    return (
                      <td key={dh.dateStr} className={todayCls.trim()}>
                        {dayEvents.length
                          ? dayEvents.map((ev) => {
                              const st = CAL_STATUS[ev.status] || CAL_STATUS.ontour;
                              const dispCode = ev.bookingCode || ev.tour || '';
                              const showLabel = ev.start === dh.dateStr;
                              return (
                                <div
                                  key={ev.id}
                                  className={`cal-event ${st.cls}`}
                                  title={[ev.bookingCode, ev.tour, ev.clients].filter(Boolean).join(' | ')}
                                  onClick={() => editEvent(ev)}
                                  role="button"
                                  tabIndex={0}
                                >
                                  {showLabel ? `${st.emoji} ${dispCode.slice(0, 14)}` : ''}
                                </div>
                              );
                            })
                          : <div className="cal-avail-dot" />}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="guide-cal-hint">💡 Click any event to delete · Green dots = Available · Click &quot;+ Log Tour&quot; to add a booking</div>

      {showAdd && (
        <div className="overlay open" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 500 }}>
            <div className="modal-hd">
              <span>📅 Log Tour / Booking Event</span>
              <button className="modal-close-btn" type="button" onClick={() => setShowAdd(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <div className="fg">
                <label className="lbl">Guide *</label>
                <select value={form.guideId} onChange={(e) => setForm({ ...form, guideId: e.target.value })}>
                  <option value="">Select guide…</option>
                  {guides.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.fullname} ({g.ename})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="fg">
                  <label className="lbl">Booking Code</label>
                  <input placeholder="BK-2026-001" value={form.bookingCode} onChange={(e) => setForm({ ...form, bookingCode: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Tour Name</label>
                  <input placeholder="Vietnam Full 12D" value={form.tour} onChange={(e) => setForm({ ...form, tour: e.target.value })} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Guests (names + pax) *</label>
                <input placeholder="James & Sarah Miller, 2 pax" value={form.clients} onChange={(e) => setForm({ ...form, clients: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="fg">
                  <label className="lbl">Start Date *</label>
                  <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">End Date *</label>
                  <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="booked">🩵 Booked (Confirmed, not departed)</option>
                  <option value="ontour">🔵 On Tour</option>
                  <option value="standby">🟡 Standby</option>
                  <option value="unavailable">🔴 Unavailable</option>
                  <option value="training">🟣 Training</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Notes</label>
                <input placeholder="Special notes…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button className="btn btn-s" type="button" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button className="btn btn-p" type="button" onClick={saveEvent}>
                  Save Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
