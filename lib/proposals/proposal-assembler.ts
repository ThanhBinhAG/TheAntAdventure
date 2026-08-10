import { addDays, localTodayIso } from '../core/date-utils';
import { REG_LABELS } from '../core/page-helpers';
import { ICO_KEYS, INCL_YES } from '../pricing/pricing-utils';
import { findProductPricing, paxToTierN, sumSellForProducts } from '../tour-design/tour-pricing';
import { TOUR_PACKAGES } from '../seeds/tourPackages';
import { SEED_STAFF } from '../seeds/staff';
import { fmtOutlineDate } from '../outline/outline-html';
import {
  buildDayGroups,
  formatDayDateLabel,
  formatIsoDateShort,
  resolveTravelStart,
  stripMarkdown,
  totalDurationDays,
} from '../tour-design/tour-itinerary';
import {
  resolvePackageDayPhotos,
  resolveProductPhotos,
} from '../gallery/tour-photos';
import type { GalleryPhoto, TourBrief } from '../tour-design/tour-design-types';
import type { ExperienceOverride, Hotel, Product, ProductPricing, TourOutlineDay } from '../types';
import type {
  AssembleProposalInput,
  ProposalB2BPricing,
  ProposalB2CPricing,
  ProposalDayDetail,
  ProposalDaySegment,
  ProposalDoc,
  ProposalFlightRow,
  ProposalHotelRate,
  ProposalItineraryRow,
  ProposalVariant,
} from './proposal-types';
import {
  PROPOSAL_DEFAULT_EXCLUSIONS,
  PROPOSAL_DEFAULT_INCLUSIONS,
} from './proposal-boilerplate';

const PEAK_MONTHS = new Set(['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']);

