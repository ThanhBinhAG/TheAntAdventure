'use client';

import { useState } from 'react';
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
    <div className="overlay open" onClick={onClose}>
      <div className="modal nc-modal" onClick={(e) => e.stopPropagation()} style={{ width: 640, maxWidth: '96vw' }}>
        <div className="modal-hd modal-hd-green nc-modal-hd">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>+ New Booking</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>
              Tạo booking mới
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="nc-modal-body">
          <div className="nc-section-title">Booking details</div>
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
                    {c.name}
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
                <option>Confirmed</option>
                <option>Deposit Paid</option>
                <option>Fully Paid</option>
                <option>On Tour</option>
              </select>
            </div>
          </div>

          <div className="nc-section-title">Travel dates</div>
          <p style={{ fontSize: 12, color: 'var(--m)', margin: '0 0 10px' }}>
            Optional — leave blank if dates are not confirmed yet (shown as TBD in the list).
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

          <div className="nc-section-title">Payment</div>
          <div className="nc-grid-2" style={{ marginBottom: 16 }}>
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

          <div className="nc-section-title">Operations</div>
          <div className="nc-grid-2">
            <div className="fg">
              <label className="lbl">Guide</label>
              <input
                value={form.guide}
                onChange={(e) => set('guide', e.target.value)}
                placeholder="Minh N."
              />
            </div>
            <div className="fg">
              <label className="lbl">Hotel</label>
              <input value={form.hotel} onChange={(e) => set('hotel', e.target.value)} />
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
            <button className="btn btn-s" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-p" type="button" onClick={() => void handleCreate()} disabled={saving}>
              ✓ Create Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
