export type Stage =
  | 'Inquiry'
  | 'Designing'
  | 'Quoted'
  | 'Negotiation'
  | 'Confirmed'
  | 'On Tour'
  | 'Completed'
  | 'Lost'
  | 'Pending';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  nat: string;
  source: string;
  style: string;
  lang: string;
  notes: string;
  bookings: string[];
  clientType?: 'b2b' | 'b2c';
  agentName?: string;
  agentId?: string;
  salesperson?: string;
  whatsapp?: string;
  hotelTier?: string;
  budget?: string;
  /** Optional deal revenue (USD). */
  revenue?: number;
  /** Optional deal cost (USD). */
  cost?: number;
  /** Optional deal profit (USD); typically revenue − cost. */
  profit?: number;
  travelMonth?: string;
  children?: number;
  adults?: number;
  firstTime?: string;
  intlFlights?: string;
  childAges?: string;
  childDiet?: string;
  childPrefs?: string;
  flights?: string;
  visaStatus?: string;
  interests?: string;
  donts?: string;
}

export interface Comm {
  id: string;
  cid: string;
  date: string;
  type: string;
  dir: 'inbound' | 'outbound';
  subj: string;
  body: string;
  author: string;
}

export interface Lead {
  id: string;
  custId: string;
  tour: string;
  pax: number | string;
  value: number;
  month: string;
  stage: Stage | string;
  owner: string;
  followUpDate?: string;
  nextAction?: string;
  probability?: number;
  clientType?: string;
  currency?: string;
  needsTourDesign?: boolean;
  tourDesignAcked?: boolean;
  notes?: string;
  [key: string]: unknown;
}

export type OutlineStatus = 'draft' | 'sent' | 'approved';

/** Per-product draft edits on Step 2 Draft Itinerary (not catalog Product data). */
export interface ExperienceOverride {
  /** Edited narrative shown in draft + product-path export. */
  desc?: string;
  /** YYYY-MM-DD override for day label / export dateLabel. */
  date?: string;
  /** 1-based day number for display / export (may differ from packed day). */
  dayIndex?: number;
  /** Packing override: treat as full day (1) or half day (0.5). */
  durOverride?: 'full' | 'half';
  /** Client-facing note appended in proposal export. */
  clientNote?: string;
}

export interface TourDraft {
  id: string;
  leadId: string;
  custId: string;
  briefJson?: Record<string, unknown>;
  outlineStatus: OutlineStatus;
  outlineNotes?: string;
  outlineSentAt?: string;
  outlineApprovedAt?: string;
  outlineRevision?: number;
  /** Monotonic persistence version used to reject stale Tour Design saves. */
  saveRevision?: number;
  selectedCodes?: string[];
  selectedPackageId?: string | null;
  /** Draft-scoped edits keyed by product code; persisted under brief_json.__experienceOverrides. */
  experienceOverrides?: Record<string, ExperienceOverride>;
  markupPct?: number;
  clientType?: 'b2c' | 'b2b';
  currentStep?: number;
}

export interface TourOutlineDay {
  id: string;
  draftId: string;
  dayNumber: number;
  date?: string;
  location?: string;
  activities?: string;
  hotels?: string;
  sortOrder?: number;
}

export interface BookingActivity {
  name: string;
  cat: string;
}

export interface BookingItineraryDay {
  day: number;
  dest: string;
  hotel: string;
  activities: BookingActivity[];
}

export interface Booking {
  id: string;
  custId: string;
  /** Pipeline lead that created this booking (Confirmed auto-bridge). */
  leadId?: string;
  tour: string;
  pax: number;
  start: string;
  end: string;
  total: number;
  deposit: number;
  status: string;
  guide: string;
  hotel: string;
  changes: unknown[];
  guideAlertPending: boolean;
  itinerary?: BookingItineraryDay[];
}

export interface Agent {
  id: string;
  name: string;
  country: string;
  tier: string;
  commissionPct: number;
  contactName: string;
  email: string;
  phone: string;
  currency: string;
  status: string;
  notes: string;
}

export interface Attraction {
  id: string;
  region: 'north' | 'central' | 'south';
  type: string;
  name: string;
  dest: string;
  hours: string;
  closed: string;
  admission: string;
  duration: number;
  best_time: string;
  crowd: string;
  book_req: boolean;
  seasonal: string;
  notes: string;
  alert: string;
  phone: string;
  /** Up to 4 featured photos shown on the attraction schedule card */
  photoIds: string[];
  /** Full photo pool linked from Photo Gallery (unlimited) */
  linkedPhotoIds: string[];
}

export interface Guide {
  id: string;
  fullname: string;
  ename: string;
  region: string;
  langs: string;
  specialty: string;
  license: string;
  rate: number;
  rating: string;
  status: string;
  photo: string;
  years: number;
  location: string;
  phone: string;
  email: string;
  shirtSize: string;
  bankAccount: string;
  address: string;
  bio: string;
  reviews: unknown[];
}