function stripHtmlToPlain(html?: string): string {
  if (!html?.trim()) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstLine(text: string): string {
  const line = text.split('\n').find((l) => l.trim());
  return line?.trim() || text.slice(0, 80);
}

export function generateQuoteRef(leadId?: string): string {
  const year = new Date().getFullYear();
  if (leadId) {
    const num = leadId.replace(/\D/g, '').slice(-3).padStart(3, '0');
    return `TAD-${year}-${num}`;
  }
  const suffix = String(Date.now()).slice(-3);
  return `TAD-${year}-${suffix}`;
}

function addDaysIso(iso: string, days: number): string {
  return addDays(iso, days);
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateRange(startIso: string | undefined, endIso: string | undefined, travelMonth: string): string {
  if (startIso && endIso) {
    const s = new Date(startIso + 'T12:00:00');
    const e = new Date(endIso + 'T12:00:00');
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      const sm = s.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const em = e.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      return `${sm.replace(/^\d+ /, (m) => m.trim().split(' ')[0] + ' ')} – ${em}`;
    }
  }
  if (startIso) {
    const s = new Date(startIso + 'T12:00:00');
    if (!isNaN(s.getTime())) {
      return s.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    }
  }
  if (travelMonth) return `${travelMonth} (dates TBC)`;
  return 'To be confirmed';
}

function parseDurationDays(duration: string): number {
  const m = duration.match(/(\d+)\s*[Dd]ays?\s*(\d+)?\s*[Nn]ights?/i) || duration.match(/(\d+)\s*[Dd]/);
  if (m) return parseInt(m[1], 10);
  return 0;
}

function resolveEndDate(brief: TourBrief, dayCount: number): string | undefined {
  if (brief.endDate) return brief.endDate;
  if (brief.startDate && dayCount > 0) return addDaysIso(brief.startDate, dayCount - 1);
  return undefined;
}

function resolveConsultant(salesperson: string): { name: string; email: string } {
  const staff = SEED_STAFF.find(
    (s) => s.ename === salesperson || s.name === salesperson || salesperson.includes(s.ename)
  );
  if (staff) return { name: staff.ename, email: staff.email };
  return { name: salesperson || 'Tai Pham', email: 'sales@theantadventures.com' };
}

function inferSeason(travelMonth: string): string {
  return PEAK_MONTHS.has(travelMonth) ? 'Peak Season (Oct – Mar)' : 'Off-Peak Season (Apr – Sep)';
}

function inferRooming(pax: number): string {
  if (pax <= 1) return '1 Single Room';
  if (pax === 2) return '1 Double Room';
  if (pax <= 4) return `${Math.ceil(pax / 2)} Double Room(s)`;
  return `${pax} guests — rooming TBC`;
}

function isFlightProduct(p: Product): boolean {
  const hay = `${p.cat} ${p.name} ${p.code}`.toLowerCase();
  return /flight|flt|airfare|air ticket/.test(hay);
}

function isHotelProduct(p: Product): boolean {
  const hay = `${p.cat} ${p.name} ${p.dur}`.toLowerCase();
  return /hotel|accommodation|cruise|resort|lodge|overnight/.test(hay) || /\d+\s*d\s*\d+\s*n/i.test(p.dur);
}

export function getPackageSellPerPax(packageId: string, pax: number, travelMonth: string): number {
  const pkg = TOUR_PACKAGES.find((p) => p.id === packageId);
  if (!pkg?.pricing?.length) return 0;
  const peak = PEAK_MONTHS.has(travelMonth);
  const sorted = [...pkg.pricing].sort((a, b) => a.pax - b.pax);
  let row = sorted[0];
  for (const r of sorted) {
    if (r.pax <= pax) row = r;
  }
  return peak ? row.peak : row.off;
}

function resolveEffectiveCodes(selectedCodes: string[]): string[] {
  if (selectedCodes.length) return selectedCodes;
  return [];
}

function resolveDayDateIso(
  brief: TourBrief,
  dayNumber: number,
  rowDate?: string
): string {
  if (rowDate?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(rowDate.trim())) return rowDate.trim();
  const { date } = resolveTravelStart(brief.startDate, brief.travelMonth);
  if (!date) return '';
  const d = new Date(date);
  d.setDate(d.getDate() + dayNumber - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildItineraryFromOutline(
  brief: TourBrief,
  rows: TourOutlineDay[]
): { glance: ProposalItineraryRow[]; days: ProposalDayDetail[] } {
  const sorted = [...rows].sort((a, b) => a.dayNumber - b.dayNumber);
  const glance: ProposalItineraryRow[] = [];
  const days: ProposalDayDetail[] = [];

  for (const row of sorted) {
    const iso = resolveDayDateIso(brief, row.dayNumber, row.date);
    const dateLabel = iso ? fmtOutlineDate(iso) : formatDayDateLabel(brief.startDate, brief.travelMonth, row.dayNumber);
    const activitiesPlain = stripHtmlToPlain(row.activities);
    const theme = firstLine(activitiesPlain) || `Day ${row.dayNumber}`;
    const hotel = stripHtmlToPlain(row.hotels) || '—';

    glance.push({
      dayNumber: row.dayNumber,
      dateLabel,
      destination: stripHtmlToPlain(row.location) || '—',
      theme,
      hotel,
    });

    days.push({
      dayNumber: row.dayNumber,
      dateLabel,
      destination: stripHtmlToPlain(row.location) || '—',
      title: theme,
      body: activitiesPlain || 'Program details to be confirmed.',
      hotel,
      meals: inferMealsFromText(activitiesPlain),
      imageUrls: [],
    });
  }

  return { glance, days };
}

function buildItineraryFromPackage(brief: TourBrief, packageId: string) {
  const pkg = TOUR_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) return { glance: [], days: [] };

  const glance: ProposalItineraryRow[] = [];
  const days: ProposalDayDetail[] = [];

  for (const d of pkg.days) {
    const dateLabel = formatDayDateLabel(brief.startDate, brief.travelMonth, d.n);
    const isoPart = dateLabel.includes(',') ? dateLabel.split('—')[1]?.trim() : dateLabel;
    glance.push({
      dayNumber: d.n,
      dateLabel: isoPart || `Day ${d.n}`,
      destination: d.sub || d.title,
      theme: d.title,
      hotel: d.hotel,
    });
    days.push({
      dayNumber: d.n,
      dateLabel: isoPart || `Day ${d.n}`,
      destination: d.sub || d.title,
      title: d.title,
      body: stripHtmlToPlain(d.body),
      hotel: d.hotel,
      meals: formatMealsCode(d.meals),
      imageUrls: [],
    });
  }

  return { glance, days };
}

function productSegmentBody(
  p: Product,
  experienceOverrides: Record<string, ExperienceOverride>
): string {
  const ov = experienceOverrides[p.code];
  const desc = stripMarkdown(ov?.desc?.trim() || p.desc || p.usp || p.name);
  const note = ov?.clientNote?.trim();
  if (note) return `${desc}\n\nNote: ${note}`;
  return desc;
}

function buildItineraryFromProducts(
  brief: TourBrief,
  products: Product[],
  experienceOverrides: Record<string, ExperienceOverride> = {}
): { glance: ProposalItineraryRow[]; days: ProposalDayDetail[] } {
  const timed = products.filter((p) => !isFlightProduct(p));
  const dayGroups = buildDayGroups(timed, experienceOverrides);
  const glance: ProposalItineraryRow[] = [];
  const days: ProposalDayDetail[] = [];

  for (const g of dayGroups) {
    const primary = g.items[0];
    const primaryOv = primary ? experienceOverrides[primary.code] : undefined;
    const displayN =
      typeof primaryOv?.dayIndex === 'number' && primaryOv.dayIndex >= 1
        ? primaryOv.dayIndex
        : g.n;
    const autoLabel = formatDayDateLabel(brief.startDate, brief.travelMonth, displayN);
    let dateLabel: string;
    if (primaryOv?.date?.trim()) {
      dateLabel = formatIsoDateShort(primaryOv.date.trim());
    } else {
      dateLabel = autoLabel.includes(',')
        ? autoLabel.split('—')[1]?.trim() || autoLabel
        : autoLabel;
    }
    const title =
      g.multiDay && g.dayOf && g.totalDays
        ? `${primary?.name || 'Experience'} (Day ${g.dayOf}/${g.totalDays})`
        : g.items.map((p) => p.name).join(' · ') || `Day ${displayN}`;
    const bodyParts = g.items.map((p) => productSegmentBody(p, experienceOverrides));
    const body = bodyParts.filter(Boolean).join('\n\n');
    const destination = g.label || primary?.dest || '—';
    const hotel = '—';

    const segments: ProposalDaySegment[] | undefined =
      !g.multiDay && g.items.length > 1
        ? g.items.map((p) => ({
            title: p.name,
            body: productSegmentBody(p, experienceOverrides) || 'Program details to be confirmed.',
            imageUrls: [],
            productCode: p.code,
          }))
        : undefined;

    glance.push({
      dayNumber: displayN,
      dateLabel: dateLabel || `Day ${displayN}`,
      destination,
      theme: title,
      hotel,
    });
    days.push({
      dayNumber: displayN,
      dateLabel: dateLabel || `Day ${displayN}`,
      destination,
      title,
      body: body || 'Program details to be confirmed.',
      hotel,
      meals: 'As per program',
      imageUrls: [],
      ...(segments ? { segments } : {}),
    });
  }

  return { glance, days };
}

/** Overlay hotel / destination / meals from outline rows matched by day number. */
function overlayOutlineMeta(
  days: ProposalDayDetail[],
  glance: ProposalItineraryRow[],
  outlineRows: TourOutlineDay[]
): { days: ProposalDayDetail[]; glance: ProposalItineraryRow[] } {
  if (!outlineRows.length) return { days, glance };
  const byDay = new Map(outlineRows.map((r) => [r.dayNumber, r]));

  const nextDays = days.map((day) => {
    const row = byDay.get(day.dayNumber);
    if (!row) return day;
    const hotel = stripHtmlToPlain(row.hotels);
    const location = stripHtmlToPlain(row.location);
    const activitiesPlain = stripHtmlToPlain(row.activities);
    const meals = inferMealsFromText(activitiesPlain);
    return {
      ...day,
      hotel: hotel && hotel !== '—' ? hotel : day.hotel,
      destination: location || day.destination,
      meals: meals !== 'As per program' ? meals : day.meals,
    };
  });

  const nextGlance = glance.map((row) => {
    const outline = byDay.get(row.dayNumber);
    if (!outline) return row;
    const hotel = stripHtmlToPlain(outline.hotels);
    const location = stripHtmlToPlain(outline.location);
    return {
      ...row,
      hotel: hotel && hotel !== '—' ? hotel : row.hotel,
      destination: location || row.destination,
    };
  });

  return { days: nextDays, glance: nextGlance };
}

function resolveRegionTag(brief: TourBrief, packageId: string | null): string {
  if (packageId) {
    const pkg = TOUR_PACKAGES.find((p) => p.id === packageId);
    if (pkg?.tag) return pkg.tag;
  }
  return brief.region || 'generic';
}

function findProductsForDay(day: ProposalDayDetail, products: Product[]): Product[] {
  const dest = (day.destination || '').toLowerCase();
  const title = (day.title || '').toLowerCase();
  const body = (day.body || '').toLowerCase();
  const tokens = dest
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);

  return products.filter((p) => {
    if (isFlightProduct(p)) return false;
    const hay = `${p.dest} ${p.name} ${p.region}`.toLowerCase();
    if (tokens.some((t) => hay.includes(t))) return true;
    return hay
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4)
      .some((t) => title.includes(t) || body.includes(t));
  });
}

