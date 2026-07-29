import type { TourBrief } from '@/lib/tour-design/tour-design-types';
import { REG_LABELS } from '@/lib/core/page-helpers';

function labelIntlFlights(v: string) {
  if (v === 'incl-economy') return 'Included — Economy';
  if (v === 'incl-business') return 'Included — Business';
  return 'Not included';
}

function labelDomesticFlights(v: string) {
  return v === 'yes' ? 'Included' : 'Land only';
}

function labelVisa(v: string) {
  if (v === 'exempt') return 'Visa exemption';
  if (v === 'evisa-self') return 'E-visa (guest arranges)';
  if (v === 'visa-us') return 'We arrange visa';
  if (v === 'voa') return 'Visa on arrival';
  return v || 'TBC';
}

function labelFirstTime(v: string) {
  if (v === 'yes') return 'First visit';
  if (v === 'no') return 'Returning guest';
  if (v === 'unknown') return 'Not sure';
  return '';
}

export function hasGuestBriefData(brief: TourBrief, clientType: 'b2c' | 'b2b', custName?: string): boolean {
  return !!(
    custName ||
    brief.clientName ||
    brief.agentRef ||
    brief.startDate ||
    brief.travelMonth ||
    brief.nationality ||
    brief.interestsText ||
    brief.specialRequests
  );
}

export function buildBriefSummaryHtml(brief: TourBrief, clientType: 'b2c' | 'b2b', custName?: string): string {
  const displayName = clientType === 'b2b' && brief.agentRef ? brief.agentRef : custName || brief.clientName || 'New Client';
  const intlLabel =
    brief.intlFlights === 'incl-economy'
      ? 'Intl ✈ Economy'
      : brief.intlFlights === 'incl-business'
        ? 'Intl ✈ Business'
        : 'Intl ✗';
  const visaLabel =
    brief.visa === 'exempt'
      ? '🛂 Visa-free'
      : brief.visa === 'evisa-self'
        ? '🛂 E-visa (self)'
        : brief.visa === 'visa-us'
          ? '🛂 Visa (us)'
          : '🛂 VOA';
  const childStr =
    brief.children > 0
      ? ` · 👧 ${brief.children} child${brief.children > 1 ? 'ren' : ''}${brief.childAges ? ` (${brief.childAges})` : ''}`
      : '';
  const b2bStr =
    clientType === 'b2b'
      ? ` · B2B${brief.agentRef ? '' : ' ← enter agent name'}`
      : '';

  return `${displayName}${b2bStr}${childStr} · ${brief.pax} pax · ${brief.style} · ${brief.travelMonth} 2026 · ${brief.hotelTier} · ${brief.language} guide · ${intlLabel} · ${visaLabel}`;
}

export function getGuestDisplayName(brief: TourBrief, clientType: 'b2c' | 'b2b', custName?: string): string {
  if (clientType === 'b2b') {
    return brief.agentRef ? `Agent: ${brief.agentRef}` : 'B2B Agent (name TBC)';
  }
  return custName || brief.clientName || 'Direct Client (TBC)';
}

export function getGuestPanelData(brief: TourBrief, clientType: 'b2c' | 'b2b', custName?: string) {
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let travelStr = 'Date TBC';
  if (brief.startDate) {
    const d = new Date(brief.startDate + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      travelStr = `${DOW[d.getDay()]}, ${d.getDate()} ${MN[d.getMonth()]} ${d.getFullYear()}`;
    }
  } else if (brief.travelMonth) {
    travelStr = `${brief.travelMonth} 2026 (est.)`;
  }

  const paxLine =
    brief.children > 0
      ? `${brief.pax} adults + ${brief.children} child${brief.children > 1 ? 'ren' : ''}${brief.childAges ? ` (${brief.childAges})` : ''}`
      : `${brief.pax} adults`;

  const bookingLine =
    clientType === 'b2b' ? `B2B Agent${brief.agentRef ? ` · ${brief.agentRef}` : ''}` : `Direct · ${custName || brief.clientName || 'TBC'}`;

  const rows: { label: string; value: string }[] = [
    { label: 'Travel Date', value: travelStr },
    { label: 'Duration', value: brief.duration || 'TBC' },
    { label: 'Region', value: REG_LABELS[brief.region as keyof typeof REG_LABELS] || brief.region || 'TBC' },
    { label: 'Booking', value: bookingLine },
    { label: 'Guests', value: paxLine },
  ];
  if (brief.nationality) rows.push({ label: 'Nationality', value: brief.nationality });
  if (brief.firstTime) {
    const ft = labelFirstTime(brief.firstTime);
    if (ft) rows.push({ label: 'Vietnam Visit', value: ft });
  }
  if (brief.language) rows.push({ label: 'Guide', value: `${brief.language} speaking` });
  if (brief.style) rows.push({ label: 'Style', value: brief.style });
  if (brief.pace) rows.push({ label: 'Pace', value: brief.pace });
  if (brief.hotelTier) rows.push({ label: 'Hotel', value: brief.hotelTier });
  if (brief.budgetRange) rows.push({ label: 'Budget', value: brief.budgetRange });
  rows.push({ label: 'Domestic ✈', value: labelDomesticFlights(brief.flights) });
  rows.push({ label: 'Intl ✈', value: labelIntlFlights(brief.intlFlights) });
  rows.push({ label: 'Visa', value: labelVisa(brief.visa) });
  const interests = brief.interestsText || brief.interests.join(', ');
  if (interests) rows.push({ label: 'Interests', value: interests });
  if (brief.mustSee) rows.push({ label: 'Must See', value: brief.mustSee });
  if (brief.avoid) rows.push({ label: 'Avoid', value: brief.avoid });
  if (brief.dietary) rows.push({ label: 'Dietary', value: brief.dietary });
  if (brief.mobility) rows.push({ label: 'Mobility', value: brief.mobility });
  if (brief.specialRequests) rows.push({ label: 'Special', value: brief.specialRequests });
  if (brief.childDiet) rows.push({ label: 'Child diet', value: brief.childDiet });
  if (brief.childPrefs) rows.push({ label: 'Child prefs', value: brief.childPrefs });
  if (brief.salesperson) rows.push({ label: 'Sales', value: brief.salesperson });

  return {
    displayName: getGuestDisplayName(brief, clientType, custName),
    summaryLine: buildBriefSummaryHtml(brief, clientType, custName),
    rows,
  };
}
