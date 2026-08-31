'use client';

import { useMemo, useState } from 'react';
import type { ContractInput } from '@/lib/contracts/contract-input';
import {
  EMPTY_CONTRACT_FORM,
  contractDepositAmount,
  validateContractForm,
  type ContractFormData,
  type ContractFormErrorField,
} from '@/lib/contracts/contract-form';
import {
  buildContractFormFromBooking,
  findCustomerForBooking,
  type ClientNameSuggestion,
} from '@/lib/contracts/contract-booking-fill';
import type { BookingListItem } from '@/lib/bookings/booking-input';
import type { Customer } from '@/lib/types';
import type { CreateContractOutcome } from '@/hooks/useCreateContract';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';
import ContractClientNameCombobox from '@/components/contracts/ContractClientNameCombobox';

const LINKABLE_STATUSES = ['Confirmed', 'On Tour', 'Completed', 'Deposit Paid', 'Fully Paid'];

type ContractFormModalProps = {
  open: boolean;
  bookings: BookingListItem[];
  customers: Customer[];
  saving?: boolean;
  onClose: () => void;
  onCreate: (contract: ContractInput) => Promise<CreateContractOutcome>;
};

function fieldDomId(field: ContractFormErrorField) {
  return `ctr-field-${field}`;
}

function revealField(field: ContractFormErrorField) {
  requestAnimationFrame(() => {
    const el = document.getElementById(fieldDomId(field));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el instanceof HTMLElement) {
      el.focus({ preventScroll: true });
    }
  });
}

function bookingOptionLabel(b: BookingListItem): string {
  const client = b.customerName?.trim() || b.custId;
  const dates =
    b.start && b.end ? `${b.start} → ${b.end}` : b.start || b.end || 'Dates TBD';
  return `${client} · ${b.tour} · ${b.pax} pax · ${dates}`;
}

