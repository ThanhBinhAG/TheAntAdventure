export interface TourBrief {
  clientName: string;
  clientEmail: string;
  pax: number;
  adults: number;
  children: number;
  childAges: string;
  childDiet: string;
  childPrefs: string;
  duration: string;
  region: string;
  startDate: string;
  endDate: string;
  budget: string;
  tier: string;
  style: string;
  pace: string;
  interests: string[];
  interestsText: string;
  mustSee: string;
  avoid: string;
  dietary: string;
  mobility: string;
  notes: string;
  specialRequests: string;
  agentRef: string;
  language: string;
  travelMonth: string;
  hotelTier: string;
  budgetRange: string;
  flights: string;
  intlFlights: string;
  visa: string;
  nationality: string;
  firstTime: string;
  salesperson: string;
}

export const DEFAULT_TOUR_BRIEF: TourBrief = {
  clientName: '',
  clientEmail: '',
  pax: 2,
  adults: 2,
  children: 0,
  childAges: '',
  childDiet: '',
  childPrefs: '',
  duration: '7 Days 6 Nights',
  region: 'north',
  startDate: '',
  endDate: '',
  budget: '',
  tier: 'Gold',
  style: 'Luxury',
  pace: 'Moderate',
  interests: [],
  interestsText: '',
  mustSee: '',
  avoid: '',
  dietary: '',
  mobility: '',
  notes: '',
  specialRequests: '',
  agentRef: '',
  language: 'English',
  travelMonth: 'Oct',
  hotelTier: 'Boutique 4★',
  budgetRange: '$2,000–$3,500/pax',
  flights: 'yes',
  intlFlights: 'not-included',
  visa: 'exempt',
  nationality: '',
  firstTime: '',
  salesperson: '',
};

export type GalleryPhoto = {
  id: string;
  caption: string;
  region: string;
  tags?: string[];
  url?: string;
  thumbUrl?: string;
  storagePath?: string;
  displayBytes?: number;
  createdAt?: string;
};
