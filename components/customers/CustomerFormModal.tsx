'use client';

import { useEffect, useState } from 'react';
import {
  AGENT_DATALIST,
  EMPTY_CUSTOMER_FORM,
  SALES_PEOPLE,
  customerToForm,
  formToCustomer,
  nextCustomerId,
  type CustomerFormData,
} from '@/lib/customer-form';
import type { Customer } from '@/lib/types';

const CHILD_TAGS = ['Infant 0–2', 'Toddler 3–5', 'Child 6–9', 'Pre-teen 10–12', 'Teen 13–17'];

interface CustomerFormModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  customer?: Customer | null;
  customers: Customer[];
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

export default function CustomerFormModal({ open, mode, customer, customers, onClose, onSave }: CustomerFormModalProps) {
  const [form, setForm] = useState<CustomerFormData>(EMPTY_CUSTOMER_FORM);

  useEffect(() => {
    if (!open) return;
    setForm(customer && mode === 'edit' ? customerToForm(customer) : { ...EMPTY_CUSTOMER_FORM });
  }, [open, customer, mode]);

  if (!open) return null;

  const showChildren = Number(form.numChildren) > 0;

  function set<K extends keyof CustomerFormData>(key: K, value: CustomerFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addChildTag(tag: string) {
    set('childAges', form.childAges ? `${form.childAges}, ${tag}` : tag);
  }

  function handleSave() {
    if (!form.name.trim()) {
      alert('Please enter client name.');
      return;
    }
    if (!form.email.trim()) {
      alert('Please enter email.');
      return;
    }
    const id = mode === 'edit' && customer ? customer.id : nextCustomerId(customers);
    const bookings = mode === 'edit' && customer ? customer.bookings : [];
    onSave(formToCustomer(form, id, bookings));
    onClose();
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
            <div className="nc-section-title">Client Type & Assignment / Loại khách & Phân công</div>
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

          <div className="nc-section-title">Contact / Liên hệ</div>
          <div className="nc-grid-3" style={{ marginBottom: 16 }}>
            <div className="fg" style={{ gridColumn: '1 / 3' }}>
              <label className="lbl">
                Full Name <span className="req">*</span>
              </label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. James & Sarah Miller" />
            </div>
            <div className="fg">
              <label className="lbl">Country</label>
              <select value={form.country} onChange={(e) => set('country', e.target.value)}>
                {['USA', 'Australia', 'France', 'UK', 'Germany', 'Japan', 'Canada', 'Singapore', 'Switzerland', 'Netherlands', 'Italy', 'Other'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">
                Email <span className="req">*</span>
              </label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="fg">
              <label className="lbl">Phone</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 415 555 ..." />
            </div>
            <div className="fg">
              <label className="lbl">WhatsApp</label>
              <input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="If different from phone" />
            </div>
            <div className="fg">
              <label className="lbl">Nationality</label>
              <input value={form.nat} onChange={(e) => set('nat', e.target.value)} placeholder="American, French..." />
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

          <div className="nc-section-title">Travel Profile / Hồ sơ du lịch</div>
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
              <select value={form.firstTime} onChange={(e) => set('firstTime', e.target.value)}>
                <option value="yes">Yes — first visit</option>
                <option value="no">No — returning</option>
                <option value="unknown">Not sure</option>
              </select>
            </div>
          </div>

          <div className="nc-section-title">Travel Logistics / Hậu cần</div>
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
              👧 Children / Trẻ em
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

          <div className="nc-section-title">Notes / Ghi chú</div>
          <div className="fg" style={{ marginBottom: 18 }}>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} style={{ minHeight: 80 }} placeholder="Dietary restrictions, mobility, anniversaries..." />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9 }}>
            <button className="btn btn-s" type="button" onClick={onClose}>
              Cancel / Hủy
            </button>
            <button className="btn btn-p" type="button" onClick={handleSave}>
              ✓ {mode === 'edit' ? 'Save Changes' : 'Add Customer / Thêm khách'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
