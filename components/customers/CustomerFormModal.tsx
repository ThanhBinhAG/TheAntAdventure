'use client';

import { useEffect, useState } from 'react';
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
  isValidPhone,
  sanitizePhoneInput,
} from '@/lib/customers/customer-validation';
import { findDuplicateCustomerByEmail, formatDuplicateEmailMessage } from '@/lib/customers/customer-onboarding';
import {
  NATIONALITIES,
  isKnownNationality,
  normalizeNationality,
} from '@/lib/customers/nationalities';
import type { Customer } from '@/lib/types';
import type { CustomerSaveOutcome } from '@/hooks/useRegisterCustomer';

const CHILD_TAGS = ['Infant 0–2', 'Toddler 3–5', 'Child 6–9', 'Pre-teen 10–12', 'Teen 13–17'];
const EMAIL_CHECK_DEBOUNCE_MS = 400;

type FormErrorField = 'name' | 'email' | 'phone' | 'whatsapp' | 'country' | 'nat';

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

export default function CustomerFormModal({ open, mode, customer, customers, onClose, onSave }: CustomerFormModalProps) {
  const formKey = `${open}-${mode}-${customer ? JSON.stringify(customer) : ''}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<CustomerFormData>(() => initialForm(mode, customer));
  const [logInquiry, setLogInquiry] = useState(true);
  const [emailCheck, setEmailCheck] = useState<EmailCheckStatus>('idle');
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<FormErrorField | null>(null);
  const [previousEmail, setPreviousEmail] = useState(form.email);

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

  if (!open) return null;

  const showChildren = Number(form.numChildren) > 0;
  const emailStatus: EmailCheckStatus = localDuplicate ? 'duplicate' : emailCheck;
  const duplicateForUi = localDuplicate ?? duplicateCustomer;
  const emailBlocked = emailStatus === 'duplicate';
  const saveDisabled = emailBlocked || emailStatus === 'checking';
  const emailInvalid = emailBlocked || errorField === 'email';

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
      fail('name', 'Please enter client name.');
      return;
    }
    if (!form.email.trim()) {
      fail('email', 'Please enter email.');
      return;
    }
    if (!isValidEmail(form.email)) {
      fail('email', 'Please enter a valid email address.');
      return;
    }
    if (form.phone.trim() && !isValidPhone(form.phone)) {
      fail('phone', 'Phone must contain numbers only (optional +, spaces, dashes).');
      return;
    }
    if (form.whatsapp.trim() && !isValidPhone(form.whatsapp)) {
      fail('whatsapp', 'WhatsApp must contain numbers only (optional +, spaces, dashes).');
      return;
    }
    if (!isKnownCountry(form.country)) {
      fail('country', 'Please choose a Country from the suggestion list.');
      return;
    }
    if (form.nat.trim() && !isKnownNationality(form.nat)) {
      fail('nat', 'Please choose a Nationality from the suggestion list.');
      return;
    }

    const excludeId = mode === 'edit' && customer ? customer.id : undefined;
    const dup = findDuplicateCustomerByEmail(customers, form.email, excludeId);
    if (dup) {
      setEmailCheck('duplicate');
      setDuplicateCustomer(dup);
      fail('email', formatDuplicateEmailMessage(dup));
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
      fail('email', saved.message || formatDuplicateEmailMessage(saved.existing));
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
      fail(null, 'Không thể lưu khách hàng.');
    }
  }

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal nc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green nc-modal-hd">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
              {mode === 'edit' ? 'Edit Customer' : 'Add New Customer'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>
              {mode === 'edit' ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="nc-modal-body">
          <div className="nc-section nc-section-type">
            <div className="nc-section-title">Client Type & Assignment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 11 }}>
              <div className="fg">
                <label className="lbl">Client Type</label>
                <select value={form.clientType} onChange={(e) => set('clientType', e.target.value as 'b2b' | 'b2c')}>
                  <option value="b2c">B2C — Direct Client</option>
                  <option value="b2b">B2B — Travel Agent</option>
                </select>
              </div>
              {form.clientType === 'b2b' && (
                <div className="fg">
                  <label className="lbl" style={{ color: 'var(--pur)' }}>
                    ★ Agent / Operator Name
                  </label>
                  <input
                    list="nc-agent-list"
                    value={form.agentName}
                    onChange={(e) => set('agentName', e.target.value)}
                    placeholder="e.g. Black Tomato..."
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
                <label className="lbl">Our Sales Person</label>
                <select value={form.salesperson} onChange={(e) => set('salesperson', e.target.value)}>
                  <option value="">— Assign sales person —</option>
                  {SALES_PEOPLE.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="nc-section-title">Contact</div>
          <div className="nc-grid-3" style={{ marginBottom: 16 }}>
            <div className="fg" style={{ gridColumn: '1 / 3' }}>
              <label className={`lbl${fieldInvalid('name') ? ' nc-field-invalid-label' : ''}`}>
                Full Name <span className="req">*</span>
              </label>
              <input
                id={fieldDomId('name')}
                className={fieldInvalid('name') ? 'nc-field-invalid' : undefined}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. James & Sarah Miller"
                aria-invalid={fieldInvalid('name')}
              />
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('country') ? ' nc-field-invalid-label' : ''}`}>Country</label>
              <input
                id={fieldDomId('country')}
                className={fieldInvalid('country') ? 'nc-field-invalid' : undefined}
                list="nc-country-list"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                placeholder="Type to search…"
                autoComplete="off"
                aria-invalid={fieldInvalid('country')}
              />
              <datalist id="nc-country-list">
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="fg">
              <label className={`lbl${emailInvalid ? ' nc-field-invalid-label' : ''}`}>
                Email <span className="req">*</span>
              </label>
              <input
                id={fieldDomId('email')}
                className={emailInvalid ? 'nc-field-invalid' : undefined}
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@example.com"
                aria-invalid={emailInvalid}
              />
              {emailStatus === 'checking' && form.email.trim() && (
                <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 4 }}>Checking email…</div>
              )}
              {emailBlocked && duplicateForUi && (
                <div style={{ fontSize: 11, color: '#C0392B', marginTop: 4, lineHeight: 1.45, fontWeight: 600 }}>
                  {formatDuplicateEmailMessage(duplicateForUi)}
                </div>
              )}
              {emailStatus === 'available' && form.email.trim() && !emailInvalid && (
                <div style={{ fontSize: 11, color: 'var(--g)', marginTop: 4 }}>Email available</div>
              )}
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('phone') ? ' nc-field-invalid-label' : ''}`}>Phone</label>
              <input
                id={fieldDomId('phone')}
                className={fieldInvalid('phone') ? 'nc-field-invalid' : undefined}
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set('phone', sanitizePhoneInput(e.target.value))}
                placeholder="+1 415 555 ..."
                aria-invalid={fieldInvalid('phone')}
              />
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('whatsapp') ? ' nc-field-invalid-label' : ''}`}>WhatsApp</label>
              <input
                id={fieldDomId('whatsapp')}
                className={fieldInvalid('whatsapp') ? 'nc-field-invalid' : undefined}
                type="tel"
                inputMode="tel"
                value={form.whatsapp}
                onChange={(e) => set('whatsapp', sanitizePhoneInput(e.target.value))}
                placeholder="If different from phone"
                aria-invalid={fieldInvalid('whatsapp')}
              />
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('nat') ? ' nc-field-invalid-label' : ''}`}>Nationality</label>
              <input
                id={fieldDomId('nat')}
                className={fieldInvalid('nat') ? 'nc-field-invalid' : undefined}
                list="nc-nationality-list"
                value={form.nat}
                onChange={(e) => set('nat', e.target.value)}
                placeholder="Type to search…"
                autoComplete="off"
                aria-invalid={fieldInvalid('nat')}
              />
              <datalist id="nc-nationality-list">
                {NATIONALITIES.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div className="fg">
              <label className="lbl">Source</label>
              <select value={form.source} onChange={(e) => set('source', e.target.value)}>
                {['Referral', 'Website', 'Agent', 'Virtuoso', 'Abercrombie', 'Social Media', 'Walk-in', 'Direct'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Guide Language</label>
              <select value={form.lang} onChange={(e) => set('lang', e.target.value)}>
                {['English', 'French', 'German', 'Spanish', 'Italian'].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="nc-section-title">Travel Profile</div>
          <div className="nc-grid-3" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">Travel Style</label>
              <select value={form.style} onChange={(e) => set('style', e.target.value)}>
                {['Luxury', 'Premium Cultural', 'Cultural', 'Adventure', 'Family', 'Culinary', 'Photography', 'Honeymoon'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Hotel Tier</label>
              <select value={form.hotelTier} onChange={(e) => set('hotelTier', e.target.value)}>
                <option>Boutique 4★</option>
                <option>Luxury 5★</option>
                <option>Standard 3-4★</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Budget Range</label>
              <select value={form.budget} onChange={(e) => set('budget', e.target.value)}>
                {['Under $1,000/pax', '$1,000–$2,000/pax', '$2,000–$3,500/pax', '$3,500–$6,000/pax', '$6,000+/pax'].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Expected Travel Month</label>
              <select value={form.travelMonth} onChange={(e) => set('travelMonth', e.target.value)}>
                <option value="">— Not decided —</option>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Number of Guests</label>
              <select value={form.adults} onChange={(e) => set('adults', e.target.value)}>
                {['1', '2', '3', '4', '5', '6', '8', '10', '12'].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">First Time in Vietnam?</label>
              <select value={form.firstTime === 'unknown' ? '' : form.firstTime} onChange={(e) => set('firstTime', e.target.value)}>
                <option value="">— Not specified —</option>
                <option value="yes">Yes — first visit</option>
                <option value="no">No — returning</option>
              </select>
            </div>
          </div>

          <div className="nc-section-title">Travel Logistics</div>
          <div className="nc-grid-3" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">Domestic Flights</label>
              <select value={form.flights} onChange={(e) => set('flights', e.target.value)}>
                <option value="yes">Yes — include flights</option>
                <option value="no">No — land only</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">International Flights</label>
              <select value={form.intlFlights} onChange={(e) => set('intlFlights', e.target.value)}>
                <option value="not-included">Not included — client arranges</option>
                <option value="incl-economy">Included — economy class</option>
                <option value="incl-business">Included — business class</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Visa</label>
              <select value={form.visaStatus} onChange={(e) => set('visaStatus', e.target.value)}>
                <option value="exempt">Visa exemption</option>
                <option value="evisa-self">E-visa — guest arranges</option>
                <option value="visa-us">Visa — we arrange</option>
                <option value="voa">Visa on arrival</option>
              </select>
            </div>
          </div>

          <div className="nc-section-title">Guest Preferences</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">Interests / Hobbies</label>
              <textarea value={form.interests} onChange={(e) => set('interests', e.target.value)} style={{ minHeight: 70 }} placeholder="Photography, cuisine, history..." />
            </div>
            <div className="fg">
              <label className="lbl">Don&apos;ts / Must Avoid</label>
              <textarea value={form.donts} onChange={(e) => set('donts', e.target.value)} style={{ minHeight: 70 }} placeholder="No seafood, avoid crowds..." />
            </div>
          </div>

          <div className="nc-section nc-section-children">
            <div className="nc-section-title" style={{ color: 'var(--amb)' }}>
              👧 Children
            </div>
            <div className="nc-grid-3">
              <div className="fg">
                <label className="lbl">Number of Children</label>
                <select value={form.numChildren} onChange={(e) => set('numChildren', e.target.value)}>
                  <option value="0">No children</option>
                  <option value="1">1 child</option>
                  <option value="2">2 children</option>
                  <option value="3">3 children</option>
                  <option value="4">4+ children</option>
                </select>
              </div>
              {showChildren && (
                <>
                  <div className="fg">
                    <label className="lbl">Children Ages</label>
                    <input value={form.childAges} onChange={(e) => set('childAges', e.target.value)} placeholder="e.g. 4, 8, 11 years old" />
                  </div>
                  <div className="fg">
                    <label className="lbl">Dietary / Allergies</label>
                    <input value={form.childDiet} onChange={(e) => set('childDiet', e.target.value)} placeholder="Nut allergy..." />
                  </div>
                </>
              )}
            </div>
            {showChildren && (
              <>
                <div className="fg" style={{ marginTop: 10 }}>
                  <label className="lbl">Child Activity Preferences</label>
                  <input value={form.childPrefs} onChange={(e) => set('childPrefs', e.target.value)} placeholder="Swimming, cooking class..." />
                </div>
                <div className="child-quick-tags">
                  <span style={{ fontSize: 11, color: 'var(--amb)', fontWeight: 600, marginRight: 6 }}>Quick age tags:</span>
                  {CHILD_TAGS.map((tag) => (
                    <span key={tag} className="child-tag" onClick={() => addChildTag(tag)} role="button" tabIndex={0}>
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="nc-section-title">Notes</div>
          <div className="fg" style={{ marginBottom: 8 }}>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ minHeight: 80 }} placeholder="Dietary restrictions, mobility, anniversaries..." />
          </div>

          {mode === 'add' && (
            <label className="fg" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={logInquiry} onChange={(e) => setLogInquiry(e.target.checked)} />
              <span style={{ fontSize: 12.5 }}>
                Log initial inquiry in Communications
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
            <button className="btn btn-s" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-p" type="button" onClick={() => void handleSave()} disabled={saveDisabled}>
              ✓ {mode === 'edit' ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
