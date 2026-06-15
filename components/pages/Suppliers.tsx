'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ExtSupplierCard from '@/components/suppliers/ExtSupplierCard';
import { AA_HOTELS } from '@/lib/seeds/hotels';
import { useStore } from '@/hooks/useStore';
import type { ExtendedSupplier } from '@/lib/types';

type SupTab = 'hotels' | 'cruises' | 'transport' | 'restaurants' | 'logistics' | 'water' | 'adventure' | 'experience' | 'personnel' | 'custom';

const TABS: { id: SupTab; label: string }[] = [
  { id: 'hotels', label: '🏨 Hotels' },
  { id: 'cruises', label: '⛵ Cruises' },
  { id: 'transport', label: '🚐 Transport' },
  { id: 'restaurants', label: '🍜 Restaurants' },
  { id: 'logistics', label: '✈️ Logistics & Immigration' },
  { id: 'water', label: '🚤 Water Transport' },
  { id: 'adventure', label: '🧗 Adventure & Equipment' },
  { id: 'experience', label: '🎭 High-End Experiences' },
  { id: 'personnel', label: '👥 Personnel & Safety' },
  { id: 'custom', label: '📌 Custom Categories' },
];

const REG_BADGE: Record<string, string> = { north: '🏔 North', central: '🏯 Central', south: '🌿 South' };

const emptyAddForm = {
  name: '',
  ename: '',
  phone: '',
  email: '',
  location: '',
  region: 'national',
  rate: '',
  desc: '',
  notes: '',
  subcat: '',
  cat: 'visa',
  contract: 'verbal',
  status: 'Active',
  tags: [] as string[],
};

function filterExt(
  items: ExtendedSupplier[],
  cats: string[],
  search: string,
  region: string,
  tier: string
) {
  const q = search.toLowerCase();
  return items.filter(
    (s) =>
      cats.includes(s.cat) &&
      (!q || s.name.toLowerCase().includes(q) || (s.desc || '').toLowerCase().includes(q) || (s.location || '').toLowerCase().includes(q)) &&
      (!region || s.region === region) &&
      (!tier || (s.tags || []).some((t) => t.toLowerCase() === tier))
  );
}

function ExtGrid({
  cats,
  items,
  onDelete,
}: {
  cats: string[];
  items: ExtendedSupplier[];
  onDelete: (id: string) => void;
}) {
  const filtered = items.filter((s) => cats.includes(s.cat));
  if (!filtered.length) {
    return (
      <div className="sup-empty-grid">
        <p>No suppliers found. Add one using the button above.</p>
      </div>
    );
  }
  return (
    <div className="sup-ext-grid">
      {filtered.map((s) => (
        <ExtSupplierCard key={s.id} supplier={s} onDelete={onDelete} />
      ))}
    </div>
  );
}

