import type { TourBrief } from './tour-design-types';

export type ProposalVariant = 'b2c' | 'b2b';

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

export interface ProposalDayDetail {
  dayNumber: number;
  dateLabel: string;
  destination: string;
  title: string;
  body: string;
  hotel: string;
  meals: string;
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
  hotelsTotal: number;
  hotelRates: ProposalHotelRate[];
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
  hotelRates: ProposalHotelRate[];
  specialNotes: string;
  logoUrl: string;
}

export interface AssembleProposalInput {
  brief: TourBrief;
  clientType: 'b2c' | 'b2b';
  customerName: string;
  outlineRows: import('./types').TourOutlineDay[];
  products: import('./types').Product[];
  selectedCodes: string[];
  selectedPackageId: string | null;
  markupPct: number;
  leadId?: string;
  hotelRates?: ProposalHotelRate[];
  inclusionsOverride?: string[];
  exclusionsOverride?: string[];
  specialNotesOverride?: string;
  logoUrl?: string;
  productPricing?: import('./types').ProductPricing[];
}
