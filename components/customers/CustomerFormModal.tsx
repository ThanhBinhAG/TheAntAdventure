'use client';

import { useEffect, useMemo, useState } from 'react';
import { COUNTRIES, isKnownCountry, normalizeCountry } from '@/lib/customers/countries';
import {
  AGENT_DATALIST,
  EMPTY_CUSTOMER_FORM,
  SALES_PEOPLE,
  customerToForm,
  type CustomerFormData,
} from '@/lib/customers/customer-form';
import {
  isValidEmail,
  isValidGuestCount,
  isValidPhone,
  sanitizePhoneInput,
} from '@/lib/customers/customer-validation';
import { findDuplicateCustomerByEmail } from '@/lib/customers/customer-onboarding';
import {
  NATIONALITIES,
  isKnownNationality,
  normalizeNationality,
} from '@/lib/customers/nationalities';
import { isIsoTravelMonth, travelMonthInputValue } from '@/lib/core/travel-month';
import type { Customer } from '@/lib/types';
import type { CustomerSaveOutcome } from '@/hooks/useRegisterCustomer';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';
import SearchableSelect from '@/components/SearchableSelect';
import TravelStyleManagerModal from '@/components/customers/TravelStyleManagerModal';
import { DEFAULT_TRAVEL_STYLES, type TravelStyle } from '@/lib/customers/travel-styles';

const CHILD_TAGS = ['Infant 0–2', 'Toddler 3–5', 'Child 6–9', 'Pre-teen 10–12', 'Teen 13–17'];
const EMAIL_CHECK_DEBOUNCE_MS = 400;

type FormErrorField = 'name' | 'email' | 'phone' | 'whatsapp' | 'country' | 'nat' | 'adults';

export type CustomerFormSavePayload = {
  form: CustomerFormData;
  mode: 'add' | 'edit';
  logInquiry: boolean;
  existingCustomer?: Customer;
  flagTourDesign?: boolean;
};

export type CustomerFormSaveResult = boolean | CustomerSaveOutcome;

type EmailCheckStatus = 'idle' | 'checking' | 'available' | 'duplicate';

interface CustomerFormModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  customer?: Customer | null;
  customers: Customer[];
  onClose: () => void;
  onSave: (
    payload: CustomerFormSavePayload,
  ) => CustomerFormSaveResult | Promise<CustomerFormSaveResult>;
  canManageTravelStyles?: boolean;
}

function initialForm(mode: CustomerFormModalProps['mode'], customer: CustomerFormModalProps['customer']) {
  return customer && mode === 'edit' ? customerToForm(customer) : { ...EMPTY_CUSTOMER_FORM };
}

function fieldDomId(field: FormErrorField) {
  return `nc-field-${field}`;
}

function revealField(field: FormErrorField) {
  requestAnimationFrame(() => {
    const el = document.getElementById(fieldDomId(field));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el instanceof HTMLElement) {
      el.focus({ preventScroll: true });
    }
  });
}

