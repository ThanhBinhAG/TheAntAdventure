import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { PageSlug } from '@/lib/types';
import PageRouteLoading from '@/components/PageRouteLoading';
import Dashboard from './Dashboard';
import Customers from './Customers';

const loadPage = (importer: () => Promise<{ default: ComponentType }>) =>
  dynamic(importer, { loading: PageRouteLoading });

export const PAGE_COMPONENTS: Record<PageSlug, ComponentType> = {
  dashboard: Dashboard,
  planner: loadPage(() => import('./Planner')),
  customers: Customers,
  agents: loadPage(() => import('./Agents')),
  sales: loadPage(() => import('./Sales')),
  tourdesign: loadPage(() => import('./TourDesign')),
  products: loadPage(() => import('./Products')),
  gallery: loadPage(() => import('./GalleryPage')),
  pricing: loadPage(() => import('./Pricing')),
  'pricing-essentials': loadPage(() => import('./PricingEssentials')),
  'pricing-accommodation': loadPage(() => import('./PricingAccommodation')),
  bookings: loadPage(() => import('./Bookings')),
  contracts: loadPage(() => import('./Contracts')),
  suppliers: loadPage(() => import('./Suppliers')),
  guides: loadPage(() => import('./Guides')),
  weather: loadPage(() => import('./Weather')),
  attractions: loadPage(() => import('./Attractions')),
  posttour: loadPage(() => import('./PostTour')),
  finance: loadPage(() => import('./Finance')),
  tax: loadPage(() => import('./Tax')),
  salary: loadPage(() => import('./Salary')),
  about: loadPage(() => import('./About')),
  culture: loadPage(() => import('./Culture')),
  regulations: loadPage(() => import('./Regulations')),
  hr: loadPage(() => import('./HR')),
  ai: loadPage(() => import('./AI')),
  devnotes: loadPage(() => import('./DevNotes')),
  teamchat: loadPage(() => import('./TeamChat')),
  'access-control': loadPage(() => import('./AccessControl')),
  settings: loadPage(() => import('./Settings')),
};
