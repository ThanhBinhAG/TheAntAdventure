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
  travelMonth?: string;
  children?: number;
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
  [key: string]: unknown;
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
  price: string;
  region: string;
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

export interface BackupData {
  customers: Customer[];
  leads: Lead[];
  bookings: Booking[];
  agents: Agent[];
  guides: Guide[];
  products: Product[];
  comms: Comm[];
  finance: unknown[];
  ar: unknown[];
  ap: unknown[];
  tax: unknown[];
  staff: StaffMember[];
  tasks: unknown[];
  feedback: unknown[];
  contracts: unknown[];
  photos: unknown[];
  messages: ChatMessages;
  calEvents: unknown[];
  devNotes: unknown[];
  cruises: unknown[];
  transport: unknown[];
  restaurants: unknown[];
  specialSuppliers: unknown[];
  exportedAt: string;
  version: string;
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
  | 'teamchat';
