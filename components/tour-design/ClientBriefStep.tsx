'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { AGENT_DATALIST, SALES_PEOPLE } from '@/lib/customers/customer-form';
import {
  isTravelDateNotPast,
  todayIsoLocal,
} from '@/lib/customers/customer-validation';
import {
  NATIONALITIES,
  isKnownNationality,
  normalizeNationality,
} from '@/lib/customers/nationalities';
import { buildBriefSummaryHtml } from '@/lib/tour-design/tour-brief-summary';
import { DURATION_PRESETS } from '@/lib/tour-design/tour-durations';
import type { TourBrief } from '@/lib/tour-design/tour-design-types';
import type { Customer } from '@/lib/types';
import { toast } from '@/lib/toast';

const CHILD_TAGS = ['Infant 0-2', 'Toddler 3-5', 'Child 6-9', 'Pre-teen 10-12', 'Teen 13-17'];
const PAX_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const CUSTOM_PAX_VALUE = 'custom';

const REGIONS = [
  { id: 'north', label: 'Northern Vietnam' },
  { id: 'central', label: 'Central Vietnam' },
  { id: 'south', label: 'Southern Vietnam' },
  { id: 'multi', label: 'Multi-Region' },
];

interface Props {
  brief: TourBrief;
  setBrief: Dispatch<SetStateAction<TourBrief>>;
  clientType: 'b2c' | 'b2b';
  setClientType: (t: 'b2c' | 'b2b') => void;
  custId: string;
  customers: Customer[];
  onSelectCustomer: (id: string) => void;
  onNewCustomer: () => void;
  aiPanel: string | null;
  onAiSuggest: () => void;
  onCloseAi: () => void;
  onNext: () => void;
}

