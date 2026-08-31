'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { parseMoneyInput } from '@/lib/core/money';
import type { BookingInput } from '@/lib/bookings/booking-input';
import {
  EMPTY_BOOKING_FORM,
  validateBookingForm,
  type BookingFormData,
  type BookingFormErrorField,
} from '@/lib/bookings/booking-form';
import type { Customer } from '@/lib/types';
import type { CreateBookingOutcome } from '@/hooks/useCreateBooking';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

const BOOKING_STATUSES = [
  'Confirmed',
  'Deposit Paid',
  'Fully Paid',
  'On Tour',
  'Completed',
  'Cancelled',
] as const;

type BookingFormModalProps = {
  open: boolean;
  customers: Customer[];
  saving?: boolean;
  onClose: () => void;
  onCreate: (booking: BookingInput) => Promise<CreateBookingOutcome>;
};

function fieldDomId(field: BookingFormErrorField) {
  return `bk-field-${field}`;
}

function revealField(field: BookingFormErrorField) {
  requestAnimationFrame(() => {
    const el = document.getElementById(fieldDomId(field));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el instanceof HTMLElement) {
      el.focus({ preventScroll: true });
    }
  });
}

function computeNights(start: string, end: string): number | null {
  if (!start || !end) return null;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const nights = Math.round((e.getTime() - s.getTime()) / 86_400_000);
  return nights >= 0 ? nights : null;
}

