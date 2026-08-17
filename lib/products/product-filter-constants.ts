import type { PricingStatusFilter } from '@/lib/products/product-pricing-helpers';

export const PRODUCT_DURATION_OPTIONS = [
  'Half Day',
  'Full Day',
  'Evening (2–3 hours)',
  'Evening (3–4 hours)',
  '2 Days 1 Night',
  '3 Days 2 Nights',
  '4 Days 3 Nights',
  'Service',
] as const;

export const PRODUCT_REGIONS = [
  { value: 'north', label: 'Northern' },
  { value: 'central', label: 'Central' },
  { value: 'south', label: 'Southern' },
  { value: 'services', label: 'Services' },
] as const;

export const PRODUCT_PRICING_OPTIONS: { value: PricingStatusFilter; label: string }[] = [
  { value: '', label: 'All pricing' },
  { value: 'complete', label: 'Full pricing' },
  { value: 'incomplete', label: 'Partial' },
  { value: 'missing', label: 'No pricing' },
];