function findProductForSegment(
  segment: ProposalDaySegment,
  products: Product[]
): Product | undefined {
  if (segment.productCode) {
    const byCode = products.find((p) => p.code === segment.productCode);
    if (byCode) return byCode;
  }
  const title = (segment.title || '').toLowerCase();
  return products.find((p) => !isFlightProduct(p) && p.name.toLowerCase() === title);
}

function collectPhotosForProduct(
  product: Product | undefined,
  day: ProposalDayDetail,
  galleryPhotos: GalleryPhoto[],
  regionTag: string,
  count: number,
  exclude: string[] = []
): string[] {
  const urls: string[] = [];
  const seen = new Set(exclude);
  const want = Math.max(count, 1);
  const fetchN = want + seen.size + 2;

  if (product) {
    for (const ph of resolveProductPhotos(product, galleryPhotos, fetchN)) {
      if (ph.url && !seen.has(ph.url)) {
        urls.push(ph.url);
        seen.add(ph.url);
      }
      if (urls.length >= want) return urls.slice(0, want);
    }
  }

  if (urls.length < want) {
    const title = product?.name || day.title || day.destination;
    for (const ph of resolvePackageDayPhotos(
      title,
      regionTag,
      day.hotel,
      galleryPhotos,
      day.dayNumber,
      fetchN
    )) {
      if (ph.url && !seen.has(ph.url)) {
        urls.push(ph.url);
        seen.add(ph.url);
      }
      if (urls.length >= want) return urls.slice(0, want);
    }
  }

  return urls.slice(0, want);
}