export interface Product {
  code: string;
  name: string;
  logic: string;
  dur: string;
  cat: string;
  dest: string;
  lvl: string;
  desc: string;
  usp: string;
  /** Staff-only sales bullets from portfolio; not for client proposals. */
  notesToSales?: string;
  price: string;
  region: string;
  nameVn?: string;
  status?: 'active' | 'draft' | 'archived';
  /** Up to 2 featured photos for card / proposal preview */
  photoIds?: string[];
  /** Full photo pool linked from Photo Library */
  linkedPhotoIds?: string[];
  /** Catalog-page hero thumb from the list API — not persisted. */
  coverThumbUrl?: string;
}

export interface ProductPricingInclusions {
  g: boolean;
  tr: boolean;
  tk: boolean;
  w: boolean;
  m: boolean;
}

export interface ProductPricing {
  productCode: string;
  stdCost: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  p6: number;
  p7: number;
  p8: number;
  p9: number;
  p10: number;
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  c6: number;
  c7: number;
  c8: number;
  c9: number;
  c10: number;
  incl: ProductPricingInclusions;
}

export interface StaffMember {
  id: string;
  name: string;
  ename?: string;
  pos: string;
  dept: string;
  status: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  time: string;
  reactions: string[];
}

export interface ChatMessages {
  [channel: string]: ChatMessage[];
}

export interface Task {
  id?: string;
  title?: string;
  assignee?: string;
  date?: string;
  priority?: string;
  dept?: string;
  status?: string;
  notes?: string;
}

export interface BackupData {
  customers: Customer[];
  leads: Lead[];
  bookings: Booking[];
  agents: Agent[];
  attractions: Attraction[];
  guides: Guide[];
  products: Product[];
  productPricing: ProductPricing[];
  comms: Comm[];
  finance: unknown[];
  ar: unknown[];
  ap: unknown[];
  tax: unknown[];
  staff: StaffMember[];
  tasks: unknown[];
  feedback: unknown[];
  contracts: unknown[];
  photoFolders: unknown[];
  photos: unknown[];
  messages: ChatMessages;
  calEvents: unknown[];
  devNotes: unknown[];
  hotels: Hotel[];
  cruises: CruiseSupplier[];
  transport: TransportSupplier[];
  restaurants: RestaurantSupplier[];
  specialSuppliers: ExtendedSupplier[];
  tourDrafts: TourDraft[];
  tourOutlineDays: TourOutlineDay[];
  exportedAt: string;
  version: string;
}

export interface HotelRoom {
  id?: string;
  type: string;
  view?: string;
  sqm?: number;
  lm: number;
  hm: number;
  fm: number;
  pm: number;
  ln: number;
  hn: number;
  fn: number;
  pn: number;
}

export interface Hotel {
  id: string;
  name: string;
  dest: string;
  cat: string;
  stars: string;
  region: 'north' | 'central' | 'south';
  rooms: HotelRoom[];
  status?: string;
}

export interface TransportSupplier {
  id: string;
  name: string;
  region?: string;
  vehicles?: string;
  rate?: string;
  notes?: string;
  supplierId?: string;
}

export interface RestaurantSupplier {
  id: string;
  name: string;
  city?: string;
  cuisine?: string;
  set?: string;
  cap?: number;
  rating?: string;
  notes?: string;
  supplierId?: string;
}

export interface CruiseSupplier {
  id: string;
  name: string;
  route?: string;
  cabins?: string;
  rate?: string;
  valid?: string;
  rating?: string;
  notes?: string;
  supplierId?: string;
}

export interface ExtendedSupplier {
  id: string;
  cat: string;
  subcat?: string;
  name: string;
  ename?: string;
  contact?: string;
  phone?: string;
  email?: string;
  location?: string;
  region?: string;
  rate?: string;
  currency?: string;
  payment?: string;
  contract?: string;
  cancel?: string;
  insurance?: string;
  avail?: string;
  desc?: string;
  notes?: string;
  tags?: string[];
  rating?: string;
  status?: string;
}

export interface CalEvent {
  id: string;
  guideId: string;
  bookingCode?: string;
  tour?: string;
  clients?: string;
  start: string;
  end: string;
  status: string;
  notes?: string;
}

export type PageSlug =
  | 'dashboard'
  | 'planner'
  | 'customers'
  | 'agents'
  | 'sales'
  | 'tourdesign'
  | 'products'
  | 'gallery'
  | 'pricing'
  | 'pricing-essentials'
  | 'pricing-accommodation'
  | 'bookings'
  | 'contracts'
  | 'suppliers'
  | 'guides'
  | 'weather'
  | 'attractions'
  | 'posttour'
  | 'finance'
  | 'tax'
  | 'salary'
  | 'about'
  | 'culture'
  | 'regulations'
  | 'hr'
  | 'ai'
  | 'devnotes'
  | 'teamchat'
  | 'access-control'
  | 'settings';