export default function ContractFormModal({
  open,
  bookings,
  customers,
  saving = false,
  onClose,
  onCreate,
}: ContractFormModalProps) {
  const formKey = open ? 'open' : 'closed';
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<ContractFormData>({ ...EMPTY_CONTRACT_FORM });
  const [formError, setFormError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<ContractFormErrorField | null>(null);

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    setForm({ ...EMPTY_CONTRACT_FORM });
    setFormError(null);
    setErrorField(null);
  }

  const linkableBookings = useMemo(
    () => bookings.filter((b) => LINKABLE_STATUSES.includes(b.status)),
    [bookings],
  );

  const linkedBooking = form.bookingId
    ? bookings.find((b) => b.id === form.bookingId) ?? null
    : null;

  const depositAmt = contractDepositAmount(form.total, form.depositPct);

  const { language } = useLanguage();
  const dirty = useFormDirty(open, { ...EMPTY_CONTRACT_FORM }, form, undefined, formKey);
  const { requestClose } = useConfirmClose({ open, dirty, onClose, disabled: saving, language });

  if (!open) return null;

  function clearErrors() {
    setFormError(null);
    setErrorField(null);
  }

  function fail(field: ContractFormErrorField | null, message: string) {
    setFormError(message);
    setErrorField(field);
    if (field) revealField(field);
  }

  function fieldInvalid(field: ContractFormErrorField) {
    return errorField === field;
  }

  function patch(patch: Partial<ContractFormData>) {
    clearErrors();
    setForm((f) => ({ ...f, ...patch }));
  }

  function applyBookingFill(bkId: string) {
    const booking = bookings.find((x) => x.id === bkId);
    if (!booking) {
      patch({ bookingId: bkId });
      return;
    }
    const customer = findCustomerForBooking(booking, customers);
    patch(buildContractFormFromBooking(booking, customer));
  }

  function handleClientPick(suggestion: ClientNameSuggestion) {
    if (suggestion.key.startsWith('booking:')) {
      applyBookingFill(suggestion.key.slice('booking:'.length));
      return;
    }
    patch({
      bookingId: '',
      clientName: suggestion.name,
      nationality: suggestion.nationality,
    });
  }

  async function handleSave() {
    clearErrors();
    const validated = validateContractForm(form);
    if (!validated.ok) {
      fail(validated.field, validated.message);
      return;
    }

    const result = await onCreate({
      bookingId: form.bookingId,
      clientName: form.clientName.trim(),
      nationality: form.nationality.trim(),
      pax: form.pax,
      rooms: form.rooms.trim(),
      tourName: form.tourName.trim(),
      duration: form.duration.trim(),
      departureDate: form.departureDate || undefined,
      returnDate: form.returnDate || undefined,
      route: form.route.trim(),
      inclusions: form.inclusions,
      exclusions: form.exclusions,
      flights: form.flights,
      currency: form.currency,
      total: form.total,
      depositPct: form.depositPct,
      depositAmt,
      balanceDueDate: form.balanceDueDate || undefined,
      status: 'Draft',
      createdAt: undefined,
      signedAt: null,
      notes: form.notes.trim(),
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
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>New Contract</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>
              Select a booking to auto-fill, or enter details manually
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={() => void requestClose()}>
            ✕
          </button>
        </div>

        <div className="nc-modal-body">
          <div className="nc-form-card">
            <div className="nc-form-card-title">Link to Booking</div>
            <p className="nc-form-hint" style={{ marginTop: 0, marginBottom: 8 }}>
              Pick a confirmed booking to fill client, tour, dates, pricing, and route.
            </p>
            <div className="fg" style={{ margin: 0 }}>
              <select
                value={form.bookingId}
                onChange={(e) => {
                  const bkId = e.target.value;
                  if (!bkId) {
                    patch({ bookingId: '' });
                    return;
                  }
                  applyBookingFill(bkId);
                }}
              >
                <option value="">— Select a booking —</option>
                {linkableBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {bookingOptionLabel(b)}
                  </option>
                ))}
              </select>
            </div>
            {linkedBooking ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, fontSize: 11.5 }}>
                <span className="bdg bdg-b">{linkedBooking.status}</span>
                <span style={{ color: 'var(--m)' }}>{linkedBooking.id}</span>
                <span style={{ color: 'var(--m)' }}>{linkedBooking.tour}</span>
                {linkedBooking.total > 0 ? (
                  <span style={{ color: 'var(--m)' }}>USD {linkedBooking.total.toLocaleString('en-US')}</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div className="nc-section-title">Client</div>
              <div className="fg">
                <label className={`lbl${fieldInvalid('clientName') ? ' nc-field-invalid-label' : ''}`}>
                  Client Name <span className="req">*</span>
                </label>
                <ContractClientNameCombobox
                  inputId={fieldDomId('clientName')}
                  value={form.clientName}
                  customers={customers}
                  bookings={bookings}
                  invalid={fieldInvalid('clientName')}
                  onChange={(clientName) => {
                    const linked = form.bookingId
                      ? bookings.find((b) => b.id === form.bookingId)
                      : null;
                    const linkedName = linked?.customerName?.trim() || '';
                    patch({
                      clientName,
                      bookingId:
                        linked && clientName.trim() !== linkedName ? '' : form.bookingId,
                    });
                  }}
                  onPick={handleClientPick}
                />
                <p className="nc-form-hint">Type to search clients from CRM or linked bookings.</p>
              </div>
              <div className="fg">
                <label className="lbl">Nationality</label>
                <input
                  value={form.nationality}
                  onChange={(e) => patch({ nationality: e.target.value })}
                  placeholder="e.g. Australian"
                />
              </div>
              <div className="fg">
                <label className={`lbl${fieldInvalid('pax') ? ' nc-field-invalid-label' : ''}`}>
                  Pax <span className="req">*</span>
                </label>
                <input
                  id={fieldDomId('pax')}
                  type="number"
                  min={1}
                  className={fieldInvalid('pax') ? 'nc-field-invalid' : undefined}
                  value={form.pax}
                  aria-invalid={fieldInvalid('pax')}
                  onChange={(e) => patch({ pax: Number(e.target.value) })}
                />
              </div>
              <div className="fg">
                <label className="lbl">Rooms</label>
                <input
                  value={form.rooms}
                  onChange={(e) => patch({ rooms: e.target.value })}
                  placeholder="e.g. 1 DBL + 1 TWN"
                />
              </div>
            </div>

            <div>
              <div className="nc-section-title">Tour</div>
              <div className="fg">
                <label className={`lbl${fieldInvalid('tourName') ? ' nc-field-invalid-label' : ''}`}>
                  Tour Name <span className="req">*</span>
                </label>
                {form.bookingId ? (
                  <>
                    <input
                      id={fieldDomId('tourName')}
                      readOnly
                      className={fieldInvalid('tourName') ? 'nc-field-invalid' : undefined}
                      value={form.tourName}
                      aria-invalid={fieldInvalid('tourName')}
                    />
                    <p className="nc-form-hint">From booking {form.bookingId}. Clear booking link above to edit manually.</p>
                  </>
                ) : (
                  <>
                    <select
                      id={fieldDomId('tourName')}
                      className={fieldInvalid('tourName') ? 'nc-field-invalid' : undefined}
                      value=""
                      aria-invalid={fieldInvalid('tourName')}
                      onChange={(e) => {
                        const bkId = e.target.value;
                        if (bkId) applyBookingFill(bkId);
                      }}
                    >
                      <option value="">— Select tour from bookings —</option>
                      {linkableBookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.tour} · {b.customerName || b.custId}
                        </option>
                      ))}
                    </select>
                    <input
                      style={{ marginTop: 8 }}
                      value={form.tourName}
                      placeholder="Or enter a custom tour name"
                      onChange={(e) => patch({ tourName: e.target.value, bookingId: '' })}
                    />
                  </>
                )}
              </div>
              <div className="fg">
                <label className="lbl">Duration</label>
                <input
                  value={form.duration}
                  onChange={(e) => patch({ duration: e.target.value })}
                  placeholder="10 Days / 9 Nights"
                />
              </div>
              <div className="nc-grid-2">
                <div className="fg">
                  <label className={`lbl${fieldInvalid('departureDate') ? ' nc-field-invalid-label' : ''}`}>
                    Departure
                  </label>
                  <input
                    id={fieldDomId('departureDate')}
                    type="date"
                    className={fieldInvalid('departureDate') ? 'nc-field-invalid' : undefined}
                    value={form.departureDate}
                    onChange={(e) => patch({ departureDate: e.target.value })}
                  />
                </div>
                <div className="fg">
                  <label className={`lbl${fieldInvalid('returnDate') ? ' nc-field-invalid-label' : ''}`}>
                    Return
                  </label>
                  <input
                    id={fieldDomId('returnDate')}
                    type="date"
                    className={fieldInvalid('returnDate') ? 'nc-field-invalid' : undefined}
                    value={form.returnDate}
                    onChange={(e) => patch({ returnDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Route</label>
                <input
                  value={form.route}
                  onChange={(e) => patch({ route: e.target.value })}
                  placeholder="Hanoi – Halong – Hoi An – Saigon"
                />
              </div>
            </div>
          </div>

          <div className="nc-section-title">Terms</div>
          <div className="nc-grid-2" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">Inclusions (one per line)</label>
              <textarea
                value={form.inclusions}
                onChange={(e) => patch({ inclusions: e.target.value })}
                style={{ minHeight: 100 }}
              />
            </div>
            <div className="fg">
              <label className="lbl">Exclusions (one per line)</label>
              <textarea
                value={form.exclusions}
                onChange={(e) => patch({ exclusions: e.target.value })}
                style={{ minHeight: 100 }}
              />
            </div>
          </div>
          <div className="fg" style={{ marginBottom: 16 }}>
            <label className="lbl">Domestic Flights (optional, one per line)</label>
            <textarea
              value={form.flights}
              onChange={(e) => patch({ flights: e.target.value })}
              placeholder="HAN–DAD Economy · DAD–SGN Economy"
              style={{ minHeight: 60 }}
            />
          </div>

          <div className="nc-section-title">Pricing & Payment</div>
          <div className="nc-grid-2" style={{ marginBottom: 12 }}>
            <div className="fg">
              <label className="lbl">Currency</label>
              <select value={form.currency} onChange={(e) => patch({ currency: e.target.value })}>
                <option>USD</option>
                <option>AUD</option>
                <option>EUR</option>
              </select>
            </div>
            <div className="fg">
              <label className={`lbl${fieldInvalid('total') ? ' nc-field-invalid-label' : ''}`}>Total Value</label>
              <input
                id={fieldDomId('total')}
                type="number"
                min={0}
                className={fieldInvalid('total') ? 'nc-field-invalid' : undefined}
                value={form.total || ''}
                onChange={(e) => patch({ total: Number(e.target.value) })}
              />
            </div>
            <div className="fg">
              <label className="lbl">Deposit %</label>
              <select value={form.depositPct} onChange={(e) => patch({ depositPct: Number(e.target.value) })}>
                <option value={30}>30%</option>
                <option value={50}>50%</option>
                <option value={100}>100%</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Balance Due Date</label>
              <input
                type="date"
                value={form.balanceDueDate}
                onChange={(e) => patch({ balanceDueDate: e.target.value })}
              />
            </div>
          </div>
          <div className="nc-form-summary" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="nc-form-summary-item">
              <div className="nc-form-summary-lbl">Deposit Amount</div>
              <div className="nc-form-summary-val" style={{ color: 'var(--blue)' }}>
                {form.currency} {depositAmt.toLocaleString('en-US')}
              </div>
            </div>
            <div className="nc-form-summary-item">
              <div className="nc-form-summary-lbl">Balance</div>
              <div className="nc-form-summary-val">
                {form.currency} {(form.total - depositAmt).toLocaleString('en-US')}
              </div>
            </div>
          </div>

          <div className="nc-section-title">Notes</div>
          <div className="fg">
            <textarea
              value={form.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Internal notes (not shown on client contract)"
              style={{ minHeight: 60 }}
            />
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
            <button className="btn btn-p" type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save as Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