export function attachDayImages(
  days: ProposalDayDetail[],
  products: Product[],
  galleryPhotos: GalleryPhoto[],
  packageId: string | null,
  brief: TourBrief
): ProposalDayDetail[] {
  const regionTag = resolveRegionTag(brief, packageId);
  return days.map((day) => {
    if (day.segments?.length) {
      const perSegment = 2;
      const used: string[] = [];
      const segments = day.segments.map((seg) => {
        const product = findProductForSegment(seg, products);
        const imageUrls = collectPhotosForProduct(
          product,
          day,
          galleryPhotos,
          regionTag,
          perSegment,
          used
        );
        used.push(...imageUrls);
        return { ...seg, imageUrls };
      });
      const imageUrls = segments.flatMap((s) => s.imageUrls);
      return { ...day, segments, imageUrls };
    }

    const urls: string[] = [];
    const matched = findProductsForDay(day, products);

    for (const p of matched) {
      const photos = resolveProductPhotos(p, galleryPhotos, 2);
      for (const ph of photos) {
        if (ph.url && !urls.includes(ph.url)) urls.push(ph.url);
        if (urls.length >= 2) break;
      }
      if (urls.length >= 2) break;
    }

    if (urls.length < 2) {
      const pkgPhotos = resolvePackageDayPhotos(
        day.title || day.destination,
        regionTag,
        day.hotel,
        galleryPhotos,
        day.dayNumber,
        2 - urls.length
      );
      for (const ph of pkgPhotos) {
        if (ph.url && !urls.includes(ph.url)) urls.push(ph.url);
      }
    }

    return { ...day, imageUrls: urls.slice(0, 2) };
  });
}

