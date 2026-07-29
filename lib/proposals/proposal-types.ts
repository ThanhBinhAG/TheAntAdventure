import type { TourBrief } from '../tour-design/tour-design-types';

export type ProposalVariant = 'b2c' | 'b2b';

/** Detailed Program photo layout: Material-style sidebar (default) or inline horizontal grid. */
export type ProposalDetailedProgramLayout = 'sidebar' | 'inline';

export interface ProposalConsultant {
  name: string;
  email: string;
}

export interface ProposalFlightRow {
  index: number;
  route: string;
  sector: string;
  airline: string;
  dateLabel: string;
  dayNumber?: number;
}

export interface ProposalItineraryRow {
  dayNumber: number;
  dateLabel: string;
  destination: string;
  theme: string;
  hotel: string;
}

export interface ProposalDaySegment {
  title: string;
  body: string;
  imageUrls: string[];
  /** Product code for photo matching when packing multiple experiences into one day. */
  productCode?: string;
}

export interface ProposalDayDetail {
  dayNumber: number;
  dateLabel: string;
  destination: string;
  title: string;
  body: string;
  hotel: string;
  meals: string;
  imageUrls: string[];
  /** When set (e.g. two half-days), Detailed Program renders each segment with its own title/photos. */
  segments?: ProposalDaySegment[];
}

export interface ProposalHotelRate {
  id: string;
  hotelName: string;
  location: string;
  stayFrom: string;
  stayTo: string;
  roomType: string;
  nights: number;
  ratePerNight: number;
}

export interface ProposalOverviewRow {
  label: string;
  optionA: string;
  optionB: string;
}

export interface ProposalPricingText {
  packageLabel?: string;
  b2bGroundDesc?: string;
  b2bFlightsDesc?: string;
  footnote?: string;
}

export interface ProposalLegalText {
  paymentTerms?: string;
  cancellation?: string;
  amendment?: string;
  importantNotes?: string;
}

export interface ProposalB2CPricing {
  kind: 'b2c';
  packageLabel: string;
  perPerson: number;
  groupTotal: number;
  pax: number;
  currency: string;
  seasonNote: string;
}

export interface ProposalB2BPricing {
  kind: 'b2b';
  pax: number;
  currency: string;
  seasonNote: string;
  touringsPerPax: number;
  touringsTotal: number;
  flightsPerPax: number;
  flightsTotal: number;
  hotelsTotalOptionA: number;
  hotelsTotalOptionB: number;
  hotelRatesOptionA: ProposalHotelRate[];
  hotelRatesOptionB: ProposalHotelRate[];
}

export type ProposalPricing = ProposalB2CPricing | ProposalB2BPricing;

export interface ProposalDoc {
  variant: ProposalVariant;
  quoteRef: string;
  preparedDate: string;
  validUntil: string;
  brief: TourBrief;
  clientType: 'b2c' | 'b2b';
  customerName: string;
  agentName?: string;
  consultant: ProposalConsultant;
  tourTitle: string;
  tagline: string;
  route: string;
  durationLabel: string;
  travelDateRange: string;
  season: string;
  rooming: string;
  guestCountLabel: string;
  accommodationOptionA: string;
  accommodationOptionB: string;
  flights: ProposalFlightRow[];
  itineraryGlance: ProposalItineraryRow[];
  days: ProposalDayDetail[];
  inclusions: string[];
  exclusions: string[];
  pricing: ProposalPricing;
  hotelRatesOptionA: ProposalHotelRate[];
  hotelRatesOptionB: ProposalHotelRate[];
  specialNotes: string;
  logoUrl: string;
  /** Default `sidebar` matches Material samples; `inline` keeps the horizontal photo grid. */
  detailedProgramLayout: ProposalDetailedProgramLayout;
  /** Editor overrides for cover booking table values (keyed by row label). */
  bookingFields?: Record<string, string>;
  /** Editor overrides for Tour Overview table rows. */
  overviewRows?: ProposalOverviewRow[];
  /** Editor overrides for pricing descriptive text (amounts stay computed). */
  pricingText?: ProposalPricingText;
  /** Editor overrides for B2C legal section prose (serialized blocks). */
  legalText?: ProposalLegalText;
}

export interface AssembleProposalInput {
  brief: TourBrief;
  clientType: 'b2c' | 'b2b';
  customerName: string;
  outlineRows: import('../types').TourOutlineDay[];
  products: import('../types').Product[];
  selectedCodes: string[];
  selectedPackageId: string | null;
  markupPct: number;
  leadId?: string;
  hotelRatesOptionA?: ProposalHotelRate[];
  hotelRatesOptionB?: ProposalHotelRate[];
  /** @deprecated Use hotelRatesOptionA */
  hotelRates?: ProposalHotelRate[];
  inclusionsOverride?: string[];
  exclusionsOverride?: string[];
  specialNotesOverride?: string;
  logoUrl?: string;
  productPricing?: import('../types').ProductPricing[];
  galleryPhotos?: import('../tour-design/tour-design-types').GalleryPhoto[];
  hotelsCatalog?: import('../types').Hotel[];
  detailedProgramLayout?: ProposalDetailedProgramLayout;
  /** Per-product draft edits (desc / date / clientNote) from Step 2. */
  experienceOverrides?: Record<string, import('../types').ExperienceOverride>;
}
