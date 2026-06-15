import type { ComponentType } from 'react';
import type { PageSlug } from '@/lib/types';
import Dashboard from './Dashboard';
import Customers from './Customers';
import Sales from './Sales';
import Bookings from './Bookings';
import Guides from './Guides';
import Agents from './Agents';
import Products from './Products';
import TourDesign from './TourDesign';
import Finance from './Finance';
import TeamChat from './TeamChat';
import Pricing from './Pricing';
import Gallery from './Gallery';
import Weather from './Weather';
import Planner from './Planner';
import Tax from './Tax';
import Salary from './Salary';
import About from './About';
import Culture from './Culture';
import Regulations from './Regulations';
import HR from './HR';
import AI from './AI';
import DevNotes from './DevNotes';
import Attractions from './Attractions';
import PostTour from './PostTour';
import Contracts from './Contracts';
import Suppliers from './Suppliers';

export const PAGE_COMPONENTS: Record<PageSlug, ComponentType> = {
  dashboard: Dashboard,
  planner: Planner,
  customers: Customers,
  agents: Agents,
  sales: Sales,
  tourdesign: TourDesign,
  products: Products,
  gallery: Gallery,
  pricing: Pricing,
  bookings: Bookings,
  contracts: Contracts,
  suppliers: Suppliers,
  guides: Guides,
  weather: Weather,
  attractions: Attractions,
  posttour: PostTour,
  finance: Finance,
  tax: Tax,
  salary: Salary,
  about: About,
  culture: Culture,
  regulations: Regulations,
  hr: HR,
  ai: AI,
  devnotes: DevNotes,
  teamchat: TeamChat,
};