export default function BookingFormModal({
  open,
  customers,
  saving = false,
  onClose,
  onCreate,
}: BookingFormModalProps) {
  const formKey = open ? 'open' : 'closed';
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<BookingFormData>({ ...EMPTY_BOOKING_FORM });
  const [totalInput, setTotalInput] = useState('');
  const [depositInput, setDepositInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<BookingFormErrorField | null>(null);

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    setForm({ ...EMPTY_BOOKING_FORM });
    setTotalInput('');
    setDepositInput('');
    setFormError(null);
    setErrorField(null);
  }

  const total = parseMoneyInput(totalInput, { absolute: true });
  const deposit = Math.min(parseMoneyInput(depositInput, { absolute: true }), total);
  const balance = Math.max(0, total - deposit);
  const nights = useMemo(() => computeNights(form.start, form.end), [form.start, form.end]);

  const { language } = useLanguage();
  const dirty = useFormDirty(
    open,
    { form: { ...EMPTY_BOOKING_FORM }, totalInput: '', depositInput: '' },
    { form, totalInput, depositInput },
    undefined,
    formKey,
  );
  const { requestClose } = useConfirmClose({ open, dirty, onClose, disabled: saving, language });

  if (!open) return null;

  function clearErrors() {
    setFormError(null);
    setErrorField(null);
  }

  function fail(field: BookingFormErrorField | null, message: string) {
    setFormError(message);
    setErrorField(field);
    if (field) revealField(field);
  }

  function fieldInvalid(field: BookingFormErrorField) {
    return errorField === field;
  }

  function set<K extends keyof BookingFormData>(key: K, value: BookingFormData[K]) {
    clearErrors();
    setForm((f) => ({ ...f, [key]: value }));
  }

  function formatMoneyBlur(raw: string, setter: (v: string) => void) {
    const n = parseMoneyInput(raw, { absolute: true });
    setter(n ? fmt(n) : '');
  }

  async function handleCreate() {
    clearErrors();

    const validated = validateBookingForm(form, totalInput, depositInput);
    if (!validated.ok) {
      fail(validated.field, validated.message);
      return;
    }

    const result = await onCreate({
      custId: form.custId,
      tour: form.tour.trim(),
      pax: form.pax,
      start: validated.start,
      end: validated.end,
      total: validated.total,
      deposit: validated.deposit,
      status: form.status,
      guide: form.guide.trim(),
      hotel: form.hotel.trim(),
      changes: [],
      guideAlertPending: false,
    });

    if (!result.ok) {
      fail(null, result.message);
      return;
    }

    onClose();
  }

  return (
    <div className="overlay open" onClick={() => void requestClose()}>
      <div className="modal nc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green nc-modal-hd">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>New Booking</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>
              Create a confirmed trip record for operations and finance
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={() => void requestClose()}>
            ✕
          </button>
        </div>

        <div className="nc-modal-body">
          <div className="nc-section-title">Trip</div>
          <div className="nc-grid-2" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className={`lbl${fieldInvalid('custId') ? ' nc-field-invalid-label' : ''}`}>
                Customer <span className="req">*</span>
              </label>
              <select
                id={fieldDomId('custId')}
                className={fieldInvalid('custId') ? 'nc-field-invalid' : undefined}
                value={form.custId}
                aria-invalid={fieldInvalid('custId')}
                onChange={(e) => set('custId', e.target.value)}
              >
                <option value="">— Select customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('tour') ? ' nc-field-invalid-label' : ''}`}>
                Tour Name <span className="req">*</span>
              </label>
              <input
                id={fieldDomId('tour')}
                className={fieldInvalid('tour') ? 'nc-field-invalid' : undefined}
                value={form.tour}
                aria-invalid={fieldInvalid('tour')}
                onChange={(e) => set('tour', e.target.value)}
                placeholder="North Vietnam Classic 12D"
              />
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('pax') ? ' nc-field-invalid-label' : ''}`}>Pax</label>
              <input
                id={fieldDomId('pax')}
                type="number"
                min={1}
                className={fieldInvalid('pax') ? 'nc-field-invalid' : undefined}
                value={form.pax}
                aria-invalid={fieldInvalid('pax')}
                onChange={(e) => set('pax', Number(e.target.value))}
              />
            </div>
            <div className="fg">
              <label className="lbl">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {BOOKING_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="nc-section-title">Travel Dates</div>
          <p className="nc-form-hint">
            Optional — leave blank if dates are not confirmed yet (shown as TBD in the list).
            {nights != null ? ` · ${nights} night${nights === 1 ? '' : 's'}` : ''}
          </p>
          <div className="nc-grid-2" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className={`lbl${fieldInvalid('start') ? ' nc-field-invalid-label' : ''}`}>Start Date</label>
              <input
                id={fieldDomId('start')}
                type="date"
                className={fieldInvalid('start') ? 'nc-field-invalid' : undefined}
                value={form.start}
                aria-invalid={fieldInvalid('start')}
                onChange={(e) => set('start', e.target.value)}
              />
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('end') ? ' nc-field-invalid-label' : ''}`}>End Date</label>
              <input
                id={fieldDomId('end')}
                type="date"
                className={fieldInvalid('end') ? 'nc-field-invalid' : undefined}
                value={form.end}
                aria-invalid={fieldInvalid('end')}
                onChange={(e) => set('end', e.target.value)}
              />
            </div>
          </div>

          <div className="nc-section-title">Commercial</div>
          <div className="nc-grid-2" style={{ marginBottom: 12 }}>
            <div className="fg">
              <label className={`lbl${fieldInvalid('total') ? ' nc-field-invalid-label' : ''}`}>Total (USD)</label>
              <input
                id={fieldDomId('total')}
                type="text"
                className={fieldInvalid('total') ? 'nc-field-invalid' : undefined}
                value={totalInput}
                aria-invalid={fieldInvalid('total')}
                placeholder="e.g. 22,000 or $22000"
                onChange={(e) => {
                  clearErrors();
                  setTotalInput(e.target.value);
                }}
                onBlur={() => formatMoneyBlur(totalInput, setTotalInput)}
              />
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('deposit') ? ' nc-field-invalid-label' : ''}`}>Deposit (USD)</label>
              <input
                id={fieldDomId('deposit')}
                type="text"
                className={fieldInvalid('deposit') ? 'nc-field-invalid' : undefined}
                value={depositInput}
                aria-invalid={fieldInvalid('deposit')}
                placeholder="e.g. 6,600"
                onChange={(e) => {
                  clearErrors();
                  setDepositInput(e.target.value);
                }}
                onBlur={() => formatMoneyBlur(depositInput, setDepositInput)}
              />
            </div>
          </div>
          <div className="nc-form-summary">
            <div className="nc-form-summary-item">
              <div className="nc-form-summary-lbl">Total</div>
              <div className="nc-form-summary-val">${fmt(total)}</div>
            </div>
            <div className="nc-form-summary-item">
              <div className="nc-form-summary-lbl">Deposit</div>
              <div className="nc-form-summary-val" style={{ color: 'var(--blue)' }}>
                ${fmt(deposit)}
              </div>
            </div>
            <div className="nc-form-summary-item">
              <div className="nc-form-summary-lbl">Balance Due</div>
              <div className="nc-form-summary-val" style={{ color: balance > 0 ? 'var(--amb)' : 'var(--g)' }}>
                ${fmt(balance)}
              </div>
            </div>
          </div>

          <div className="nc-section-title">Operations</div>
          <div className="nc-grid-2">
            <div className="fg">
              <label className="lbl">Assigned Guide</label>
              <input
                value={form.guide}
                onChange={(e) => set('guide', e.target.value)}
                placeholder="e.g. Minh N."
              />
            </div>
            <div className="fg">
              <label className="lbl">Primary Hotel</label>
              <input
                value={form.hotel}
                onChange={(e) => set('hotel', e.target.value)}
                placeholder="e.g. La Siesta Premium Hanoi"
              />
            </div>
          </div>
        </div>

        <div className="nc-modal-ft">
          {formError ? (
            <div className="nc-form-error" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="nc-modal-ft-actions">
            <button className="btn btn-s" type="button" onClick={() => void requestClose()} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-p" type="button" onClick={() => void handleCreate()} disabled={saving}>
              {saving ? 'Creating…' : 'Create Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