export default function ClientBriefStep({
  brief,
  setBrief,
  clientType,
  setClientType,
  custId,
  customers,
  onSelectCustomer,
  onNewCustomer,
  aiPanel,
  onAiSuggest,
  onCloseAi,
  onNext,
}: Props) {
  const custName = customers.find((c) => c.id === custId)?.name;
  const summary = buildBriefSummaryHtml(brief, clientType, custName);
  const showChildren = brief.children > 0;
  const isCustomPax = brief.pax > 10;
  const paxMode = isCustomPax ? 'custom' : 'preset';
  const [customPaxInput, setCustomPaxInput] = useState(String(isCustomPax ? brief.pax : 12));
  const todayIso = todayIsoLocal();
  const firstTimeValue = brief.firstTime === 'unknown' ? '' : brief.firstTime;

  function setPax(n: number) {
    setBrief((b) => ({ ...b, pax: n, adults: n }));
  }

  function handlePaxSelect(value: string) {
    if (value === CUSTOM_PAX_VALUE) {
      const n = Math.max(11, Number(customPaxInput) || 12);
      setCustomPaxInput(String(n));
      setPax(n);
      return;
    }
    setPax(Number(value));
  }

  function handleCustomPaxChange(raw: string) {
    setCustomPaxInput(raw);
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 11) return;
    setPax(Math.floor(n));
  }

  function addChildTag(tag: string) {
    setBrief((b) => ({
      ...b,
      childAges: b.childAges ? `${b.childAges}, ${tag}` : tag,
    }));
  }

  function handleStartDateChange(value: string) {
    if (value && !isTravelDateNotPast(value)) {
      toast.warning('Travel start date must be today or later.');
      setBrief({ ...brief, startDate: '' });
      return;
    }
    setBrief({ ...brief, startDate: value });
  }

  function handleNext() {
    if (brief.startDate && !isTravelDateNotPast(brief.startDate)) {
      toast.warning('Travel start date must be today or later.');
      return;
    }
    if (brief.nationality.trim() && !isKnownNationality(brief.nationality)) {
      toast.warning('Please choose a Nationality from the suggestion list.');
      return;
    }
    if (brief.nationality.trim()) {
      const canonical = normalizeNationality(brief.nationality);
      if (canonical !== brief.nationality) {
        setBrief({ ...brief, nationality: canonical });
      }
    }
    onNext();
  }

  return (
    <div className="card">
      <div className="card-hd">
        <span className="card-title">Step 1 — Client Brief</span>
      </div>
      <div className="card-body">
        <div className="td-form-grid td-form-grid-3">
          <div className="fg">
            <label className="lbl">Client Type</label>
            <select value={clientType} onChange={(e) => setClientType(e.target.value as 'b2c' | 'b2b')}>
              <option value="b2c">B2C — Direct Client</option>
              <option value="b2b">B2B — Travel Agent</option>
            </select>
          </div>
          <div className="fg">
            <label className="lbl">Customer (CRM)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select style={{ flex: 1 }} value={custId} onChange={(e) => (e.target.value ? onSelectCustomer(e.target.value) : onSelectCustomer(''))}>
                <option value="">— New Client —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button className="btn btn-s btn-sm" type="button" onClick={onNewCustomer}>
                + New
              </button>
            </div>
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
            <label className="lbl">Number of Guests</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                style={{ flex: 1 }}
                value={paxMode === 'custom' ? CUSTOM_PAX_VALUE : String(brief.pax)}
                onChange={(e) => handlePaxSelect(e.target.value)}
                aria-label="Number of guests"
              >
                {PAX_PRESETS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
                <option value={CUSTOM_PAX_VALUE}>Custom (11+)</option>
              </select>
              {paxMode === 'custom' && (
                <input
                  key={brief.pax}
                  type="number"
                  min={11}
                  step={1}
                  defaultValue={brief.pax}
                  onChange={(e) => handleCustomPaxChange(e.target.value)}
                  onBlur={() => {
                    const n = Math.max(11, Math.floor(Number(customPaxInput) || 11));
                    setCustomPaxInput(String(n));
                    setPax(n);
                  }}
                  style={{ width: 88 }}
                  aria-label="Custom guest count"
                  title="Groups of 11+ use the catalog 10+ rate per guest"
                />
              )}
            </div>
            {paxMode === 'custom' && (
              <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 4 }}>
                Uses catalog 10+ rate × {brief.pax} guests
              </div>
            )}
          </div>
          <div className="fg">
            <label className="lbl">Travel Style</label>
            <select value={brief.style} onChange={(e) => setBrief({ ...brief, style: e.target.value })}>
              {['Luxury', 'Premium Cultural', 'Cultural', 'Adventure', 'Family', 'Culinary', 'Photography', 'Honeymoon'].map((s) => (
                <option key={s}>{s}</option>
              ))}
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
            <label className="lbl">Guide Language</label>
            <select value={brief.language} onChange={(e) => setBrief({ ...brief, language: e.target.value })}>
              {['English', 'French', 'German', 'Spanish', 'Italian'].map((l) => (
                <option key={l}>{l}</option>
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
            <label className="lbl">International Flights</label>
            <select value={brief.intlFlights} onChange={(e) => setBrief({ ...brief, intlFlights: e.target.value })}>
              <option value="not-included">Not included — client arranges</option>
              <option value="incl-economy">Included — economy class</option>
              <option value="incl-business">Included — business class</option>
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
            <label className="lbl">Budget Range</label>
            <select value={brief.budgetRange} onChange={(e) => setBrief({ ...brief, budgetRange: e.target.value })}>
              {['Under $1,000/pax', '$1,000–$2,000/pax', '$2,000–$3,500/pax', '$3,500–$6,000/pax', '$6,000+/pax'].map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label className="lbl" style={{ color: 'var(--g)' }}>
              Our Sales Person
            </label>
            <select value={brief.salesperson} onChange={(e) => setBrief({ ...brief, salesperson: e.target.value })}>
              <option value="">— Not assigned —</option>
              {SALES_PEOPLE.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="td-travel-details-box">
          <div className="td-section-lbl" style={{ marginBottom: 10 }}>
            📅 Travel Details & Guest Profile
          </div>
          <div className="td-form-grid td-form-grid-3">
            <div className="fg">
              <label className="lbl">Travel Start Date</label>
              <input
                type="date"
                min={todayIso}
                value={brief.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </div>
            <div className="fg">
              <label className="lbl">Nationality / Country</label>
              <input
                list="td-nationality-list"
                value={brief.nationality}
                onChange={(e) => setBrief({ ...brief, nationality: e.target.value })}
                placeholder="Type to search…"
                autoComplete="off"
              />
              <datalist id="td-nationality-list">
                {NATIONALITIES.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div className="fg">
              <label className="lbl">First Time in Vietnam?</label>
              <select value={firstTimeValue} onChange={(e) => setBrief({ ...brief, firstTime: e.target.value })}>
                <option value="">— Not specified —</option>
                <option value="yes">Yes — first visit</option>
                <option value="no">No — returning</option>
              </select>
            </div>
          </div>
          <div className="td-form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
            <div className="fg">
              <label className="lbl">Interests / Hobbies</label>
              <textarea
                rows={2}
                value={brief.interestsText}
                onChange={(e) => setBrief({ ...brief, interestsText: e.target.value })}
                placeholder="Photography, local cuisine, history..."
              />
            </div>
            <div className="fg">
              <label className="lbl">Don&apos;ts / Must Avoid</label>
              <textarea rows={2} value={brief.avoid} onChange={(e) => setBrief({ ...brief, avoid: e.target.value })} placeholder="No seafood, avoid crowds..." />
            </div>
          </div>
        </div>

        <div className="td-children-box">
          <div className="td-section-lbl td-children-title">👧 Children</div>
          <div className="td-form-grid td-form-grid-3">
            <div className="fg">
              <label className="lbl">Number of Children</label>
              <select value={brief.children} onChange={(e) => setBrief({ ...brief, children: +e.target.value })}>
                <option value={0}>No children</option>
                <option value={1}>1 child</option>
                <option value={2}>2 children</option>
                <option value={3}>3 children</option>
                <option value={4}>4+ children</option>
              </select>
            </div>
            {showChildren && (
              <>
                <div className="fg">
                  <label className="lbl">Children Ages</label>
                  <input value={brief.childAges} onChange={(e) => setBrief({ ...brief, childAges: e.target.value })} placeholder="e.g. 4, 7, 11 years old" />
                </div>
                <div className="fg">
                  <label className="lbl">Dietary / Allergies</label>
                  <input value={brief.childDiet} onChange={(e) => setBrief({ ...brief, childDiet: e.target.value })} placeholder="Nut allergy, vegetarian..." />
                </div>
                <div className="fg">
                  <label className="lbl">Child Activity Preferences</label>
                  <input value={brief.childPrefs} onChange={(e) => setBrief({ ...brief, childPrefs: e.target.value })} placeholder="Swimming, cooking class..." />
                </div>
              </>
            )}
          </div>
          {showChildren && (
            <div className="td-child-tags">
              <span style={{ fontSize: 11, color: 'var(--amb)', fontWeight: 600, marginRight: 6 }}>Quick tags:</span>
              {CHILD_TAGS.map((t) => (
                <span key={t} className="child-tag" onClick={() => addChildTag(t)} role="button" tabIndex={0}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="fg" style={{ marginTop: 12 }}>
          <label className="lbl">Special Requests</label>
          <textarea
            value={brief.specialRequests}
            onChange={(e) => setBrief({ ...brief, specialRequests: e.target.value })}
            placeholder="Dietary restrictions, mobility needs, anniversaries, must-see experiences..."
          />
        </div>

        <div className="fg" style={{ marginTop: 8 }}>
          <label className="lbl">Duration</label>
          <input
            list="td-duration-list"
            value={brief.duration}
            onChange={(e) => setBrief({ ...brief, duration: e.target.value })}
            placeholder="e.g. 7 Days 6 Nights — or type custom"
            autoComplete="off"
          />
          <datalist id="td-duration-list">
            {DURATION_PRESETS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 4 }}>
            Pick a suggestion (2–30 days) or type a custom duration
          </div>
        </div>

        <div className="fg">
          <label className="lbl">Primary Region</label>
          <select value={brief.region} onChange={(e) => setBrief({ ...brief, region: e.target.value })}>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="info-bar" style={{ marginTop: 14 }}>
          {summary || 'Fill in the fields above — summary will appear here.'}
        </div>

        {aiPanel && (
          <div className="td-ai-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pur)' }}>✦ AI Tour Style Suggestion</span>
              <button type="button" onClick={onCloseAi} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m)' }}>
                ✕
              </button>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiPanel}</div>
          </div>
        )}

        <div className="td-nav">
          <button className="btn btn-pu btn-sm" type="button" onClick={onAiSuggest}>
            ✦ AI Suggest Style
          </button>
          <button className="btn btn-p" type="button" onClick={handleNext}>
            Next: Outline →
          </button>
        </div>
      </div>
    </div>
  );
}
