'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { AGENT_DATALIST, SALES_PEOPLE } from '@/lib/customers/customer-form';
import { DEFAULT_TRAVEL_STYLES, type TravelStyle } from '@/lib/customers/travel-styles';
import {
  isTravelDateNotPast,
  todayIsoLocal,
} from '@/lib/customers/customer-validation';
import {
  NATIONALITIES,
  isKnownNationality,
  normalizeNationality,
} from '@/lib/customers/nationalities';
import { isIsoTravelMonth, travelMonthInputValue } from '@/lib/core/travel-month';
import { buildBriefSummaryHtml } from '@/lib/tour-design/tour-brief-summary';
import { DURATION_PRESETS } from '@/lib/tour-design/tour-durations';
import type { TourBrief } from '@/lib/tour-design/tour-design-types';
import type { Customer } from '@/lib/types';
import { toast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';
import { getBffData } from '@/lib/bff/client';
import type { TourDesignClientPreferences } from '@/lib/tour-design/tour-design-types';
import TravelStyleManagerModal from '@/components/customers/TravelStyleManagerModal';

const CHILD_TAGS = ['Infant 0-2', 'Toddler 3-5', 'Child 6-9', 'Pre-teen 10-12', 'Teen 13-17'];
const PAX_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const CUSTOM_PAX_VALUE = 'custom';

const REGIONS = [
  { id: 'north', key: 'briefRegionNorth' as const },
  { id: 'central', key: 'briefRegionCentral' as const },
  { id: 'south', key: 'briefRegionSouth' as const },
  { id: 'multi', key: 'briefRegionMulti' as const },
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
  canWrite?: boolean;
  canManageTravelStyles?: boolean;
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
  canWrite = true,
  canManageTravelStyles = false,
}: Props) {
  const { tp, tpl } = useLanguage();
  const custName = customers.find((c) => c.id === custId)?.name;
  const summary = buildBriefSummaryHtml(brief, clientType, custName);
  const showChildren = brief.children > 0;
  const isCustomPax = brief.pax > 10;
  const paxMode = isCustomPax ? 'custom' : 'preset';
  const [customPaxInput, setCustomPaxInput] = useState(String(isCustomPax ? brief.pax : 12));
  const [clientPreferences, setClientPreferences] = useState<TourDesignClientPreferences | null>(null);
  const [clientPreferencesError, setClientPreferencesError] = useState<string | null>(null);
  const [travelStyleManagerOpen, setTravelStyleManagerOpen] = useState(false);
  const [travelStylesSaving, setTravelStylesSaving] = useState(false);
  const todayIso = todayIsoLocal();
  const firstTimeValue = brief.firstTime === 'unknown' ? '' : brief.firstTime;
  const travelStyles = clientPreferences?.travelStyles ?? DEFAULT_TRAVEL_STYLES;
  const hotelTiers = clientPreferences?.hotelTiers ?? [];
  const clientPreferencesLoading = clientPreferences === null && clientPreferencesError === null;

  useEffect(() => {
    let active = true;
    void getBffData<TourDesignClientPreferences>(
      '/api/tour-design/client-preferences',
      'Không thể tải Travel Style và Hotel Tier.',
    ).then((preferences) => {
      if (!active) return;
      setClientPreferences(preferences);
      setClientPreferencesError(null);
    }).catch((error: unknown) => {
      if (active) setClientPreferencesError(error instanceof Error ? error.message : 'Không thể tải Travel Style và Hotel Tier.');
    });
    return () => {
      active = false;
    };
  }, []);

  const selectableTravelStyles = useMemo(() => {
    const activeStyles = travelStyles.filter((style) => style.isActive);
    if (brief.style && !activeStyles.some((style) => style.label === brief.style)) {
      return [{ code: 'current-style', label: brief.style, sortOrder: -1, isActive: false } satisfies TravelStyle, ...activeStyles];
    }
    return activeStyles;
  }, [brief.style, travelStyles]);

  const selectableHotelTiers = useMemo(() => {
    if (brief.hotelTier && !hotelTiers.includes(brief.hotelTier)) return [brief.hotelTier, ...hotelTiers];
    return hotelTiers;
  }, [brief.hotelTier, hotelTiers]);

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

  function applyTravelStyles(styles: TravelStyle[]) {
    setClientPreferences((current) => ({
      travelStyles: styles,
      hotelTiers: current?.hotelTiers ?? [],
    }));
    setBrief((current) => current.style && styles.some((style) => style.isActive && style.label === current.style)
      ? current
      : { ...current, style: styles.find((style) => style.isActive)?.label ?? current.style });
  }

  async function saveTravelStyles(styles: TravelStyle[]) {
    setTravelStylesSaving(true);
    try {
      const response = await fetch('/api/customers/travel-styles', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styles }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: TravelStyle[]; error?: string };
      if (!response.ok || !body.ok || !Array.isArray(body.data)) throw new Error(body.error ?? 'Không thể lưu Travel Style.');
      applyTravelStyles(body.data);
    } finally {
      setTravelStylesSaving(false);
    }
  }

  async function deleteTravelStyle(style: TravelStyle) {
    setTravelStylesSaving(true);
    try {
      const response = await fetch(`/api/customers/travel-styles?${new URLSearchParams({ code: style.code }).toString()}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: TravelStyle[]; error?: string };
      if (!response.ok || !body.ok || !Array.isArray(body.data)) throw new Error(body.error ?? 'Không thể xóa Travel Style.');
      applyTravelStyles(body.data);
    } finally {
      setTravelStylesSaving(false);
    }
  }

  function addChildTag(tag: string) {
    setBrief((b) => ({
      ...b,
      childAges: b.childAges ? `${b.childAges}, ${tag}` : tag,
    }));
  }

  function handleStartDateChange(value: string) {
    if (value && !isTravelDateNotPast(value)) {
      toast.warning(tp('tour-design', 'briefDatePastWarning'));
      setBrief({ ...brief, startDate: '' });
      return;
    }
    setBrief({ ...brief, startDate: value });
  }

  function handleNext() {
    if (brief.startDate && !isTravelDateNotPast(brief.startDate)) {
      toast.warning(tp('tour-design', 'briefDatePastWarning'));
      return;
    }
    if (brief.nationality.trim() && !isKnownNationality(brief.nationality)) {
      toast.warning(tp('tour-design', 'briefNationalityWarning'));
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
        <span className="card-title">{tp('tour-design', 'briefStepTitle')}</span>
      </div>
      <div className="card-body">
        <fieldset disabled={!canWrite} style={{ border: 'none', padding: 0, margin: 0 }}>
          <div className="td-form-grid td-form-grid-3">
            <div className="fg">
              <label className="lbl">{tp('tour-design', 'briefClientType')}</label>
              <select value={clientType} onChange={(e) => setClientType(e.target.value as 'b2c' | 'b2b')}>
                <option value="b2c">{tp('tour-design', 'briefB2c')}</option>
                <option value="b2b">{tp('tour-design', 'briefB2b')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('tour-design', 'briefCustomer')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ flex: 1 }} value={custId} onChange={(e) => (e.target.value ? onSelectCustomer(e.target.value) : onSelectCustomer(''))}>
                  <option value="">{tp('tour-design', 'briefNewClient')}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button className="btn btn-s btn-sm" type="button" onClick={onNewCustomer}>
                  {tp('tour-design', 'briefNewButton')}
                </button>
              </div>
            </div>
            {clientType === 'b2b' && (
              <div className="fg">
                <label className="lbl" style={{ color: 'var(--pur)' }}>
                  ★ {tp('tour-design', 'briefAgentName')}
                </label>
                <input
                  list="td-agent-list"
                  value={brief.agentRef}
                  onChange={(e) => setBrief({ ...brief, agentRef: e.target.value })}
                  placeholder={tp('tour-design', 'briefAgentPlaceholder')}
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
              <label className="lbl">{tp('tour-design', 'briefNumGuests')}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  style={{ flex: 1 }}
                  value={paxMode === 'custom' ? CUSTOM_PAX_VALUE : String(brief.pax)}
                  onChange={(e) => handlePaxSelect(e.target.value)}
                  aria-label={tp('tour-design', 'briefNumGuests')}
                >
                  {PAX_PRESETS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  <option value={CUSTOM_PAX_VALUE}>{tp('tour-design', 'briefCustomPax')}</option>
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
                    aria-label={tp('tour-design', 'briefCustomPax')}
                    title={tp('tour-design', 'briefCustomPaxTitle')}
                  />
                )}
              </div>
              {paxMode === 'custom' && (
                <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 4 }}>
                  {tpl('tour-design', 'briefCustomPaxHint', { pax: brief.pax })}
                </div>
              )}
            </div>
            <div className="fg">
              <label className="lbl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {tp('tour-design', 'briefTravelStyle')}
                {canManageTravelStyles && <button type="button" className="btn btn-sm" style={{ minWidth: 30, padding: '1px 6px' }} onClick={() => setTravelStyleManagerOpen(true)} disabled={clientPreferencesLoading || Boolean(clientPreferencesError) || travelStylesSaving} aria-label="Manage Travel Styles" title="Manage Travel Styles">✎</button>}
              </label>
              <select value={brief.style} onChange={(e) => setBrief({ ...brief, style: e.target.value })}>
                {selectableTravelStyles.map((style) => (
                  <option key={style.code} value={style.label}>{style.label}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('tour-design', 'briefTravelMonth')}</label>
              <input
                type="month"
                value={travelMonthInputValue(brief.travelMonth)}
                onChange={(e) => setBrief({ ...brief, travelMonth: e.target.value })}
              />
              {brief.travelMonth && !isIsoTravelMonth(brief.travelMonth) && (
                <div className="nc-form-hint">Legacy value kept: {brief.travelMonth}</div>
              )}
            </div>
            <div className="fg">
              <label className="lbl">{tp('tour-design', 'briefHotelTier')}</label>
              <select value={brief.hotelTier} onChange={(e) => setBrief({ ...brief, hotelTier: e.target.value })} disabled={clientPreferencesLoading}>
                <option value="">{clientPreferencesLoading ? 'Loading Hotel Tiers…' : '— Select Hotel Tier —'}</option>
                {selectableHotelTiers.map((tier) => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
              {clientPreferencesError && <div className="nc-form-hint" style={{ color: 'var(--red)' }}>{clientPreferencesError}</div>}
            </div>
            <div className="fg">
              <label className="lbl">{tp('tour-design', 'briefGuideLanguage')}</label>
              <select value={brief.language} onChange={(e) => setBrief({ ...brief, language: e.target.value })}>
                {['English', 'French', 'German', 'Spanish', 'Italian'].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('tour-design', 'briefDomesticFlights')}</label>
              <select value={brief.flights} onChange={(e) => setBrief({ ...brief, flights: e.target.value })}>
                <option value="yes">{tp('tour-design', 'briefFlightsYes')}</option>
                <option value="no">{tp('tour-design', 'briefFlightsNo')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('tour-design', 'briefIntlFlights')}</label>
              <select value={brief.intlFlights} onChange={(e) => setBrief({ ...brief, intlFlights: e.target.value })}>
                <option value="not-included">{tp('tour-design', 'briefIntlNotIncluded')}</option>
                <option value="incl-economy">{tp('tour-design', 'briefIntlEconomy')}</option>
                <option value="incl-business">{tp('tour-design', 'briefIntlBusiness')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('tour-design', 'briefVisa')}</label>
              <select value={brief.visa} onChange={(e) => setBrief({ ...brief, visa: e.target.value })}>
                <option value="exempt">{tp('tour-design', 'briefVisaExempt')}</option>
                <option value="evisa-self">{tp('tour-design', 'briefVisaEvisaSelf')}</option>
                <option value="visa-us">{tp('tour-design', 'briefVisaArrange')}</option>
                <option value="voa">{tp('tour-design', 'briefVisaVoa')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('tour-design', 'briefBudgetRange')}</label>
              <select value={brief.budgetRange} onChange={(e) => setBrief({ ...brief, budgetRange: e.target.value })}>
                {['Under $1,000/pax', '$1,000–$2,000/pax', '$2,000–$3,500/pax', '$3,500–$6,000/pax', '$6,000+/pax'].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl" style={{ color: 'var(--g)' }}>
                {tp('tour-design', 'briefSalesPerson')}
              </label>
              <select value={brief.salesperson} onChange={(e) => setBrief({ ...brief, salesperson: e.target.value })}>
                <option value="">{tp('tour-design', 'briefNotAssigned')}</option>
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
              📅 {tp('tour-design', 'briefTravelDetails')}
            </div>
            <div className="td-form-grid td-form-grid-3">
              <div className="fg">
                <label className="lbl">{tp('tour-design', 'briefStartDate')}</label>
                <input
                  type="date"
                  min={todayIso}
                  value={brief.startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
              </div>
              <div className="fg">
                <label className="lbl">{tp('tour-design', 'briefNationality')}</label>
                <input
                  list="td-nationality-list"
                  value={brief.nationality}
                  onChange={(e) => setBrief({ ...brief, nationality: e.target.value })}
                  placeholder={tp('tour-design', 'briefNationalityPlaceholder')}
                  autoComplete="off"
                />
                <datalist id="td-nationality-list">
                  {NATIONALITIES.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>
              <div className="fg">
                <label className="lbl">{tp('tour-design', 'briefFirstTimeVn')}</label>
                <select value={firstTimeValue} onChange={(e) => setBrief({ ...brief, firstTime: e.target.value })}>
                  <option value="">{tp('tour-design', 'briefNotSpecified')}</option>
                  <option value="yes">{tp('tour-design', 'briefFirstTimeYes')}</option>
                  <option value="no">{tp('tour-design', 'briefFirstTimeNo')}</option>
                </select>
              </div>
            </div>
            <div className="td-form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
              <div className="fg">
                <label className="lbl">{tp('tour-design', 'briefInterests')}</label>
                <textarea
                  rows={2}
                  value={brief.interestsText}
                  onChange={(e) => setBrief({ ...brief, interestsText: e.target.value })}
                  placeholder={tp('tour-design', 'briefInterestsPlaceholder')}
                />
              </div>
              <div className="fg">
                <label className="lbl">{tp('tour-design', 'briefAvoid')}</label>
                <textarea rows={2} value={brief.avoid} onChange={(e) => setBrief({ ...brief, avoid: e.target.value })} placeholder={tp('tour-design', 'briefAvoidPlaceholder')} />
              </div>
            </div>
          </div>

          <div className="td-children-box">
            <div className="td-section-lbl td-children-title">👧 {tp('tour-design', 'briefChildren')}</div>
            <div className="td-form-grid td-form-grid-3">
              <div className="fg">
                <label className="lbl">{tp('tour-design', 'briefNumChildren')}</label>
                <select value={brief.children} onChange={(e) => setBrief({ ...brief, children: +e.target.value })}>
                  <option value={0}>{tp('tour-design', 'briefNoChildren')}</option>
                  <option value={1}>{tp('tour-design', 'briefOneChild')}</option>
                  <option value={2}>{tp('tour-design', 'briefTwoChildren')}</option>
                  <option value={3}>{tp('tour-design', 'briefThreeChildren')}</option>
                  <option value={4}>{tp('tour-design', 'briefFourPlusChildren')}</option>
                </select>
              </div>
              {showChildren && (
                <>
                  <div className="fg">
                    <label className="lbl">{tp('tour-design', 'briefChildAges')}</label>
                    <input value={brief.childAges} onChange={(e) => setBrief({ ...brief, childAges: e.target.value })} placeholder={tp('tour-design', 'briefChildAgesPlaceholder')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">{tp('tour-design', 'briefChildDiet')}</label>
                    <input value={brief.childDiet} onChange={(e) => setBrief({ ...brief, childDiet: e.target.value })} placeholder={tp('tour-design', 'briefChildDietPlaceholder')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">{tp('tour-design', 'briefChildPrefs')}</label>
                    <input value={brief.childPrefs} onChange={(e) => setBrief({ ...brief, childPrefs: e.target.value })} placeholder={tp('tour-design', 'briefChildPrefsPlaceholder')} />
                  </div>
                </>
              )}
            </div>
            {showChildren && (
              <div className="td-child-tags">
                <span style={{ fontSize: 11, color: 'var(--amb)', fontWeight: 600, marginRight: 6 }}>{tp('tour-design', 'briefQuickTags')}</span>
                {CHILD_TAGS.map((t) => (
                  <span key={t} className="child-tag" onClick={() => addChildTag(t)} role="button" tabIndex={0}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="fg" style={{ marginTop: 12 }}>
            <label className="lbl">{tp('tour-design', 'briefSpecialRequests')}</label>
            <textarea
              value={brief.specialRequests}
              onChange={(e) => setBrief({ ...brief, specialRequests: e.target.value })}
              placeholder={tp('tour-design', 'briefSpecialRequestsPlaceholder')}
            />
          </div>

          <div className="fg" style={{ marginTop: 8 }}>
            <label className="lbl">{tp('tour-design', 'briefDuration')}</label>
            <input
              list="td-duration-list"
              value={brief.duration}
              onChange={(e) => setBrief({ ...brief, duration: e.target.value })}
              placeholder={tp('tour-design', 'briefDurationPlaceholder')}
              autoComplete="off"
            />
            <datalist id="td-duration-list">
              {DURATION_PRESETS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 4 }}>
              {tp('tour-design', 'briefDurationHint')}
            </div>
          </div>

          <div className="fg">
            <label className="lbl">{tp('tour-design', 'briefPrimaryRegion')}</label>
            <select value={brief.region} onChange={(e) => setBrief({ ...brief, region: e.target.value })}>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {tp('tour-design', r.key)}
                </option>
              ))}
            </select>
          </div>

          <div className="info-bar" style={{ marginTop: 14 }}>
            {summary || tp('tour-design', 'briefSummaryEmpty')}
          </div>

          {aiPanel && (
            <div className="td-ai-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pur)' }}>✦ {tp('tour-design', 'briefAiSuggestTitle')}</span>
                <button type="button" onClick={onCloseAi} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m)' }}>
                  ✕
                </button>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiPanel}</div>
            </div>
          )}
        </fieldset>

        <div className="td-nav">
          <button className="btn btn-pu btn-sm" type="button" onClick={onAiSuggest} disabled={!canWrite}>
            ✦ {tp('tour-design', 'briefAiSuggestButton')}
          </button>
          <button className="btn btn-p" type="button" onClick={handleNext}>
            {tp('tour-design', 'briefNextOutline')}
          </button>
        </div>
      </div>
      <TravelStyleManagerModal
        open={travelStyleManagerOpen}
        styles={travelStyles}
        saving={travelStylesSaving}
        onClose={() => setTravelStyleManagerOpen(false)}
        onSave={saveTravelStyles}
        onDelete={deleteTravelStyle}
      />
    </div>
  );
}