export default function CustomerFormModal({ open, mode, customer, customers, onClose, onSave, canManageTravelStyles = false }: CustomerFormModalProps) {
  const formKey = `${open}-${mode}-${customer ? JSON.stringify(customer) : ''}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<CustomerFormData>(() => initialForm(mode, customer));
  const [logInquiry, setLogInquiry] = useState(true);
  const [emailCheck, setEmailCheck] = useState<EmailCheckStatus>('idle');
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<FormErrorField | null>(null);
  const [previousEmail, setPreviousEmail] = useState(form.email);
  const [travelStyles, setTravelStyles] = useState<TravelStyle[]>(DEFAULT_TRAVEL_STYLES);
  const [travelStyleManagerOpen, setTravelStyleManagerOpen] = useState(false);
  const [travelStylesSaving, setTravelStylesSaving] = useState(false);
  const [hotelTiers, setHotelTiers] = useState<string[]>([]);
  const [hotelTiersLoading, setHotelTiersLoading] = useState(false);
  const [hotelTiersError, setHotelTiersError] = useState<string | null>(null);

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    setForm(initialForm(mode, customer));
    setLogInquiry(true);
    setEmailCheck('idle');
    setDuplicateCustomer(null);
    setFormError(null);
    setErrorField(null);
  }

  if (form.email !== previousEmail) {
    setPreviousEmail(form.email);
    setEmailCheck('idle');
    setDuplicateCustomer(null);
  }

  const { language, tp, tpl, tc } = useLanguage();
  const baselineForm = useMemo(() => initialForm(mode, customer), [formKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useFormDirty(
    open,
    { form: baselineForm, logInquiry: true },
    { form, logInquiry },
    undefined,
    formKey,
  );
  const { requestClose } = useConfirmClose({ open, dirty, onClose, language });

  const excludeId = mode === 'edit' && customer ? customer.id : undefined;
  const emailTrimmed = form.email.trim();
  const localDuplicate =
    open && emailTrimmed && isValidEmail(emailTrimmed)
      ? findDuplicateCustomerByEmail(customers, emailTrimmed, excludeId)
      : null;

  // Server email-check only — local duplicates are derived above (no sync setState in effect).
  useEffect(() => {
    if (!open || !emailTrimmed || !isValidEmail(emailTrimmed) || localDuplicate) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setEmailCheck('checking');
      const params = new URLSearchParams({ email: emailTrimmed });
      if (excludeId) params.set('excludeId', excludeId);

      void fetch(`/api/customers/email-check?${params.toString()}`, {
        credentials: 'same-origin',
        signal: controller.signal,
      })
        .then(async (res) => {
          const body = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            available?: boolean;
            existing?: Customer | null;
          };
          if (!res.ok || !body.ok) {
            setEmailCheck('idle');
            setDuplicateCustomer(null);
            return;
          }
          if (body.available === false && body.existing?.id) {
            setEmailCheck('duplicate');
            setDuplicateCustomer(body.existing);
            return;
          }
          setEmailCheck('available');
          setDuplicateCustomer(null);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setEmailCheck('idle');
          setDuplicateCustomer(null);
        });
    }, EMAIL_CHECK_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [emailTrimmed, excludeId, localDuplicate, open]);

  useEffect(() => {
    if (!open || !canManageTravelStyles) return;
    const controller = new AbortController();
    void fetch('/api/customers/travel-styles', { credentials: 'same-origin', signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: TravelStyle[] };
        if (response.ok && body.ok && Array.isArray(body.data) && body.data.length) setTravelStyles(body.data);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setTravelStyles(DEFAULT_TRAVEL_STYLES);
      });
    return () => controller.abort();
  }, [canManageTravelStyles, open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHotelTiersLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHotelTiersError(null);
    void fetch('/api/customers/hotel-tiers', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: string[]; error?: string };
        if (!response.ok || !body.ok || !Array.isArray(body.data)) throw new Error(body.error ?? 'Không thể tải Hotel Tier.');
        setHotelTiers(body.data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setHotelTiers([]);
        setHotelTiersError(error instanceof Error ? error.message : 'Không thể tải Hotel Tier.');
      })
      .finally(() => setHotelTiersLoading(false));
    return () => controller.abort();
  }, [open]);

  const selectableTravelStyles = useMemo(() => {
    return travelStyles.filter((style) => style.isActive);
  }, [travelStyles]);
  const selectableHotelTiers = useMemo(() => {
    if (mode === 'edit' && form.hotelTier && !hotelTiers.includes(form.hotelTier)) {
      return [form.hotelTier, ...hotelTiers];
    }
    return hotelTiers;
  }, [form.hotelTier, hotelTiers, mode]);

  if (!open) return null;

  const showChildren = Number(form.numChildren) > 0;
  const emailStatus: EmailCheckStatus = localDuplicate ? 'duplicate' : emailCheck;
  const duplicateForUi = localDuplicate ?? duplicateCustomer;
  const emailBlocked = emailStatus === 'duplicate';
  const saveDisabled = emailBlocked || emailStatus === 'checking';
  const emailInvalid = emailBlocked || errorField === 'email';
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

  function applyTravelStyles(styles: TravelStyle[]) {
    setTravelStyles(styles);
    setForm((current) => current.style && styles.some((style) => style.isActive && style.label === current.style)
      ? current
      : { ...current, style: styles.find((style) => style.isActive)?.label ?? current.style });
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

  function clearErrors() {
    setFormError(null);
    setErrorField(null);
  }

  function fail(field: FormErrorField | null, message: string) {
    setFormError(message);
    setErrorField(field);
    if (field) revealField(field);
  }

  function set<K extends keyof CustomerFormData>(key: K, value: CustomerFormData[K]) {
    clearErrors();
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addChildTag(tag: string) {
    set('childAges', form.childAges ? `${form.childAges}, ${tag}` : tag);
  }

  function fieldInvalid(field: FormErrorField) {
    return errorField === field || (field === 'email' && emailBlocked);
  }

  async function handleSave() {
    clearErrors();

    if (!form.name.trim()) {
      fail('name', tp('customers', 'errNameRequired'));
      return;
    }
    if (!form.email.trim()) {
      fail('email', tp('customers', 'errEmailRequired'));
      return;
    }
    if (!isValidEmail(form.email)) {
      fail('email', tp('customers', 'errEmailInvalid'));
      return;
    }
    if (form.phone.trim() && !isValidPhone(form.phone)) {
      fail('phone', tp('customers', 'errPhoneInvalid'));
      return;
    }
    if (form.whatsapp.trim() && !isValidPhone(form.whatsapp)) {
      fail('whatsapp', tp('customers', 'errWhatsappInvalid'));
      return;
    }
    if (!isKnownCountry(form.country)) {
      fail('country', tp('customers', 'errCountryRequired'));
      return;
    }
    if (form.nat.trim() && !isKnownNationality(form.nat)) {
      fail('nat', tp('customers', 'errNatRequired'));
      return;
    }
    if (!isValidGuestCount(form.adults)) {
      fail('adults', tp('customers', 'errGuestCountInvalid'));
      return;
    }

    const excludeId = mode === 'edit' && customer ? customer.id : undefined;
    const dup = findDuplicateCustomerByEmail(customers, form.email, excludeId);
    if (dup) {
      setEmailCheck('duplicate');
      setDuplicateCustomer(dup);
      fail('email', tpl('customers', 'duplicateEmail', { name: dup.name, id: dup.id }));
      return;
    }

    const normalized: CustomerFormData = {
      ...form,
      country: normalizeCountry(form.country),
      nat: form.nat.trim() ? normalizeNationality(form.nat) : '',
    };

    const saved = await onSave({
      form: normalized,
      mode,
      logInquiry: mode === 'add' ? logInquiry : false,
      existingCustomer: mode === 'edit' && customer ? customer : undefined,
    });

    if (saved === true) {
      onClose();
      return;
    }

    if (saved && typeof saved === 'object' && saved.ok === true) {
      onClose();
      return;
    }

    if (
      saved &&
      typeof saved === 'object' &&
      saved.ok === false &&
      saved.error === 'duplicate_email'
    ) {
      setEmailCheck('duplicate');
      setDuplicateCustomer(saved.existing);
      fail('email', saved.message || tpl('customers', 'duplicateEmail', { name: saved.existing.name, id: saved.existing.id }));
      return;
    }

    if (
      saved &&
      typeof saved === 'object' &&
      saved.ok === false &&
      saved.error === 'save_failed'
    ) {
      fail(null, saved.message);
      return;
    }

    if (saved === false) {
      fail(null, tp('customers', 'toastSaveFailed'));
    }
  }

  return (
    <div className="overlay open" onClick={() => void requestClose()}>
      <div className="modal nc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green nc-modal-hd">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
              {mode === 'edit' ? tp('customers', 'formTitleEdit') : tp('customers', 'formTitleAdd')}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>
              {mode === 'edit' ? tp('customers', 'formSubtitleEdit') : tp('customers', 'formSubtitleAdd')}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={() => void requestClose()}>
            ✕
          </button>
        </div>
        <div className="nc-modal-body">
          <div className="nc-section nc-section-type">
            <div className="nc-section-title">{tp('customers', 'formSectionType')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 11 }}>
              <div className="fg">
                <label className="lbl">{tp('customers', 'formClientType')}</label>
                <select value={form.clientType} onChange={(e) => set('clientType', e.target.value as 'b2b' | 'b2c')}>
                  <option value="b2c">{tp('customers', 'formClientTypeB2c')}</option>
                  <option value="b2b">{tp('customers', 'formClientTypeB2b')}</option>
                </select>
              </div>
              {form.clientType === 'b2b' && (
                <div className="fg">
                  <label className="lbl" style={{ color: 'var(--pur)' }}>
                    {tp('customers', 'formAgentName')}
                  </label>
                  <input
                    list="nc-agent-list"
                    value={form.agentName}
                    onChange={(e) => set('agentName', e.target.value)}
                    placeholder={tp('customers', 'formAgentPlaceholder')}
                    style={{ borderColor: 'var(--pur)' }}
                  />
                  <datalist id="nc-agent-list">
                    {AGENT_DATALIST.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>
              )}
              <div className="fg">
                <label className="lbl">{tp('customers', 'formSalesPerson')}</label>
                <select value={form.salesperson} onChange={(e) => set('salesperson', e.target.value)}>
                  <option value="">{tp('customers', 'formAssignSales')}</option>
                  {SALES_PEOPLE.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="nc-section-title">{tp('customers', 'formSectionContact')}</div>
          <div className="nc-grid-3" style={{ marginBottom: 16 }}>
            <div className="fg" style={{ gridColumn: '1 / 3' }}>
              <label className={`lbl${fieldInvalid('name') ? ' nc-field-invalid-label' : ''}`}>
                {tp('customers', 'formFullName')} <span className="req">*</span>
              </label>
              <input
                id={fieldDomId('name')}
                className={fieldInvalid('name') ? 'nc-field-invalid' : undefined}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={tp('customers', 'formNamePlaceholder')}
                aria-invalid={fieldInvalid('name')}
              />
            </div>
            <div className="fg">
              <label htmlFor={fieldDomId('country')} className={`lbl${fieldInvalid('country') ? ' nc-field-invalid-label' : ''}`}>{tp('customers', 'formCountry')}</label>
              <SearchableSelect
                id={fieldDomId('country')}
                value={form.country}
                options={COUNTRIES}
                onChange={(value) => set('country', value)}
                placeholder={tp('customers', 'formTypeToSearch')}
                invalid={fieldInvalid('country')}
              />
            </div>
            <div className="fg">
              <label className={`lbl${emailInvalid ? ' nc-field-invalid-label' : ''}`}>
                {tp('customers', 'formEmail')} <span className="req">*</span>
              </label>
              <input
                id={fieldDomId('email')}
                className={emailInvalid ? 'nc-field-invalid' : undefined}
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder={tp('customers', 'formEmailPlaceholder')}
                aria-invalid={emailInvalid}
              />
              {emailStatus === 'checking' && form.email.trim() && (
                <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 4 }}>{tp('customers', 'formCheckingEmail')}</div>
              )}
              {emailBlocked && duplicateForUi && (
                <div style={{ fontSize: 11, color: '#C0392B', marginTop: 4, lineHeight: 1.45, fontWeight: 600 }}>
                  {tpl('customers', 'duplicateEmail', { name: duplicateForUi.name, id: duplicateForUi.id })}
                </div>
              )}
              {emailStatus === 'available' && form.email.trim() && !emailInvalid && (
                <div style={{ fontSize: 11, color: 'var(--g)', marginTop: 4 }}>{tp('customers', 'formEmailAvailable')}</div>
              )}
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('phone') ? ' nc-field-invalid-label' : ''}`}>{tp('customers', 'formPhone')}</label>
              <input
                id={fieldDomId('phone')}
                className={fieldInvalid('phone') ? 'nc-field-invalid' : undefined}
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set('phone', sanitizePhoneInput(e.target.value))}
                placeholder={tp('customers', 'formPhonePlaceholder')}
                aria-invalid={fieldInvalid('phone')}
              />
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('whatsapp') ? ' nc-field-invalid-label' : ''}`}>{tp('customers', 'formWhatsapp')}</label>
              <input
                id={fieldDomId('whatsapp')}
                className={fieldInvalid('whatsapp') ? 'nc-field-invalid' : undefined}
                type="tel"
                inputMode="tel"
                value={form.whatsapp}
                onChange={(e) => set('whatsapp', sanitizePhoneInput(e.target.value))}
                placeholder={tp('customers', 'formWhatsappPlaceholder')}
                aria-invalid={fieldInvalid('whatsapp')}
              />
            </div>
            <div className="fg">
              <label htmlFor={fieldDomId('nat')} className={`lbl${fieldInvalid('nat') ? ' nc-field-invalid-label' : ''}`}>{tp('customers', 'formNationality')}</label>
              <SearchableSelect
                id={fieldDomId('nat')}
                value={form.nat}
                options={NATIONALITIES}
                onChange={(value) => set('nat', value)}
                placeholder={tp('customers', 'formTypeToSearch')}
                invalid={fieldInvalid('nat')}
              />
            </div>
            <div className="fg">
              <label className="lbl">{tp('customers', 'formSource')}</label>
              <select value={form.source} onChange={(e) => set('source', e.target.value)}>
                {['Referral', 'Website', 'Agent', 'Virtuoso', 'Abercrombie', 'Social Media', 'Walk-in', 'Direct'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('customers', 'formGuideLanguage')}</label>
              <select value={form.lang} onChange={(e) => set('lang', e.target.value)}>
                {['English', 'French', 'German', 'Spanish', 'Italian'].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="nc-section-title">{tp('customers', 'formSectionTravelProfile')}</div>
          <div className="nc-grid-3" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {tp('customers', 'formTravelStyle')}
                {canManageTravelStyles && <button type="button" className="btn btn-sm" style={{ minWidth: 30, padding: '1px 6px' }} onClick={() => setTravelStyleManagerOpen(true)} aria-label="Manage Travel Styles" title="Manage Travel Styles">✎</button>}
              </label>
              <select value={form.style} onChange={(e) => set('style', e.target.value)}>
                {selectableTravelStyles.map((style) => (
                  <option key={style.code} value={style.label}>{style.label}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('customers', 'formHotelTier')}</label>
              <select value={form.hotelTier} onChange={(e) => set('hotelTier', e.target.value)} disabled={hotelTiersLoading}>
                <option value="">{hotelTiersLoading ? 'Loading Hotel Tiers…' : '— Select Hotel Tier —'}</option>
                {selectableHotelTiers.map((tier) => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
              {hotelTiersError && <div className="nc-form-hint" style={{ color: 'var(--red)' }}>{hotelTiersError}</div>}
            </div>
            <div className="fg">
              <label className="lbl">{tp('customers', 'formBudgetRange')}</label>
              <select value={form.budget} onChange={(e) => set('budget', e.target.value)}>
                {['Under $1,000/pax', '$1,000–$2,000/pax', '$2,000–$3,500/pax', '$3,500–$6,000/pax', '$6,000+/pax'].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('customers', 'formTravelMonth')}</label>
              <input
                type="month"
                value={travelMonthInputValue(form.travelMonth)}
                onChange={(e) => set('travelMonth', e.target.value)}
              />
              {form.travelMonth && !isIsoTravelMonth(form.travelMonth) && (
                <div className="nc-form-hint">Legacy value kept: {form.travelMonth}</div>
              )}
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('adults') ? ' nc-field-invalid-label' : ''}`}>{tp('customers', 'formNumGuests')}</label>
              <input
                id={fieldDomId('adults')}
                className={fieldInvalid('adults') ? 'nc-field-invalid' : undefined}
                type="number"
                min="1"
                max="9999"
                step="1"
                inputMode="numeric"
                value={form.adults}
                onChange={(e) => set('adults', e.target.value)}
                aria-invalid={fieldInvalid('adults')}
              />
            </div>
            <div className="fg">
              <label className="lbl">{tp('customers', 'formFirstTimeVn')}</label>
              <select value={form.firstTime === 'unknown' ? '' : form.firstTime} onChange={(e) => set('firstTime', e.target.value)}>
                <option value="">{tp('customers', 'formNotSpecified')}</option>
                <option value="yes">{tp('customers', 'formFirstVisitYes')}</option>
                <option value="no">{tp('customers', 'formFirstVisitNo')}</option>
              </select>
            </div>
          </div>

          <div className="nc-section-title">{tp('customers', 'formSectionLogistics')}</div>
          <div className="nc-grid-3" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">{tp('customers', 'formDomesticFlights')}</label>
              <select value={form.flights} onChange={(e) => set('flights', e.target.value)}>
                <option value="yes">{tp('customers', 'formFlightsYes')}</option>
                <option value="no">{tp('customers', 'formFlightsNo')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('customers', 'formIntlFlights')}</label>
              <select value={form.intlFlights} onChange={(e) => set('intlFlights', e.target.value)}>
                <option value="not-included">{tp('customers', 'formIntlNotIncluded')}</option>
                <option value="incl-economy">{tp('customers', 'formIntlEconomy')}</option>
                <option value="incl-business">{tp('customers', 'formIntlBusiness')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('customers', 'formVisa')}</label>
              <select value={form.visaStatus} onChange={(e) => set('visaStatus', e.target.value)}>
                <option value="exempt">{tp('customers', 'formVisaExempt')}</option>
                <option value="evisa-self">{tp('customers', 'formVisaEvisaSelf')}</option>
                <option value="visa-us">{tp('customers', 'formVisaUs')}</option>
                <option value="voa">{tp('customers', 'formVisaVoa')}</option>
              </select>
            </div>
          </div>

          <div className="nc-section-title">{tp('customers', 'formSectionPreferences')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">{tp('customers', 'formInterests')}</label>
              <textarea value={form.interests} onChange={(e) => set('interests', e.target.value)} style={{ minHeight: 70 }} placeholder={tp('customers', 'formInterestsPlaceholder')} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('customers', 'formDonts')}</label>
              <textarea value={form.donts} onChange={(e) => set('donts', e.target.value)} style={{ minHeight: 70 }} placeholder={tp('customers', 'formDontsPlaceholder')} />
            </div>
          </div>

          <div className="nc-section nc-section-children">
            <div className="nc-section-title" style={{ color: 'var(--amb)' }}>
              {tp('customers', 'formSectionChildren')}
            </div>
            <div className="nc-grid-3">
              <div className="fg">
                <label className="lbl">{tp('customers', 'formNumChildren')}</label>
                <select value={form.numChildren} onChange={(e) => set('numChildren', e.target.value)}>
                  <option value="0">{tp('customers', 'formNoChildren')}</option>
                  <option value="1">{tp('customers', 'formOneChild')}</option>
                  <option value="2">{tp('customers', 'formTwoChildren')}</option>
                  <option value="3">{tp('customers', 'formThreeChildren')}</option>
                  <option value="4">{tp('customers', 'formFourPlusChildren')}</option>
                </select>
              </div>
              {showChildren && (
                <>
                  <div className="fg">
                    <label className="lbl">{tp('customers', 'formChildAges')}</label>
                    <input value={form.childAges} onChange={(e) => set('childAges', e.target.value)} placeholder={tp('customers', 'formChildAgesPlaceholder')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">{tp('customers', 'formChildDiet')}</label>
                    <input value={form.childDiet} onChange={(e) => set('childDiet', e.target.value)} placeholder={tp('customers', 'formChildDietPlaceholder')} />
                  </div>
                </>
              )}
            </div>
            {showChildren && (
              <>
                <div className="fg" style={{ marginTop: 10 }}>
                  <label className="lbl">{tp('customers', 'formChildPrefs')}</label>
                  <input value={form.childPrefs} onChange={(e) => set('childPrefs', e.target.value)} placeholder={tp('customers', 'formChildPrefsPlaceholder')} />
                </div>
                <div className="child-quick-tags">
                  <span style={{ fontSize: 11, color: 'var(--amb)', fontWeight: 600, marginRight: 6 }}>{tp('customers', 'formQuickAgeTags')}</span>
                  {CHILD_TAGS.map((tag) => (
                    <span key={tag} className="child-tag" onClick={() => addChildTag(tag)} role="button" tabIndex={0}>
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="nc-section-title">{tp('customers', 'formSectionNotes')}</div>
          <div className="fg" style={{ marginBottom: 8 }}>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ minHeight: 80 }} placeholder={tp('customers', 'formNotesPlaceholder')} />
          </div>

          {mode === 'add' && (
            <label className="fg" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={logInquiry} onChange={(e) => setLogInquiry(e.target.checked)} />
              <span style={{ fontSize: 12.5 }}>
                {tp('customers', 'formLogInquiry')}
              </span>
            </label>
          )}
        </div>

        <div className="nc-modal-ft">
          {formError ? (
            <div className="nc-form-error" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="nc-modal-ft-actions">
            <button className="btn btn-s" type="button" onClick={() => void requestClose()}>
              {tc('cancel')}
            </button>
            <button className="btn btn-p" type="button" onClick={() => void handleSave()} disabled={saveDisabled}>
              ✓ {mode === 'edit' ? tc('saveChanges') : tp('customers', 'formAddCustomer')}
            </button>
          </div>
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
