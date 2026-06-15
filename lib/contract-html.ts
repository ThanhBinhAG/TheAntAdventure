export type ContractDoc = {
  id: string;
  clientName?: string;
  nationality?: string;
  pax?: number;
  rooms?: string;
  tourName?: string;
  duration?: string;
  departureDate?: string;
  returnDate?: string;
  route?: string;
  inclusions?: string;
  exclusions?: string;
  flights?: string;
  currency?: string;
  total?: number;
  depositPct?: number;
  depositAmt?: number;
  balanceDueDate?: string;
  status?: string;
  createdAt?: string;
};

function fmtDate(d?: string) {
  if (!d) return '[To be confirmed]';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtMoney(amt: number, cur: string) {
  return `${cur} ${Number(amt).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

export function buildContractHTML(c: ContractDoc, _forExport = false): string {
  const balDue = c.balanceDueDate ? fmtDate(c.balanceDueDate) : '30 days prior to departure';
  const pax = c.pax || 1;
  const total = c.total || 0;
  const depositPct = c.depositPct ?? 50;
  const depositAmt = c.depositAmt ?? total * (depositPct / 100);
  const currency = c.currency || 'USD';

  const inclRows = (c.inclusions || '')
    .split('\n')
    .filter(Boolean)
    .map(
      (l) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #E2E8E4">✓</td><td style="padding:6px 10px;border-bottom:1px solid #E2E8E4">${l}</td></tr>`
    )
    .join('');

  const exclRows = (c.exclusions || '')
    .split('\n')
    .filter(Boolean)
    .map(
      (l) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #E2E8E4">✗</td><td style="padding:6px 10px;border-bottom:1px solid #E2E8E4">${l}</td></tr>`
    )
    .join('');

  const flightsSection = c.flights
    ? `
    <div style="margin-bottom:22px">
      <div style="font-weight:700;font-size:13.5px;color:#1a5c38;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #2E7D52">3. DOMESTIC FLIGHTS INCLUDED</div>
      ${c.flights
        .split('\n')
        .filter(Boolean)
        .map(
          (f, i) => `
        <div style="background:#F7F8F6;border:1px solid #E2E8E4;border-radius:7px;padding:9px 14px;margin-bottom:6px">
          <b>Flight ${i + 1}</b> — ${f}
        </div>`
        )
        .join('')}
    </div>`
    : '';

  const sectionNum = c.flights ? 4 : 3;

  return `
    <div style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:#1a2e23;line-height:1.7;max-width:760px;margin:0 auto">
      <div style="text-align:center;border-bottom:3px solid #2E7D52;padding-bottom:16px;margin-bottom:20px">
        <div style="font-size:11px;color:#6B7F74;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">The Ant Adventures Co., Ltd.</div>
        <div style="font-size:22px;font-weight:700;color:#1a5c38;margin-bottom:4px">TOUR SERVICE CONTRACT</div>
        <div style="font-size:12px;color:#6B7F74">
          Contract No.: <b style="color:#1a2e23">${c.id}</b> &nbsp;│&nbsp;
          Date Issued: <b style="color:#1a2e23">${fmtDate(c.createdAt)}</b> &nbsp;│&nbsp;
          Status: <b style="color:#2E7D52">${c.status || 'Draft'}</b>
        </div>
      </div>
      <div style="margin-bottom:22px">
        <div style="font-weight:700;font-size:13.5px;color:#1a5c38;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #2E7D52">1. PARTIES TO THE CONTRACT</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div style="background:#E8F5EE;border:1px solid #b8dfc9;border-radius:8px;padding:12px 16px">
            <div style="font-weight:700;color:#1a5c38;font-size:12px;letter-spacing:.7px;text-transform:uppercase;margin-bottom:8px">SERVICE PROVIDER</div>
            <div><b>The Ant Adventures Company Limited</b></div>
            <div style="color:#6B7F74;font-size:12px;margin-top:2px">Công ty TNHH The Ant Adventures</div>
            <div style="margin-top:6px;font-size:12.5px">Tax ID: 0319476280</div>
            <div style="font-size:12.5px">748 Truong Sa, Nhieu Loc Ward, Ho Chi Minh City, Vietnam</div>
            <div style="font-size:12.5px">Email: sales@theantadventures.com</div>
          </div>
          <div style="background:#FDF6E3;border:1px solid #e8d5a3;border-radius:8px;padding:12px 16px">
            <div style="font-weight:700;color:#92400E;font-size:12px;letter-spacing:.7px;text-transform:uppercase;margin-bottom:8px">CLIENT</div>
            <div><b>${c.clientName || '—'}</b></div>
            <div style="margin-top:6px;font-size:12.5px">Nationality: ${c.nationality || '[To be completed]'}</div>
            <div style="font-size:12.5px">Number of Travellers: <b>${pax} Adult(s)</b></div>
            ${c.rooms ? `<div style="font-size:12.5px">Room Configuration: ${c.rooms}</div>` : ''}
          </div>
        </div>
      </div>
      <div style="margin-bottom:22px">
        <div style="font-weight:700;font-size:13.5px;color:#1a5c38;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #2E7D52">2. TOUR SUMMARY</div>
        <table style="width:100%;border-collapse:collapse">
          <tr style="background:#F7F8F6"><td style="padding:7px 12px;font-weight:600;width:35%;border-bottom:1px solid #E2E8E4">Tour Name</td><td style="padding:7px 12px;border-bottom:1px solid #E2E8E4"><b>${c.tourName || '—'}</b></td></tr>
          <tr><td style="padding:7px 12px;font-weight:600;border-bottom:1px solid #E2E8E4">Duration</td><td style="padding:7px 12px;border-bottom:1px solid #E2E8E4">${c.duration || '—'}</td></tr>
          <tr style="background:#F7F8F6"><td style="padding:7px 12px;font-weight:600;border-bottom:1px solid #E2E8E4">Departure Date</td><td style="padding:7px 12px;border-bottom:1px solid #E2E8E4">${fmtDate(c.departureDate)}</td></tr>
          <tr><td style="padding:7px 12px;font-weight:600;border-bottom:1px solid #E2E8E4">Return Date</td><td style="padding:7px 12px;border-bottom:1px solid #E2E8E4">${fmtDate(c.returnDate)}</td></tr>
          ${c.route ? `<tr style="background:#F7F8F6"><td style="padding:7px 12px;font-weight:600;border-bottom:1px solid #E2E8E4">Route</td><td style="padding:7px 12px;border-bottom:1px solid #E2E8E4">${c.route}</td></tr>` : ''}
        </table>
      </div>
      ${flightsSection}
      <div style="margin-bottom:22px">
        <div style="font-weight:700;font-size:13.5px;color:#1a5c38;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #2E7D52">${sectionNum}. PRICING &amp; PAYMENT TERMS</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
          <thead><tr style="background:#2E7D52;color:#fff"><th style="padding:8px 12px;text-align:left">Tour Description</th><th style="padding:8px 12px;text-align:right">Per Person</th><th style="padding:8px 12px;text-align:right">Group Total (${pax} Pax)</th></tr></thead>
          <tbody>
            <tr style="background:#F7F8F6"><td style="padding:8px 12px;border-bottom:1px solid #E2E8E4">${c.tourName || 'Tour'} (${c.duration || ''})</td>
              <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #E2E8E4">${fmtMoney(total / pax, currency)}</td>
              <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #E2E8E4"><b>${fmtMoney(total, currency)}</b></td>
            </tr>
          </tbody>
        </table>
        <div style="font-weight:700;color:#1a5c38;margin-bottom:6px;font-size:12.5px">Payment Schedule</div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#E8F5EE"><th style="padding:7px 12px;text-align:left">Payment</th><th style="padding:7px 12px;text-align:right">Amount (${currency})</th><th style="padding:7px 12px;text-align:left">Due Date</th></tr></thead>
          <tbody>
            <tr><td style="padding:7px 12px;border-bottom:1px solid #E2E8E4">Deposit (${depositPct}%)</td>
              <td style="padding:7px 12px;text-align:right;border-bottom:1px solid #E2E8E4"><b>${fmtMoney(depositAmt, currency)}</b></td>
              <td style="padding:7px 12px;border-bottom:1px solid #E2E8E4">Upon signing of this contract</td>
            </tr>
            <tr style="background:#F7F8F6"><td style="padding:7px 12px">Balance (${100 - depositPct}%)</td>
              <td style="padding:7px 12px;text-align:right"><b>${fmtMoney(total - depositAmt, currency)}</b></td>
              <td style="padding:7px 12px">${balDue}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ${inclRows ? `<div style="margin-bottom:22px"><div style="font-weight:700;font-size:13.5px;color:#1a5c38;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #2E7D52">${sectionNum + 1}. TOUR INCLUSIONS</div><table style="width:100%;border-collapse:collapse">${inclRows}</table></div>` : ''}
      ${exclRows ? `<div style="margin-bottom:22px"><div style="font-weight:700;font-size:13.5px;color:#1a5c38;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #2E7D52">${sectionNum + 2}. TOUR EXCLUSIONS</div><table style="width:100%;border-collapse:collapse">${exclRows}</table></div>` : ''}
      <div style="margin-bottom:22px">
        <div style="font-weight:700;font-size:13.5px;color:#1a5c38;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #2E7D52">${sectionNum + 3}. CANCELLATION &amp; REFUND POLICY</div>
        <p style="margin:0 0 10px;font-size:12.5px">Cancellation charges apply as a percentage of total tour cost.</p>
      </div>
      <div style="margin-bottom:10px">
        <div style="font-weight:700;font-size:13.5px;color:#1a5c38;margin-bottom:14px;padding-bottom:4px;border-bottom:2px solid #2E7D52">${sectionNum + 8}. SIGNATURES &amp; AGREEMENT</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px">
          <div>
            <div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.7px;margin-bottom:14px;color:#1a5c38">CLIENT</div>
            <div style="font-size:12.5px">Full Name: <b>${c.clientName || '—'}</b></div>
            <div style="margin-top:16px;border-top:1px solid #6B7F74;padding-top:6px;font-size:11.5px;color:#6B7F74">Signature &amp; Date</div>
          </div>
          <div>
            <div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.7px;margin-bottom:14px;color:#1a5c38">THE ANT ADVENTURES CO., LTD.</div>
            <div style="font-size:12.5px">Full Name: <b>Vo Hoang Phuc</b></div>
            <div style="font-size:12.5px">Title: Authorized Representative</div>
            <div style="margin-top:12px;border-top:1px solid #6B7F74;padding-top:6px;font-size:11.5px;color:#6B7F74">Signature, Date &amp; Company Stamp</div>
          </div>
        </div>
      </div>
    </div>`;
}

export function downloadContractWord(c: ContractDoc) {
  const html = buildContractHTML(c, true);
  const wordDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><style>body{font-family:Arial,sans-serif;font-size:13px;color:#1a2e23;margin:40px}table{border-collapse:collapse;width:100%}</style></head>
<body>${html}</body></html>`;
  const blob = new Blob(['\ufeff', wordDoc], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${c.id}-${(c.clientName || 'contract').replace(/\s+/g, '_')}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printContract(c: ContractDoc) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${c.id}</title></head><body>${buildContractHTML(c, true)}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
