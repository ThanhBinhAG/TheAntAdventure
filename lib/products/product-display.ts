import type { Product } from './types';

export function isSelectableProduct(p: Product): boolean {
  return !p.status || p.status === 'active';
}

export type DurationPillVariant = 'half' | 'full' | 'multiday' | 'service' | 'other';

export function getDurationPillVariant(dur: string): DurationPillVariant {
  const d = (dur || '').toLowerCase();
  if (d.includes('service')) return 'service';
  if (d.includes('full day') || d === 'full day') return 'full';
  if (d.includes('half') || d.includes('evening')) return 'half';
  if (/\d+\s*d/i.test(dur)) return 'multiday';
  return 'other';
}

export function getDurationPillLabel(dur: string): string {
  const trimmed = (dur || '').trim();
  if (!trimmed) return 'Experience';
  if (trimmed.toLowerCase().includes('service')) return 'Service';
  return trimmed;
}