function suggestFiveStarHotel(location: string, catalog: Hotel[]): Hotel | undefined {
  const loc = (location || '').toLowerCase();
  const locKey = loc.split(/[,\-–]/)[0]?.trim() || '';
  const fiveStar = catalog.filter((h) => /5/.test(String(h.stars)));
  if (!fiveStar.length) return undefined;
  return (
    fiveStar.find((h) => {
      const dest = (h.dest || '').toLowerCase();
      const name = (h.name || '').toLowerCase();
      return (
        (locKey && (dest.includes(locKey) || loc.includes(dest) || name.includes(locKey))) ||
        (loc && dest && loc.includes(dest))
      );
    }) || fiveStar[0]
  );
}

/** Parallel Option B rows from Option A stays; suggest 5★ names from catalog when available. */
export function seedOptionBHotelRates(
  optionA: ProposalHotelRate[],
  hotelsCatalog: Hotel[] = []
): ProposalHotelRate[] {
  return optionA.map((a) => {
    const suggested = suggestFiveStarHotel(a.location, hotelsCatalog);
    return {
      id: `optb-${a.id}`,
      hotelName: suggested?.name || '',
      location: a.location,
      stayFrom: a.stayFrom,
      stayTo: a.stayTo,
      roomType: 'Deluxe Double Room',
      nights: a.nights,
      ratePerNight: 0,
    };
  });
}

function formatMealsCode(code: string): string {
  const c = (code || '').toUpperCase();
  const parts: string[] = [];
  if (c.includes('B')) parts.push('Breakfast');
  if (c.includes('L')) parts.push('Lunch');
  if (c.includes('D')) parts.push('Dinner');
  return parts.length ? parts.join(', ') : 'No meals included';
}

function inferMealsFromText(text: string): string {
  const lower = text.toLowerCase();
  if (/meals?:\s*/i.test(text)) {
    const m = text.match(/meals?:\s*([^\n]+)/i);
    if (m) return m[1].trim();
  }
  if (lower.includes('breakfast') && lower.includes('lunch') && lower.includes('dinner')) return 'Breakfast, Lunch, Dinner';
  if (lower.includes('breakfast') && lower.includes('lunch')) return 'Breakfast, Lunch';
  if (lower.includes('breakfast')) return 'Breakfast';
  return 'As per program';
}

