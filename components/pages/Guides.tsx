'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import GuideCalendar from '@/components/guides/GuideCalendar';
import { useStore } from '@/hooks/useStore';
import type { Guide } from '@/lib/types';

const REG_COLORS: Record<string, string> = { North: 'bdg-g', Central: 'bdg-a', South: 'bdg-b' };
const STATUS_C: Record<string, string> = {
  Available: 'bdg-g',
  'On Tour': 'bdg-b',
  Standby: 'bdg-a',
  Unavailable: 'bdg-r',
};

type GuideTab = 'roster' | 'bios' | 'calendar';

const emptyGuide = (): Partial<Guide> => ({
  id: '',
  fullname: '',
  ename: '',
  region: 'North',
  location: '',
  status: 'Available',
  phone: '',
  email: '',
  langs: 'EN',
  specialty: '',
  years: 0,
  rate: 0,
  license: 'National',
  rating: '★★★★',
  shirtSize: '',
  bankAccount: '',
  address: '',
  bio: '',
  photo: '',
  reviews: [],
});

export default function Guides() {
  const guides = useStore((s) => s.guides);
  const addGuide = useStore((s) => s.addGuide);
  const updateGuide = useStore((s) => s.updateGuide);

  const [tab, setTab] = useState<GuideTab>('roster');
  const [search, setSearch] = useState('');
  const [regionF, setRegionF] = useState('');
  const [langF, setLangF] = useState('');
  const [bioGuide, setBioGuide] = useState<Guide | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Guide>>(emptyGuide());

  const filtered = useMemo(
    () =>
      guides.filter((g) => {
        if (regionF && g.region !== regionF) return false;
        if (langF && !g.langs.toLowerCase().includes(langF.toLowerCase())) return false;
        if (
          search &&
          !g.fullname.toLowerCase().includes(search.toLowerCase()) &&
          !g.ename.toLowerCase().includes(search.toLowerCase()) &&
          !g.specialty.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [guides, search, regionF, langF]
  );

  const available = guides.filter((g) => g.status === 'Available').length;
  const onTour = guides.filter((g) => g.status === 'On Tour').length;

  const openAdd = (g?: Guide) => {
    if (g) {
      setEditId(g.id);
      setForm({ ...g });
    } else {
      setEditId(null);
      setForm(emptyGuide());
    }
    setShowAdd(true);
  };

  const saveGuide = () => {
    if (!form.fullname || !form.id) {
      alert('Guide ID and Full Name are required.');
      return;
    }
    const payload = form as Guide;
    if (editId) updateGuide(editId, payload);
    else addGuide(payload);
    setShowAdd(false);
  };

  return (
    <div>
      <div className="pt-banner">
        <span style={{ fontSize: 12.5, color: 'var(--gd)' }}>
          📋 <b>Post-tour?</b> Log guide reports and debrief here:
        </span>
        <Link href="/posttour" className="btn btn-p btn-sm">
          → Guide Report Form
        </Link>
        <Link href="/posttour" className="btn btn-s btn-sm">
          → Ops Debrief Form
        </Link>
        <Link href="/attractions" className="btn btn-s btn-sm">
          🏛 Attraction Schedule
        </Link>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 'roster' ? ' on' : ''}`} onClick={() => setTab('roster')} role="button" tabIndex={0}>
          Guide Roster
        </div>
        <div className={`tab${tab === 'bios' ? ' on' : ''}`} onClick={() => setTab('bios')} role="button" tabIndex={0}>
          Bio Cards
        </div>
        <div className={`tab${tab === 'calendar' ? ' on' : ''}`} onClick={() => setTab('calendar')} role="button" tabIndex={0}>
          📅 Availability Calendar
        </div>
      </div>

      {tab === 'roster' && (
        <>
          <div className="search-row">
            <input placeholder="Search guides..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
            <select value={regionF} onChange={(e) => setRegionF(e.target.value)}>
              <option value="">All Regions</option>
              <option>North</option>
              <option>Central</option>
              <option>South</option>
            </select>
            <select value={langF} onChange={(e) => setLangF(e.target.value)}>
              <option value="">All Languages</option>
              <option>English</option>
              <option>French</option>
              <option>German</option>
            </select>
            <div style={{ flex: 1 }} />
            <button className="btn btn-s btn-sm" type="button" onClick={() => setTab('bios')}>
              View Bio Cards →
            </button>
            <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd()}>
              ＋ Add Guide
            </button>
          </div>

          <div className="guides-kpi-bar">
            <div className="guides-kpi-item">
              <div className="guides-kpi-l">Total Guides</div>
              <div className="guides-kpi-v">{guides.length}</div>
            </div>
            <div className="guides-kpi-item">
              <div className="guides-kpi-l">Available</div>
              <div className="guides-kpi-v" style={{ color: 'var(--g)' }}>
                {available}
              </div>
            </div>
            <div className="guides-kpi-item">
              <div className="guides-kpi-l">On Tour</div>
              <div className="guides-kpi-v" style={{ color: 'var(--blue)' }}>
                {onTour}
              </div>
            </div>
            <div className="guides-kpi-item">
              <div className="guides-kpi-l">Shown</div>
              <div className="guides-kpi-v">{filtered.length}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Guide ID</th>
                    <th>Full Name / City</th>
                    <th>Display Name</th>
                    <th>Region</th>
                    <th>Languages</th>
                    <th>Specialty</th>
                    <th>Experience</th>
                    <th>Day Rate</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{g.id}</code>
                      </td>
                      <td>
                        <b>{g.fullname}</b>
                        <div style={{ fontSize: 10.5, color: 'var(--m)' }}>{g.location}</div>
                      </td>
                      <td>{g.ename}</td>
                      <td>
                        <span className={`bdg ${REG_COLORS[g.region] || 'bdg-w'}`}>{g.region}</span>
                      </td>
                      <td>{g.langs}</td>
                      <td style={{ fontSize: 12 }}>{g.specialty}</td>
                      <td>
                        <span style={{ color: 'var(--g)', fontWeight: 600 }}>✓</span> {g.license}
                        {g.years ? <div style={{ fontSize: 10.5, color: 'var(--m)' }}>{g.years} yrs</div> : null}
                      </td>
                      <td style={{ fontWeight: 600, color: g.rate > 0 ? 'var(--g)' : 'var(--m)' }}>{g.rate > 0 ? `$${g.rate}/day` : 'TBD'}</td>
                      <td style={{ color: 'var(--gold)' }}>{g.rating}</td>
                      <td>
                        <span className={`bdg ${STATUS_C[g.status] || 'bdg-w'}`}>{g.status}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-s btn-sm" type="button" onClick={() => setBioGuide(g)}>
                          👤 Profile
                        </button>
                        <button className="btn btn-s btn-sm" type="button" style={{ marginLeft: 4 }} onClick={() => openAdd(g)}>
                          ✏ Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'bios' && (
        <div className="guide-bio-grid">
          {filtered.map((g) => (
            <div key={g.id} className="guide-bio-card" onClick={() => setBioGuide(g)} role="button" tabIndex={0}>
              <div className="guide-bio-avatar" style={{ background: g.region === 'North' ? 'var(--g)' : g.region === 'Central' ? 'var(--amb)' : 'var(--blue)' }}>
                {g.ename.slice(0, 2).toUpperCase()}
              </div>
              <div className="guide-bio-name">{g.fullname}</div>
              <div className="guide-bio-sub">
                {g.ename} · {g.region}
              </div>
              <div className="guide-bio-specialty">{g.specialty}</div>
              <div className="guide-bio-meta">
                <span className={`bdg ${STATUS_C[g.status] || 'bdg-w'}`}>{g.status}</span>
                <span className="guide-bio-rating">{g.rating}</span>
                {g.rate > 0 && <span className="guide-bio-rate">${g.rate}/day</span>}
              </div>
              {g.bio && g.bio.length > 0 && (
                <div className="guide-bio-snippet">{g.bio.length > 120 ? `${g.bio.slice(0, 120)}…` : g.bio}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'calendar' && <GuideCalendar />}

      {bioGuide && (
        <div className="overlay open" onClick={() => setBioGuide(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 680, padding: 0, overflow: 'hidden' }}>
            <div className="modal-hd modal-hd-green">
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{bioGuide.fullname}</div>
                <div style={{ fontSize: 12, opacity: 0.85, color: '#fff' }}>
                  {bioGuide.ename} · {bioGuide.region} · {bioGuide.rating}
                </div>
              </div>
              <button className="modal-close-btn" type="button" onClick={() => setBioGuide(null)}>
                ✕
              </button>
            </div>
            <div style={{ padding: 20, fontSize: 13, lineHeight: 1.7 }}>
              <p>{bioGuide.bio}</p>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--m)' }}>
                📞 {bioGuide.phone} · ✉ {bioGuide.email} · {bioGuide.langs}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="overlay open" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 700, maxHeight: '92vh', overflow: 'auto' }}>
            <div className="modal-hd modal-hd-green">
              <span style={{ color: '#fff', fontWeight: 700 }}>{editId ? '✏ Edit Guide' : '＋ Add New Guide'}</span>
              <button className="modal-close-btn" type="button" onClick={() => setShowAdd(false)}>
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="fg">
                  <label className="lbl">Guide ID *</label>
                  <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="G-N06" disabled={!!editId} />
                </div>
                <div className="fg">
                  <label className="lbl">Full Name *</label>
                  <input value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">English Name</label>
                  <input value={form.ename} onChange={(e) => setForm({ ...form, ename: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="fg">
                  <label className="lbl">Region</label>
                  <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                    <option>North</option>
                    <option>Central</option>
                    <option>South</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">City / Base</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Available</option>
                    <option>On Tour</option>
                    <option>Standby</option>
                    <option>Unavailable</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                <div className="fg">
                  <label className="lbl">Languages</label>
                  <input value={form.langs} onChange={(e) => setForm({ ...form, langs: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Specialty</label>
                  <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Years Exp.</label>
                  <input type="number" value={form.years || ''} onChange={(e) => setForm({ ...form, years: +e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Day Rate (USD)</label>
                  <input type="number" value={form.rate || ''} onChange={(e) => setForm({ ...form, rate: +e.target.value })} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Biography</label>
                <textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--b)', paddingTop: 12 }}>
                <button className="btn btn-s" type="button" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button className="btn btn-p" type="button" onClick={saveGuide}>
                  ✔ Save Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
