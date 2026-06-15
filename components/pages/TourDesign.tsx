'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { REG_LABELS } from '@/lib/page-helpers';
import { AGENT_DATALIST, SALES_PEOPLE } from '@/lib/customer-form';
import { useStore } from '@/hooks/useStore';
import TourExperiencesStep from '@/components/tourdesign/TourExperiencesStep';
import { TOUR_PACKAGES, type TourPackage } from '@/lib/seeds/tourPackages';

const STEPS = ['Client Brief', 'Tour Experiences', 'Pricing', 'AI Export'] as const;

const DURATIONS = ['3 Days 2 Nights', '4 Days 3 Nights', '5 Days 4 Nights', '6 Days 5 Nights', '7 Days 6 Nights', '8 Days 7 Nights', '10 Days 9 Nights', '12 Days 11 Nights', '14 Days 13 Nights', '16 Days 15 Nights', '18 Days 17 Nights', '21 Days 20 Nights'];

const REGIONS = [
  { id: 'north', label: 'Northern Vietnam' },
  { id: 'central', label: 'Central Vietnam' },
  { id: 'south', label: 'Southern Vietnam' },
  { id: 'multi', label: 'Multi-Region' },
];

export default function TourDesign() {
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const addLead = useStore((s) => s.addLead);
  const [step, setStep] = useState(0);
  const [clientType, setClientType] = useState<'b2c' | 'b2b'>('b2c');
  const [custId, setCustId] = useState('');
  const [aiPanel, setAiPanel] = useState<string | null>(null);
  const [brief, setBrief] = useState({
    clientName: '',
    clientEmail: '',
    pax: 2,
    adults: 2,
    children: 0,
    duration: '7 Days 6 Nights',
    region: 'north',
    startDate: '',
    endDate: '',
    budget: '',
    tier: 'Gold',
    style: 'Luxury',
    pace: 'Moderate',
    interests: [] as string[],
    mustSee: '',
    avoid: '',
    dietary: '',
    mobility: '',
    notes: '',
    agentRef: '',
    language: 'English',
    travelMonth: 'Oct',
    hotelTier: 'Boutique 4★',
    budgetRange: '$2,000–$3,500/pax',
    flights: 'yes',
    visa: 'exempt',
    nationality: '',
    firstTime: '',
    salesperson: '',
  });
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedCodes.includes(p.code)),
    [products, selectedCodes]
  );

  const toggleProduct = (code: string) => {
    setSelectedCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  function applyPackage(pkg: TourPackage) {
    setSelectedPackageId(pkg.id);
    setBrief((b) => ({
      ...b,
      duration: pkg.format,
      mustSee: pkg.route,
      region: pkg.tag === 'full' ? 'multi' : pkg.tag,
      notes: pkg.tagline,
    }));
  }

  const estCost = useMemo(() => {
    let total = 0;
    selectedProducts.forEach((p) => {
      const m = p.price?.match(/\$?([\d,]+)/);
      if (m) total += parseInt(m[1].replace(/,/g, ''), 10);
    });
    return total * brief.pax;
  }, [selectedProducts, brief.pax]);

  const briefSummary = [
    brief.clientName && `Client: ${brief.clientName}`,
    `${brief.pax} pax · ${brief.duration}`,
    brief.travelMonth && `Travel: ${brief.travelMonth}`,
    brief.style && `Style: ${brief.style}`,
    brief.tier && `Tier: ${brief.tier}`,
    clientType === 'b2b' && brief.agentRef && `Agent: ${brief.agentRef}`,
  ]
    .filter(Boolean)
    .join(' · ');

  function autoFillFromCustomer(id: string) {
    setCustId(id);
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    setBrief((b) => ({
      ...b,
      clientName: c.name,
      clientEmail: c.email,
      style: c.style || b.style,
      language: c.lang || b.language,
      agentRef: c.agentName || b.agentRef,
      nationality: c.nat || b.nationality,
      travelMonth: c.travelMonth || b.travelMonth,
      hotelTier: c.hotelTier || b.hotelTier,
      budgetRange: c.budget || b.budgetRange,
      salesperson: c.salesperson || b.salesperson,
    }));
    setClientType(c.clientType || 'b2c');
  }

  function aiSuggestStyle() {
    setAiPanel(
      `Based on ${brief.clientName || 'this client'}'s profile (${brief.style}, ${brief.pax} guests, ${brief.budgetRange}), we recommend:\n\n• ${brief.region === 'north' ? 'Hanoi + Halong + Sapa' : brief.region === 'central' ? 'Hue + Hoi An + Da Nang' : 'Saigon + Mekong + Phu Quoc'} core route\n• ${brief.tier} service tier with ${brief.hotelTier} hotels\n• Pace: ${brief.pace} — ${brief.interests.length ? brief.interests.join(', ') : 'cultural highlights'}\n• Guide language: ${brief.language}`
    );
  }

  function saveAsLead() {
    const id = `LD-${String(Date.now()).slice(-6)}`;
    const cust = custId || customers.find((c) => c.name === brief.clientName)?.id || '';
    addLead({
      id,
      custId: cust || 'CU-NEW',
      tour: `${brief.duration} ${REG_LABELS[brief.region as keyof typeof REG_LABELS] || brief.region} — ${selectedProducts.length} modules`,
      pax: brief.pax,
      value: estCost || 0,
      month: brief.travelMonth || brief.startDate?.slice(0, 7) || 'TBD',
      stage: 'Designing',
      owner: brief.salesperson || 'Tai Pham',
      probability: 25,
      clientType,
    });
    alert(`Lead ${id} saved to Sales Pipeline.`);
  }

  const toggleInterest = (i: string) => {
    setBrief((b) => ({
      ...b,
      interests: b.interests.includes(i) ? b.interests.filter((x) => x !== i) : [...b.interests, i],
    }));
  };

  return (
    <div>
      <div className="td-steps">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`td-step${step === i ? ' on' : ''}${step > i ? ' done' : ''}`}
            onClick={() => setStep(i)}
            role="button"
            tabIndex={0}
          >
            <span className="td-step-num">{i + 1}</span>
            <span className="td-step-label">{label}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">Step 1 — Client Brief / Thông tin khách hàng</span>
            <span className="bdg bdg-p">Required before building</span>
          </div>
          <div className="card-body">
            <div className="td-form-grid">
              <div className="fg">
                <label className="lbl">Client Type</label>
                <select value={clientType} onChange={(e) => setClientType(e.target.value as 'b2c' | 'b2b')}>
                  <option value="b2c">B2C — Direct Client</option>
                  <option value="b2b">B2B — Travel Agent</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Customer (CRM)</label>
                <select value={custId} onChange={(e) => (e.target.value ? autoFillFromCustomer(e.target.value) : setCustId(''))}>
                  <option value="">— New Client —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {clientType === 'b2b' && (
                <div className="fg">
                  <label className="lbl" style={{ color: 'var(--pur)' }}>
                    ★ Agent / Operator Name
                  </label>
                  <input
                    list="td-agent-list"
                    value={brief.agentRef}
                    onChange={(e) => setBrief({ ...brief, agentRef: e.target.value })}
                    placeholder="Black Tomato, Virtuoso..."
                    style={{ borderColor: 'var(--pur)' }}
                  />
                  <datalist id="td-agent-list">
                    {AGENT_DATALIST.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>
              )}
              <div className="fg">
                <label className="lbl">Client Name <span className="req">*</span></label>
                <input
                  value={brief.clientName}
                  onChange={(e) => setBrief({ ...brief, clientName: e.target.value })}
                  list="td-clients"
                  placeholder="Full name or company"
                />
                <datalist id="td-clients">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div className="fg">
                <label className="lbl">Email</label>
                <input type="email" value={brief.clientEmail} onChange={(e) => setBrief({ ...brief, clientEmail: e.target.value })} />
              </div>
              <div className="fg">
                <label className="lbl">Agent / Source Ref</label>
                <input value={brief.agentRef} onChange={(e) => setBrief({ ...brief, agentRef: e.target.value })} placeholder="Agent code or referral" />
              </div>
              <div className="fg">
                <label className="lbl">Language</label>
                <select value={brief.language} onChange={(e) => setBrief({ ...brief, language: e.target.value })}>
                  <option>English</option>
                  <option>French</option>
                  <option>German</option>
                  <option>Spanish</option>
                  <option>Japanese</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Travel Month</label>
                <select value={brief.travelMonth} onChange={(e) => setBrief({ ...brief, travelMonth: e.target.value })}>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Hotel Tier</label>
                <select value={brief.hotelTier} onChange={(e) => setBrief({ ...brief, hotelTier: e.target.value })}>
                  <option>Boutique 4★</option>
                  <option>Luxury 5★</option>
                  <option>Standard 3-4★</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Budget Range</label>
                <select value={brief.budgetRange} onChange={(e) => setBrief({ ...brief, budgetRange: e.target.value })}>
                  {['Under $1,000/pax', '$1,000–$2,000/pax', '$2,000–$3,500/pax', '$3,500–$6,000/pax', '$6,000+/pax'].map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Our Sales Person</label>
                <select value={brief.salesperson} onChange={(e) => setBrief({ ...brief, salesperson: e.target.value })}>
                  <option value="">— Not assigned —</option>
                  {SALES_PEOPLE.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Domestic Flights</label>
                <select value={brief.flights} onChange={(e) => setBrief({ ...brief, flights: e.target.value })}>
                  <option value="yes">Yes — include flights</option>
                  <option value="no">No — land only</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Visa</label>
                <select value={brief.visa} onChange={(e) => setBrief({ ...brief, visa: e.target.value })}>
                  <option value="exempt">Visa exemption</option>
                  <option value="evisa-self">E-visa — guest arranges</option>
                  <option value="visa-us">Visa — we arrange</option>
                  <option value="voa">Visa on arrival</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Total Pax <span className="req">*</span></label>
                <input type="number" min={1} value={brief.pax} onChange={(e) => setBrief({ ...brief, pax: +e.target.value })} />
              </div>
              <div className="fg">
                <label className="lbl">Adults</label>
                <input type="number" min={0} value={brief.adults} onChange={(e) => setBrief({ ...brief, adults: +e.target.value })} />
              </div>
              <div className="fg">
                <label className="lbl">Children</label>
                <input type="number" min={0} value={brief.children} onChange={(e) => setBrief({ ...brief, children: +e.target.value })} />
              </div>
              <div className="fg">
                <label className="lbl">Duration <span className="req">*</span></label>
                <select value={brief.duration} onChange={(e) => setBrief({ ...brief, duration: e.target.value })}>
                  {DURATIONS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Primary Region</label>
                <select value={brief.region} onChange={(e) => setBrief({ ...brief, region: e.target.value })}>
                  {REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Start Date</label>
                <input type="date" value={brief.startDate} onChange={(e) => setBrief({ ...brief, startDate: e.target.value })} />
              </div>
              <div className="fg">
                <label className="lbl">End Date</label>
                <input type="date" value={brief.endDate} onChange={(e) => setBrief({ ...brief, endDate: e.target.value })} />
              </div>
              <div className="fg">
                <label className="lbl">Budget (USD total)</label>
                <input value={brief.budget} onChange={(e) => setBrief({ ...brief, budget: e.target.value })} placeholder="e.g. 8000" />
              </div>
              <div className="fg">
                <label className="lbl">Service Tier</label>
                <select value={brief.tier} onChange={(e) => setBrief({ ...brief, tier: e.target.value })}>
                  <option>Platinum</option>
                  <option>Gold</option>
                  <option>Silver</option>
                  <option>Bronze</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Travel Style</label>
                <select value={brief.style} onChange={(e) => setBrief({ ...brief, style: e.target.value })}>
                  <option>Luxury</option>
                  <option>Comfort</option>
                  <option>Adventure</option>
                  <option>Family</option>
                  <option>Honeymoon</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Pace</label>
                <select value={brief.pace} onChange={(e) => setBrief({ ...brief, pace: e.target.value })}>
                  <option>Relaxed</option>
                  <option>Moderate</option>
                  <option>Active</option>
                </select>
              </div>
            </div>

            <div className="fg" style={{ marginTop: 12 }}>
              <label className="lbl">Interests / Themes</label>
              <div className="td-chips">
                {['Culture', 'Food & Wine', 'Nature', 'Beach', 'History', 'Photography', 'Wellness', 'Cycling', 'Cruise', 'Off-the-beaten'].map((i) => (
                  <span key={i} className={`td-chip${brief.interests.includes(i) ? ' on' : ''}`} onClick={() => toggleInterest(i)} role="button" tabIndex={0}>
                    {i}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div className="fg">
                <label className="lbl">Must-See / Must-Do</label>
                <textarea value={brief.mustSee} onChange={(e) => setBrief({ ...brief, mustSee: e.target.value })} placeholder="Halong Bay, Sapa trekking, Hoi An cooking class…" />
              </div>
              <div className="fg">
                <label className="lbl">Avoid / Exclusions</label>
                <textarea value={brief.avoid} onChange={(e) => setBrief({ ...brief, avoid: e.target.value })} placeholder="No long drives, no crowds…" />
              </div>
              <div className="fg">
                <label className="lbl">Dietary Requirements</label>
                <textarea value={brief.dietary} onChange={(e) => setBrief({ ...brief, dietary: e.target.value })} />
              </div>
              <div className="fg">
                <label className="lbl">Mobility / Accessibility</label>
                <textarea value={brief.mobility} onChange={(e) => setBrief({ ...brief, mobility: e.target.value })} />
              </div>
            </div>

            <div className="fg" style={{ marginTop: 12 }}>
              <label className="lbl">Internal Notes</label>
              <textarea value={brief.notes} onChange={(e) => setBrief({ ...brief, notes: e.target.value })} placeholder="Sales notes, special requests, competitor quotes…" />
            </div>

            <div className="info-bar" style={{ marginTop: 14 }}>
              {briefSummary || 'Fill in the fields above — summary will appear here.'}
            </div>

            {aiPanel && (
              <div className="td-ai-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pur)' }}>✦ AI Tour Style Suggestion</span>
                  <button type="button" onClick={() => setAiPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m)' }}>
                    ✕
                  </button>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiPanel}</div>
              </div>
            )}

            <div className="td-nav">
              <button className="btn btn-pu btn-sm" type="button" onClick={aiSuggestStyle}>
                ✦ AI Suggest Style
              </button>
              <button className="btn btn-p" type="button" onClick={() => setStep(1)}>
                Next: Tour Experiences →
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <TourExperiencesStep
            products={products}
            selectedCodes={selectedCodes}
            onToggleProduct={toggleProduct}
            onSelectPackage={applyPackage}
            selectedPackageId={selectedPackageId}
          />
          <div className="td-nav" style={{ marginTop: 14 }}>
            <button className="btn btn-s" type="button" onClick={() => setStep(0)}>
              ← Back
            </button>
            <button
              className="btn btn-p"
              type="button"
              onClick={() => setStep(2)}
              disabled={selectedCodes.length === 0 && !selectedPackageId}
            >
              Continue to Pricing →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">Step 3 — Pricing</span>
          </div>
          <div className="card-body">
            <div className="td-itin-summary">
              <div><b>{brief.clientName || 'Unnamed client'}</b> · {brief.duration} · {brief.pax} pax · {REG_LABELS[brief.region as keyof typeof REG_LABELS] || brief.region}</div>
              {brief.startDate && <div style={{ fontSize: 12, color: 'var(--m)' }}>Dates: {brief.startDate} → {brief.endDate || 'TBD'}</div>}
            </div>
            {selectedProducts.length === 0 && selectedPackageId ? (
              <div className="td-itin-days">
                {(TOUR_PACKAGES.find((p) => p.id === selectedPackageId)?.days || []).map((d) => (
                  <div key={d.n} className="td-itin-day">
                    <div className="td-itin-day-hd">Day {d.n} — {d.title}</div>
                    <div className="td-itin-day-body">
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{d.sub}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--m)', marginTop: 4 }}>🏨 {d.hotel} · Meals: {d.meals}</div>
                      <div style={{ fontSize: 11.5, marginTop: 4 }}>{d.body.slice(0, 160)}…</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedProducts.length === 0 ? (
              <div className="empty-state">No products selected — go back to Step 2.</div>
            ) : (
              <div className="td-itin-days">
                {selectedProducts.map((p, i) => (
                  <div key={p.code} className="td-itin-day">
                    <div className="td-itin-day-hd">Day {i + 1}</div>
                    <div className="td-itin-day-body">
                      <code className="pl-code">{p.code}</code>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--m)' }}>{p.dur} · {p.dest}</div>
                      {p.desc && <div style={{ fontSize: 11.5, marginTop: 4 }}>{p.desc.slice(0, 120)}…</div>}
                    </div>
                    <button className="btn btn-s btn-sm" type="button" onClick={() => toggleProduct(p.code)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            <div className="td-nav">
              <button className="btn btn-s" type="button" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-p" type="button" onClick={() => setStep(3)}>Review & Quote →</button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">Step 4 — AI Export & Generate Quote</span>
          </div>
          <div className="card-body">
            <div className="td-review-grid">
              <div className="td-review-block">
                <div className="td-review-title">Client Brief</div>
                <div className="td-review-row"><span>Name</span><b>{brief.clientName || '—'}</b></div>
                <div className="td-review-row"><span>Pax</span><b>{brief.pax} ({brief.adults}A + {brief.children}C)</b></div>
                <div className="td-review-row"><span>Duration</span><b>{brief.duration}</b></div>
                <div className="td-review-row"><span>Tier / Style</span><b>{brief.tier} · {brief.style}</b></div>
                <div className="td-review-row"><span>Budget</span><b>{brief.budget ? `$${brief.budget}` : 'Not specified'}</b></div>
                {brief.interests.length > 0 && (
                  <div className="td-chips" style={{ marginTop: 8 }}>
                    {brief.interests.map((i) => (
                      <span key={i} className="td-chip on">{i}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="td-review-block">
                <div className="td-review-title">Itinerary ({selectedProducts.length} modules)</div>
                {selectedProducts.map((p, i) => (
                  <div key={p.code} style={{ fontSize: 12, marginBottom: 4 }}>
                    Day {i + 1}: {p.name}
                  </div>
                ))}
              </div>
              <div className="td-review-block td-review-pricing">
                <div className="td-review-title">Estimated Pricing</div>
                <div className="td-review-row"><span>Modules subtotal</span><b>{fmt(estCost / brief.pax)}/pax</b></div>
                <div className="td-review-row"><span>Total ({brief.pax} pax)</span><b style={{ color: 'var(--gold)', fontSize: 16 }}>{fmt(estCost)}</b></div>
                <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 8 }}>Excludes markup, flights, and guide fees. Use Pricing page for full quote.</div>
              </div>
            </div>
            <div className="td-nav">
              <button className="btn btn-s" type="button" onClick={() => setStep(2)}>← Back</button>
              <Link href="/pricing" className="btn btn-s">Open Pricing Calculator</Link>
              <button className="btn btn-pu btn-sm" type="button" onClick={() => alert('PDF export — connect to document service in production.')}>
                ✦ AI Generate Proposal
              </button>
              <button className="btn btn-p" type="button" onClick={() => alert('PDF quote — stub for production export.')}>
                Generate PDF Quote
              </button>
              <button className="btn btn-p" type="button" onClick={saveAsLead}>
                Save as Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