function buildFlights(
  brief: TourBrief,
  packageId: string | null,
  outlineRows: TourOutlineDay[],
  products: Product[]
): ProposalFlightRow[] {
  const flights: ProposalFlightRow[] = [];
  const pkg = packageId ? TOUR_PACKAGES.find((p) => p.id === packageId) : null;

  if (pkg?.flights?.length) {
    pkg.flights.forEach((f, i) => {
      flights.push({
        index: i + 1,
        route: f.split('—')[0]?.trim() || f,
        sector: f,
        airline: 'Vietnam Airlines',
        dateLabel: 'As per itinerary',
      });
    });
    return flights;
  }

  const flightProducts = products.filter(isFlightProduct);
  flightProducts.forEach((p, i) => {
    flights.push({
      index: i + 1,
      route: p.dest || p.name,
      sector: p.name,
      airline: 'Vietnam Airlines',
      dateLabel: 'As per itinerary',
    });
  });

  for (const row of outlineRows) {
    const text = stripHtmlToPlain(row.activities);
    const routeMatch = text.match(/([A-Z]{3})\s*[→\-–>]\s*([A-Z]{3})/);
    const vnMatch = text.match(/VN\s*\d+/i);
    const airlineMatch = text.match(/Vietnam Airlines|VietJet|Bamboo/i);
    if (routeMatch || vnMatch) {
      flights.push({
        index: flights.length + 1,
        route: routeMatch ? `${routeMatch[1]} → ${routeMatch[2]}` : 'Domestic sector',
        sector: text.split('\n')[0]?.slice(0, 120) || text.slice(0, 120),
        airline: airlineMatch?.[0] || 'Vietnam Airlines',
        dateLabel: `Day ${row.dayNumber} — ${fmtOutlineDate(resolveDayDateIso(brief, row.dayNumber, row.date))}`,
        dayNumber: row.dayNumber,
      });
    }
  }

  const seen = new Set<string>();
  return flights.filter((f) => {
    const key = `${f.route}|${f.dayNumber}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function aggregateInclusions(
  products: Product[],
  packageId: string | null,
  productPricing?: ProductPricing[]
): string[] {
  const pkg = packageId ? TOUR_PACKAGES.find((p) => p.id === packageId) : null;
  if (pkg?.incl?.length) return [...pkg.incl];

  const flags = { g: false, tr: false, tk: false, w: false, m: false };
  for (const p of products) {
    const row = productPricing?.find((r) => r.productCode === p.code) ?? findProductPricing(p.code);
    if (!row) continue;
    ICO_KEYS.forEach((k) => {
      if (row.incl[k]) flags[k] = true;
    });
  }

  const dynamic = ICO_KEYS.map((k, i) => (flags[k] ? INCL_YES[i] : null)).filter(Boolean) as string[];
  const merged = [...PROPOSAL_DEFAULT_INCLUSIONS];
  for (const item of dynamic) {
    if (!merged.some((m) => m.toLowerCase().includes(item.split(' ')[0].toLowerCase()))) {
      merged.push(item);
    }
  }
  if (briefFlightsIncluded(products, packageId)) {
    merged.push('Domestic flights as specified in the program — economy class');
  }
  return merged;
}

function briefFlightsIncluded(products: Product[], packageId: string | null): boolean {
  if (packageId) {
    const pkg = TOUR_PACKAGES.find((p) => p.id === packageId);
    if (pkg?.flights?.length) return true;
  }
  return products.some(isFlightProduct);
}

function aggregateExclusions(packageId: string | null): string[] {
  const pkg = packageId ? TOUR_PACKAGES.find((p) => p.id === packageId) : null;
  if (pkg?.excl?.length) return [...pkg.excl];
  return [...PROPOSAL_DEFAULT_EXCLUSIONS];
}

export function extractHotelBlocksFromOutline(brief: TourBrief, rows: TourOutlineDay[]): ProposalHotelRate[] {
  const sorted = [...rows].sort((a, b) => a.dayNumber - b.dayNumber);
  const blocks: ProposalHotelRate[] = [];
  let current: ProposalHotelRate | null = null;

  for (const row of sorted) {
    const hotelName = stripHtmlToPlain(row.hotels);
    if (!hotelName || hotelName === '—' || /departure|guest/i.test(hotelName)) continue;

    const location = stripHtmlToPlain(row.location) || '';
    const dateIso = resolveDayDateIso(brief, row.dayNumber, row.date);

    if (current && current.hotelName === hotelName) {
      current.nights += 1;
      current.stayTo = dateIso;
    } else {
      if (current) blocks.push(current);
      current = {
        id: `hotel-${row.id}`,
        hotelName,
        location,
        stayFrom: dateIso,
        stayTo: dateIso,
        roomType: 'Superior Double Room',
        nights: 1,
        ratePerNight: 0,
      };
    }
  }
  if (current) blocks.push(current);

  return blocks.map((b) => ({
    ...b,
    stayFrom: b.stayFrom ? formatDisplayDate(b.stayFrom) : 'TBC',
    stayTo: b.stayTo ? formatDisplayDate(b.stayTo) : 'TBC',
  }));
}

function buildSpecialNotes(brief: TourBrief, override?: string): string {
  if (override?.trim()) return override.trim();
  const parts = [brief.specialRequests, brief.dietary, brief.mobility].filter(Boolean);
  return parts.join('\n') || 'e.g. dietary requirements, accessibility needs, preferred pace, anniversary or special occasion celebrations…';
}

function buildTourTitle(brief: TourBrief, packageId: string | null, productCount: number): string {
  if (packageId) {
    const pkg = TOUR_PACKAGES.find((p) => p.id === packageId);
    if (pkg) return pkg.name.toUpperCase();
  }
  const region = REG_LABELS[brief.region as keyof typeof REG_LABELS] || brief.region || 'Vietnam';
  const days = parseDurationDays(brief.duration) || productCount || '';
  return `${region}${days ? ` ${days} DAYS` : ''} — PRIVATE TOUR`.toUpperCase();
}

function buildRoute(brief: TourBrief, packageId: string | null, glance: ProposalItineraryRow[]): string {
  if (packageId) {
    const pkg = TOUR_PACKAGES.find((p) => p.id === packageId);
    if (pkg?.route) return pkg.route.replace(/ – /g, ' › ').replace(/ - /g, ' › ');
  }
  const locs = glance.map((g) => g.destination).filter((d) => d && d !== '—');
  const unique: string[] = [];
  for (const l of locs) {
    const short = l.split(/[,\-–]/)[0]?.trim();
    if (short && !unique.includes(short)) unique.push(short);
  }
  return unique.length ? unique.join(' › ') : brief.mustSee || 'Vietnam';
}

function buildB2CPricing(
  brief: TourBrief,
  codes: string[],
  packageId: string | null,
  markupPct: number,
  tourTitle: string
): ProposalB2CPricing {
  const tierN = paxToTierN(brief.pax);
  let perPerson = sumSellForProducts(codes, tierN, markupPct);
  if (!perPerson && packageId) {
    perPerson = getPackageSellPerPax(packageId, brief.pax, brief.travelMonth);
  }
  return {
    kind: 'b2c',
    packageLabel: tourTitle,
    perPerson,
    groupTotal: perPerson * brief.pax,
    pax: brief.pax,
    currency: 'USD',
    seasonNote: `${brief.pax} Guests · ${brief.travelMonth || 'Travel dates TBC'} · ${inferSeason(brief.travelMonth)} · Private Tour`,
  };
}

function buildB2BPricing(
  brief: TourBrief,
  products: Product[],
  codes: string[],
  packageId: string | null,
  markupPct: number,
  hotelRatesOptionA: ProposalHotelRate[],
  hotelRatesOptionB: ProposalHotelRate[]
): ProposalB2BPricing {
  const tierN = paxToTierN(brief.pax);
  const groundCodes = codes.filter((c) => {
    const p = products.find((x) => x.code === c);
    return p && !isFlightProduct(p) && !isHotelProduct(p);
  });
  const flightCodes = codes.filter((c) => {
    const p = products.find((x) => x.code === c);
    return p && isFlightProduct(p);
  });

  let touringsPerPax = sumSellForProducts(groundCodes, tierN, markupPct);
  let flightsPerPax = sumSellForProducts(flightCodes, tierN, markupPct);

  if (!touringsPerPax && packageId) {
    const pkgTotal = getPackageSellPerPax(packageId, brief.pax, brief.travelMonth);
    touringsPerPax = Math.round(pkgTotal * 0.75);
    flightsPerPax = Math.round(pkgTotal * 0.15);
  }

  const hotelsTotalOptionA = hotelRatesOptionA.reduce((s, h) => s + h.ratePerNight * h.nights, 0);
  const hotelsTotalOptionB = hotelRatesOptionB.reduce((s, h) => s + h.ratePerNight * h.nights, 0);

  return {
    kind: 'b2b',
    pax: brief.pax,
    currency: 'USD',
    seasonNote: `${brief.pax} Passengers · ${brief.travelMonth || 'TBC'} · ${inferSeason(brief.travelMonth)} · Private Tour`,
    touringsPerPax,
    touringsTotal: touringsPerPax * brief.pax,
    flightsPerPax,
    flightsTotal: flightsPerPax * brief.pax,
    hotelsTotalOptionA,
    hotelsTotalOptionB,
    hotelRatesOptionA,
    hotelRatesOptionB,
  };
}

function normalizeAccommodationOptionA(tier: string): string {
  const t = (tier || '').trim();
  if (!t) return '4★ Boutique Properties';
  if (/5\s*★|5-?\s*star/i.test(t) && !/4/.test(t)) return '4★ Boutique Properties';
  return t;
}

export function assembleProposalDoc(input: AssembleProposalInput): ProposalDoc {
  const {
    brief,
    clientType,
    customerName,
    outlineRows,
    products,
    selectedCodes,
    selectedPackageId,
    markupPct,
    leadId,
    hotelRatesOptionA: hotelRatesOptionAInput,
    hotelRatesOptionB: hotelRatesOptionBInput,
    hotelRates: hotelRatesLegacy,
    inclusionsOverride,
    exclusionsOverride,
    specialNotesOverride,
    logoUrl = '/Logo-3.svg',
    galleryPhotos = [],
    hotelsCatalog = [],
    experienceOverrides = {},
  } = input;

  const variant: ProposalVariant = clientType === 'b2b' ? 'b2b' : 'b2c';
  const codes = resolveEffectiveCodes(selectedCodes);
  const preparedDate = localTodayIso();

  let glance: ProposalItineraryRow[] = [];
  let days: ProposalDayDetail[] = [];

  const selectedProducts = codes.length
    ? products.filter((p) => codes.includes(p.code))
    : [];

  if (selectedProducts.length) {
    ({ glance, days } = buildItineraryFromProducts(
      brief,
      selectedProducts,
      experienceOverrides
    ));
    ({ glance, days } = overlayOutlineMeta(days, glance, outlineRows));
  } else if (outlineRows.length) {
    ({ glance, days } = buildItineraryFromOutline(brief, outlineRows));
  } else if (selectedPackageId) {
    ({ glance, days } = buildItineraryFromPackage(brief, selectedPackageId));
  } else if (products.length) {
    ({ glance, days } = buildItineraryFromProducts(brief, products, experienceOverrides));
  }

  days = attachDayImages(days, products, galleryPhotos, selectedPackageId, brief);

  const dayCount = days.length || parseDurationDays(brief.duration) || totalDurationDays(products);
  const endDate = resolveEndDate(brief, dayCount);
  const pkg = selectedPackageId ? TOUR_PACKAGES.find((p) => p.id === selectedPackageId) : null;

  const tourTitle = buildTourTitle(brief, selectedPackageId, products.length);
  const tagline =
    pkg?.tagline?.replace(/^"|"$/g, '') ||
    brief.notes ||
    "A private journey through Vietnam's most remarkable landscapes and cultures.";
  const route = buildRoute(brief, selectedPackageId, glance);

  const hotelRatesOptionA =
    hotelRatesOptionAInput?.length
      ? hotelRatesOptionAInput
      : hotelRatesLegacy?.length
        ? hotelRatesLegacy
        : extractHotelBlocksFromOutline(brief, outlineRows);

  const hotelRatesOptionB =
    hotelRatesOptionBInput?.length
      ? hotelRatesOptionBInput
      : seedOptionBHotelRates(hotelRatesOptionA, hotelsCatalog);

  const pricing =
    variant === 'b2b'
      ? buildB2BPricing(
          brief,
          products,
          codes,
          selectedPackageId,
          markupPct,
          hotelRatesOptionA,
          hotelRatesOptionB
        )
      : buildB2CPricing(brief, codes, selectedPackageId, markupPct, tourTitle);

  const guestLabel =
    brief.children > 0
      ? `${brief.pax} Passengers (${brief.adults} adults + ${brief.children} child${brief.children > 1 ? 'ren' : ''})`
      : `${brief.pax} Passenger${brief.pax > 1 ? 's' : ''}`;

  return {
    variant,
    quoteRef: generateQuoteRef(leadId),
    preparedDate: formatDisplayDate(preparedDate),
    validUntil: '30 days from issue',
    brief,
    clientType,
    customerName: customerName || brief.clientName || 'To be confirmed',
    agentName: brief.agentRef || undefined,
    consultant: resolveConsultant(brief.salesperson),
    tourTitle,
    tagline,
    route,
    durationLabel: brief.duration || `${dayCount} Days / ${Math.max(dayCount - 1, 0)} Nights`,
    travelDateRange: formatDateRange(brief.startDate, endDate, brief.travelMonth),
    season: inferSeason(brief.travelMonth),
    rooming: inferRooming(brief.pax),
    guestCountLabel: guestLabel,
    accommodationOptionA: normalizeAccommodationOptionA(brief.hotelTier),
    accommodationOptionB: '5★ Luxury Hotels & Resorts',
    flights: buildFlights(brief, selectedPackageId, outlineRows, products),
    itineraryGlance: glance,
    days,
    inclusions: inclusionsOverride?.length
      ? inclusionsOverride
      : aggregateInclusions(products, selectedPackageId, input.productPricing),
    exclusions: exclusionsOverride?.length ? exclusionsOverride : aggregateExclusions(selectedPackageId),
    pricing,
    hotelRatesOptionA,
    hotelRatesOptionB,
    specialNotes: buildSpecialNotes(brief, specialNotesOverride),
    logoUrl,
  };
}