export default function Suppliers() {
  const cruises = useStore((s) => s.cruises) as { id?: string; name?: string; route?: string; cabins?: string; rate?: string; valid?: string; rating?: string }[];
  const transport = useStore((s) => s.transport) as { id?: string; name?: string; region?: string; vehicles?: string; rate?: string; notes?: string }[];
  const restaurants = useStore((s) => s.restaurants) as { id?: string; name?: string; city?: string; cuisine?: string; set?: string; cap?: number; rating?: string }[];
  const specialSuppliers = useStore((s) => s.specialSuppliers) as ExtendedSupplier[];
  const addSpecialSupplier = useStore((s) => s.addSpecialSupplier);
  const removeSpecialSupplier = useStore((s) => s.removeSpecialSupplier);

  const [tab, setTab] = useState<SupTab>('hotels');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [tier, setTier] = useState('');
  const [hotelRegion, setHotelRegion] = useState('');
  const [hotelQ, setHotelQ] = useState('');
  const [logSub, setLogSub] = useState<'visa' | 'fasttrack' | 'aviation'>('visa');
  const [advSub, setAdvSub] = useState<'cycling' | 'trekking' | 'wildlife'>('cycling');
  const [expSub, setExpSub] = useState<'artisan' | 'wellness' | 'events'>('artisan');
  const [perSub, setPerSub] = useState<'specguide' | 'media' | 'safety'>('specguide');
  const [perLang, setPerLang] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);


  const extKpi = useMemo(() => {
    const total = specialSuppliers.length;
    const active = specialSuppliers.filter((s) => s.status === 'Active').length;
    const preferred = specialSuppliers.filter((s) => (s.tags || []).includes('Preferred')).length;
    return { total, active, preferred };
  }, [specialSuppliers]);

  const hotelsFiltered = useMemo(() => {
    const q = hotelQ.toLowerCase();
    return AA_HOTELS.filter((h) => {
      if (hotelRegion && h.region !== hotelRegion) return false;
      if (q && !h.name.toLowerCase().includes(q) && !h.dest.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [hotelQ, hotelRegion]);

  const openAdd = (preselect?: string) => {
    const catMap: Record<string, string> = {
      logistics: 'visa',
      water: 'river',
      adventure: 'cycling',
      experience: 'artisan',
      personnel: 'specguide',
    };
    setAddForm({ ...emptyAddForm, cat: preselect ? catMap[preselect] || preselect : 'visa' });
    setShowAdd(true);
  };

  const saveSupplier = () => {
    if (!addForm.name.trim() || !addForm.phone.trim() || !addForm.desc.trim()) {
      alert('Name, phone, and description are required.');
      return;
    }
    addSpecialSupplier({
      id: `NEW-${Date.now()}`,
      cat: addForm.cat,
      subcat: addForm.subcat || addForm.cat,
      name: addForm.name.trim(),
      ename: addForm.ename.trim() || addForm.name.trim(),
      phone: addForm.phone.trim(),
      email: addForm.email.trim(),
      location: addForm.location.trim(),
      region: addForm.region,
      rate: addForm.rate.trim(),
      currency: 'USD',
      payment: '',
      contract: addForm.contract,
      cancel: '',
      insurance: '',
      avail: '',
      desc: addForm.desc.trim(),
      notes: addForm.notes.trim(),
      tags: addForm.tags,
      rating: '★★★★',
      status: addForm.status,
    });
    setShowAdd(false);
    setAddForm(emptyAddForm);
  };

  const deleteExt = (id: string) => {
    if (confirm('Remove this supplier?')) removeSpecialSupplier(id);
  };

  const getExt = (cats: string[]) => {
    let items = filterExt(specialSuppliers, cats, search, region, tier);
    if (perLang && cats.includes('specguide')) {
      items = items.filter((s) => (s.subcat || '').includes(perLang));
    }
    return items;
  };

  return (
    <div className="sup-page">
      <div className="sup-top-bar">
        <input className="sup-search" placeholder="🔍  Search all suppliers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All Regions</option>
          <option value="north">🔵 Northern Vietnam</option>
          <option value="central">🟡 Central Vietnam</option>
          <option value="south">🟠 Southern Vietnam</option>
          <option value="national">🇻🇳 Nationwide</option>
        </select>
        <select value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="">All Tiers</option>
          <option value="luxury">💎 Luxury</option>
          <option value="premium">⭐ Premium</option>
          <option value="preferred">♥ Preferred</option>
        </select>
        <div style={{ flex: 1 }} />
        <div className="sup-kpi-strip">
          <div className="sup-kpi-pill">
            <div className="sup-kpi-pill-v">{extKpi.total}</div>
            <div className="sup-kpi-pill-l">Total Extended</div>
          </div>
          <div className="sup-kpi-pill">
            <div className="sup-kpi-pill-v">{extKpi.active}</div>
            <div className="sup-kpi-pill-l">Active</div>
          </div>
          <div className="sup-kpi-pill">
            <div className="sup-kpi-pill-v">{extKpi.preferred}</div>
            <div className="sup-kpi-pill-l">Preferred ♥</div>
          </div>
        </div>
        <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd()}>
          ＋ Add New Supplier
        </button>
      </div>

      <div className="tabs sup-tabs">
        {TABS.map((t) => (
          <div key={t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)} role="button" tabIndex={0}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'hotels' && (
        <>
          <div className="sup-hotel-bar">
            <select value={hotelRegion} onChange={(e) => setHotelRegion(e.target.value)}>
              <option value="">All Regions</option>
              <option value="north">Northern Vietnam</option>
              <option value="central">Central Vietnam</option>
              <option value="south">Southern Vietnam</option>
            </select>
            <input placeholder="Search hotels…" value={hotelQ} onChange={(e) => setHotelQ(e.target.value)} style={{ maxWidth: 200 }} />
            <div style={{ flex: 1 }} />
            <Link href="/attractions" className="btn btn-s btn-sm">
              🏛 Attraction Schedule
            </Link>
            <div className="sup-hotel-note">
              <b>{AA_HOTELS.length} hotels</b> · MUP = client rate · NET = cost · USD/rm/nt
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="tbl sup-hotel-tbl">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Hotel</th>
                    <th>Destination</th>
                    <th>Stars</th>
                    <th>Room Type</th>
                    <th className="sup-th sup-th-low">Low MUP</th>
                    <th className="sup-th sup-th-high">High MUP</th>
                    <th className="sup-th sup-th-fest">Festive MUP</th>
                    <th className="sup-th sup-th-peak">Peak MUP</th>
                    <th className="sup-th sup-th-low sup-th-net">Low NET</th>
                    <th className="sup-th sup-th-high sup-th-net">High NET</th>
                    <th className="sup-th sup-th-fest sup-th-net">Fest NET</th>
                    <th className="sup-th sup-th-peak sup-th-net">Peak NET</th>
                  </tr>
                </thead>
                <tbody>
                  {hotelsFiltered.map((h) =>
                    h.rooms.map((r, ri) => (
                      <tr key={`${h.id}-${ri}`}>
                        {ri === 0 && (
                          <>
                            <td rowSpan={h.rooms.length} style={{ verticalAlign: 'top', paddingTop: 12 }}>
                              <code style={{ fontSize: 10, color: 'var(--g)' }}>{h.id}</code>
                              <br />
                              <span className="sup-reg-badge">{REG_BADGE[h.region]}</span>
                            </td>
                            <td rowSpan={h.rooms.length} style={{ verticalAlign: 'top', paddingTop: 12 }}>
                              <b>{h.name}</b>
                              <br />
                              <span style={{ fontSize: 10.5, color: 'var(--m)' }}>{h.cat}</span>
                            </td>
                            <td rowSpan={h.rooms.length} style={{ verticalAlign: 'top', paddingTop: 12 }}>
                              {h.dest}
                            </td>
                            <td rowSpan={h.rooms.length} style={{ verticalAlign: 'top', paddingTop: 12, color: 'var(--gold)' }}>
                              {h.stars}
                            </td>
                          </>
                        )}
                        <td style={{ fontSize: 11.5 }}>
                          <b>{r.type}</b>
                          {r.view && (
                            <>
                              <br />
                              <span style={{ fontSize: 10, color: 'var(--m)' }}>{r.view}</span>
                            </>
                          )}
                          {r.sqm && (
                            <>
                              <br />
                              <span style={{ fontSize: 9.5, color: 'var(--m)' }}>{r.sqm}m²</span>
                            </>
                          )}
                        </td>
                        <td className="sup-td sup-td-low">${r.lm}</td>
                        <td className="sup-td sup-td-high">${r.hm}</td>
                        <td className="sup-td sup-td-fest">${r.fm}</td>
                        <td className="sup-td sup-td-peak">${r.pm}</td>
                        <td className="sup-td sup-td-net sup-td-low">${r.ln}</td>
                        <td className="sup-td sup-td-net sup-td-high">${r.hn}</td>
                        <td className="sup-td sup-td-net sup-td-fest">${r.fn}</td>
                        <td className="sup-td sup-td-net sup-td-peak">${r.pn}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'cruises' && (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cruise</th>
                  <th>Route</th>
                  <th>Cabin Types</th>
                  <th>Rate</th>
                  <th>Validity</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {cruises.map((c, i) => (
                  <tr key={c.id || i}>
                    <td>
                      <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{c.id}</code>
                    </td>
                    <td>
                      <b>{c.name}</b>
                    </td>
                    <td>{c.route}</td>
                    <td>{c.cabins}</td>
                    <td style={{ fontWeight: 600, color: 'var(--g)' }}>{c.rate}</td>
                    <td>{c.valid}</td>
                    <td style={{ color: 'var(--gold)' }}>{c.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'transport' && (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Company</th>
                  <th>Region</th>
                  <th>Vehicles</th>
                  <th>Day Rate</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {transport.map((t, i) => (
                  <tr key={t.id || i}>
                    <td>
                      <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{t.id}</code>
                    </td>
                    <td>
                      <b>{t.name}</b>
                    </td>
                    <td>{t.region}</td>
                    <td>{t.vehicles}</td>
                    <td style={{ fontWeight: 600, color: 'var(--g)' }}>{t.rate}</td>
                    <td style={{ color: 'var(--m)', fontSize: 12 }}>{t.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'restaurants' && (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Restaurant</th>
                  <th>City</th>
                  <th>Cuisine</th>
                  <th>Set Menu From</th>
                  <th>Capacity</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((r, i) => (
                  <tr key={r.id || i}>
                    <td>
                      <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{r.id}</code>
                    </td>
                    <td>
                      <b>{r.name}</b>
                    </td>
                    <td>{r.city}</td>
                    <td>{r.cuisine}</td>
                    <td style={{ fontWeight: 600, color: 'var(--g)' }}>{r.set}</td>
                    <td>{r.cap}</td>
                    <td style={{ color: 'var(--gold)' }}>{r.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'logistics' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['visa', '🪪 Visa Services'],
                  ['fasttrack', '⚡ Airport Fast Track'],
                  ['aviation', '✈️ Aviation'],
                ] as const
              ).map(([id, label]) => (
                <div key={id} className={`tab${logSub === id ? ' on' : ''}`} onClick={() => setLogSub(id)} role="button" tabIndex={0}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd('logistics')}>
              ＋ Add Logistics Supplier
            </button>
          </div>
          {logSub === 'visa' && (
            <>
              <div className="info-bar">Visa partners handle E-visa applications, urgent processing (24–48hr), and business multi-entry visas for all nationalities.</div>
              <ExtGrid cats={['visa']} items={getExt(['visa'])} onDelete={deleteExt} />
            </>
          )}
          {logSub === 'fasttrack' && (
            <>
              <div className="info-bar">
                Airport fast track covers VIP arrival/departure lanes, immigration assistance, and lounge access — sorted by region: <b>North (HAN/HPH)</b> · <b>Central (HUI/DAD)</b> · <b>South (SGN/CXR/PQC)</b>.
              </div>
              <ExtGrid cats={['fasttrack']} items={getExt(['fasttrack'])} onDelete={deleteExt} />
            </>
          )}
          {logSub === 'aviation' && (
            <>
              <div className="info-bar">Covers domestic scheduled airlines and private charter operators for helicopter, seaplane, and small fixed-wing aircraft.</div>
              <ExtGrid cats={['aviation']} items={getExt(['aviation'])} onDelete={deleteExt} />
            </>
          )}
        </>
      )}

      {tab === 'water' && (
        <>
          <div className="sup-sub-bar">
            <div className="info-bar" style={{ margin: 0, flex: 1 }}>
              Private boat charter suppliers: river sampans, coastal speedboats, and national park boats.
            </div>
            <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd('water')}>
              ＋ Add Water Supplier
            </button>
          </div>
          <ExtGrid cats={['river', 'coastal', 'park']} items={getExt(['river', 'coastal', 'park'])} onDelete={deleteExt} />
        </>
      )}

      {tab === 'adventure' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['cycling', '🚴 Cycling'],
                  ['trekking', '🥾 Trekking & Camping'],
                  ['wildlife', '🦅 Wildlife & Nature'],
                ] as const
              ).map(([id, label]) => (
                <div key={id} className={`tab${advSub === id ? ' on' : ''}`} onClick={() => setAdvSub(id)} role="button" tabIndex={0}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd('adventure')}>
              ＋ Add Adventure Supplier
            </button>
          </div>
          <div className="info-bar">
            {advSub === 'cycling' && 'Cycling suppliers: high-end road and mountain bikes, support vehicles, mobile maintenance crew.'}
            {advSub === 'trekking' && 'Trekking & camping gear rental: tents, sleeping bags, GPS trackers, portable radios, first-aid kits.'}
            {advSub === 'wildlife' && 'Wildlife & nature experts: ornithologists, marine biologists, karst geologists, wildlife trackers.'}
          </div>
          <ExtGrid cats={[advSub]} items={getExt([advSub])} onDelete={deleteExt} />
        </>
      )}

      {tab === 'experience' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['artisan', '🎨 Artisans & Cultural'],
                  ['wellness', '💆 Luxury Wellness'],
                  ['events', '🎪 Events & Decor'],
                ] as const
              ).map(([id, label]) => (
                <div key={id} className={`tab${expSub === id ? ' on' : ''}`} onClick={() => setExpSub(id)} role="button" tabIndex={0}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd('experience')}>
              ＋ Add Experience Provider
            </button>
          </div>
          <div className="info-bar">
            {expSub === 'artisan' && 'Master artisans, cultural experts, musicians, and performers for private in-depth experiences.'}
            {expSub === 'wellness' && 'Luxury wellness partners: traditional medicine doctors, spa directors, meditation guides.'}
            {expSub === 'events' && 'Exclusive event & decor specialists: private beach dinners, floral designers, lantern lighting.'}
          </div>
          <ExtGrid cats={[expSub]} items={getExt([expSub])} onDelete={deleteExt} />
        </>
      )}

      {tab === 'personnel' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['specguide', '🗣 Specialist Guides'],
                  ['media', '📷 Media Production'],
                  ['safety', '🛡 Security & Health'],
                ] as const
              ).map(([id, label]) => (
                <div key={id} className={`tab${perSub === id ? ' on' : ''}`} onClick={() => setPerSub(id)} role="button" tabIndex={0}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd('personnel')}>
              ＋ Add Personnel Supplier
            </button>
          </div>
          {perSub === 'specguide' && (
            <div className="search-row" style={{ marginBottom: 10 }}>
              <select value={perLang} onChange={(e) => setPerLang(e.target.value)}>
                <option value="">All Languages</option>
                <option value="EN">🇬🇧 English</option>
                <option value="FR">🇫🇷 French</option>
                <option value="DE">🇩🇪 German</option>
              </select>
            </div>
          )}
          <div className="info-bar">Specialist guides, media production, and security & health partners — all VNAT-licensed where applicable.</div>
          <ExtGrid cats={[perSub]} items={getExt([perSub])} onDelete={deleteExt} />
        </>
      )}

      {tab === 'custom' && (
        <div>
          <div className="info-bar">Create custom supplier categories for niche partners not covered above.</div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">Create Custom Category</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fg">
                  <label className="lbl">Category Name</label>
                  <input placeholder="e.g. Photography Studios" />
                </div>
                <div className="fg">
                  <label className="lbl">Emoji</label>
                  <input defaultValue="📌" />
                </div>
              </div>
              <button className="btn btn-p btn-sm" type="button" style={{ marginTop: 12 }}>
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="overlay open" onClick={() => setShowAdd(false)}>
          <div className="modal sup-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd modal-hd-green">
              <span style={{ color: '#fff', fontWeight: 700 }}>＋ Add New Supplier</span>
              <button className="modal-close-btn" type="button" onClick={() => setShowAdd(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <div className="fg">
                <label className="lbl">Category *</label>
                <select value={addForm.cat} onChange={(e) => setAddForm({ ...addForm, cat: e.target.value })}>
                  <option value="visa">Visa Services</option>
                  <option value="fasttrack">Airport Fast Track</option>
                  <option value="aviation">Aviation</option>
                  <option value="river">River Sampan</option>
                  <option value="coastal">Coastal Speedboat</option>
                  <option value="cycling">Cycling</option>
                  <option value="wildlife">Wildlife Expert</option>
                  <option value="artisan">Master Artisan</option>
                  <option value="events">Events & Decor</option>
                  <option value="specguide">Specialist Guide</option>
                  <option value="media">Media Production</option>
                  <option value="safety">Security & Health</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Sub-category</label>
                <input placeholder="e.g. FR Specialist Guide" value={addForm.subcat} onChange={(e) => setAddForm({ ...addForm, subcat: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fg">
                  <label className="lbl">Supplier Name *</label>
                  <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">English Name</label>
                  <input value={addForm.ename} onChange={(e) => setAddForm({ ...addForm, ename: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fg">
                  <label className="lbl">Phone *</label>
                  <input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Email</label>
                  <input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fg">
                  <label className="lbl">Location</label>
                  <input value={addForm.location} onChange={(e) => setAddForm({ ...addForm, location: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Region</label>
                  <select value={addForm.region} onChange={(e) => setAddForm({ ...addForm, region: e.target.value })}>
                    <option value="national">Nationwide</option>
                    <option value="north">North</option>
                    <option value="central">Central</option>
                    <option value="south">South</option>
                  </select>
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Rate / Pricing</label>
                <input placeholder="$45/application · $120 urgent" value={addForm.rate} onChange={(e) => setAddForm({ ...addForm, rate: e.target.value })} />
              </div>
              <div className="fg">
                <label className="lbl">Description *</label>
                <textarea style={{ minHeight: 80 }} value={addForm.desc} onChange={(e) => setAddForm({ ...addForm, desc: e.target.value })} />
              </div>
              <div className="fg">
                <label className="lbl">Internal Notes</label>
                <textarea style={{ minHeight: 50 }} value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button className="btn btn-s" type="button" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button className="btn btn-p" type="button" onClick={saveSupplier}>
                  Save Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
