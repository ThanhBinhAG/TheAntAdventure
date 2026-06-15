'use client';

import { useMemo, useState } from 'react';
import { ATTRACTION_DATA } from '@/lib/seeds/attractions';

const REG_GROUPS: Record<string, string> = {
  north: '🏔 Northern Vietnam',
  central: '🏯 Central Vietnam',
  south: '🌿 Southern Vietnam',
};

const REG_COLORS: Record<string, [string, string]> = {
  north: ['#E8F5EE', '#1a5c38'],
  central: ['#FFF3CD', '#856404'],
  south: ['#E1F0FF', '#0c5464'],
};

export default function Attractions() {
  const [region, setRegion] = useState('');
  const [typeF, setTypeF] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ATTRACTION_DATA.filter((a) => {
      if (region && a.region !== region) return false;
      if (typeF && a.type !== typeF) return false;
      if (q && !a.name.toLowerCase().includes(q) && !a.dest.toLowerCase().includes(q) && !a.notes.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [region, typeF, search]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const closedToday = filtered.filter((a) => a.closed.toUpperCase().includes(today.toUpperCase().slice(0, 3)));

  const regions = region ? [region] : (['north', 'central', 'south'] as const);

  return (
    <div>
      <div className="att-toolbar">
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All Regions</option>
          <option value="north">🏔 Northern Vietnam</option>
          <option value="central">🏯 Central Vietnam</option>
          <option value="south">🌿 Southern Vietnam</option>
        </select>
        <select value={typeF} onChange={(e) => setTypeF(e.target.value)}>
          <option value="">All Types</option>
          <option value="museum">🏛 Museum</option>
          <option value="heritage">🏯 Heritage Site</option>
          <option value="temple">🛕 Temple / Pagoda</option>
          <option value="landmark">📍 Landmark</option>
          <option value="nature">🌿 Nature Site</option>
        </select>
        <input placeholder="Search attractions..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
        <div style={{ flex: 1 }} />
        {closedToday.length > 0 && (
          <div className="att-alert-bar">
            ⚠ Today is {today}. Closed: {closedToday.map((a) => a.name).join(', ')}
          </div>
        )}
      </div>

      <div id="att-grid">
        {regions.map((r) => {
          const ra = filtered.filter((a) => a.region === r);
          if (!ra.length) return null;
          const [rbg, rfg] = REG_COLORS[r] || ['#f5f5f5', '#333'];
          return (
            <div key={r} className="att-region-block">
              <div className="att-region-hd">
                <span className="att-region-badge" style={{ background: rbg, color: rfg }}>
                  {REG_GROUPS[r]}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--m)', marginLeft: 10 }}>{ra.length} attractions</span>
              </div>
              <div className="card">
                <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Destination</th>
                        <th>Type</th>
                        <th>Hours</th>
                        <th>Closed</th>
                        <th>Admission</th>
                        <th>Visit Time</th>
                        <th>Best Time</th>
                        <th>Crowd Tips</th>
                        <th>Book?</th>
                        <th>Seasonal Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ra.map((a) => {
                        const hasAlert = a.alert && (a.alert.includes('CLOSED') || a.alert.includes('BOOK'));
                        return (
                          <tr key={a.id} style={{ background: hasAlert ? 'var(--red-l)' : undefined }}>
                            <td>
                              <b style={{ fontSize: 12.5 }}>{a.name}</b>
                              {a.alert && (
                                <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>⚠ {a.alert}</div>
                              )}
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>{a.dest}</td>
                            <td>
                              <span className="att-type-pill">{a.type}</span>
                            </td>
                            <td style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>{a.hours}</td>
                            <td style={{ color: 'var(--red)', fontWeight: 600, fontSize: 11.5 }}>{a.closed}</td>
                            <td style={{ fontSize: 11.5 }}>{a.admission}</td>
                            <td style={{ fontSize: 11.5 }}>{a.duration} min</td>
                            <td style={{ fontSize: 11.5, color: 'var(--m)' }}>{a.best_time}</td>
                            <td style={{ fontSize: 11.5, color: 'var(--m)', maxWidth: 160 }}>{a.crowd}</td>
                            <td style={{ textAlign: 'center' }}>{a.book_req ? '✅ Yes' : '—'}</td>
                            <td style={{ fontSize: 11, color: 'var(--m)', maxWidth: 180 }}>{a.seasonal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--m)', padding: 40 }}>No attractions found.</div>}
      </div>
    </div>
  );
}
