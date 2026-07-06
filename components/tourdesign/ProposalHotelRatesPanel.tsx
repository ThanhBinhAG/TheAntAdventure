'use client';

import type { ProposalHotelRate } from '@/lib/proposal-types';

interface Props {
  rates: ProposalHotelRate[];
  onChange: (rates: ProposalHotelRate[]) => void;
}

export default function ProposalHotelRatesPanel({ rates, onChange }: Props) {
  if (!rates.length) {
    return (
      <div style={{ fontSize: 12, color: 'var(--m)', padding: '10px 0' }}>
        No hotels detected from outline. Add hotel names in the Outline step to enable B2B hotel pricing.
      </div>
    );
  }

  const total = rates.reduce((s, h) => s + h.ratePerNight * h.nights, 0);

  function update(id: string, patch: Partial<ProposalHotelRate>) {
    onChange(rates.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="td-proposal-hotels">
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gd)', marginBottom: 8 }}>
        B2B Hotel Rates (Section C) — enter net rate per night
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl" style={{ fontSize: 11.5 }}>
          <thead>
            <tr>
              <th>Hotel</th>
              <th>Stay</th>
              <th>Room Type</th>
              <th>Nts</th>
              <th>Rate/Night (USD)</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((h) => (
              <tr key={h.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{h.hotelName}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--m)' }}>{h.location}</div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {h.stayFrom} – {h.stayTo}
                </td>
                <td>
                  <input
                    className="inp-sm"
                    value={h.roomType}
                    onChange={(e) => update(h.id, { roomType: e.target.value })}
                    style={{ width: '100%', minWidth: 120 }}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>{h.nights}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="inp-sm"
                    value={h.ratePerNight || ''}
                    onChange={(e) => update(h.id, { ratePerNight: Number(e.target.value) || 0 })}
                    style={{ width: 80 }}
                  />
                </td>
                <td style={{ fontWeight: 600 }}>${(h.ratePerNight * h.nights).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>
                Total Hotels
              </td>
              <td style={{ fontWeight: 700 }}>${total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
