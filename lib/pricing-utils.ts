import { fmt } from './constants';
import type { TaaTour } from './seeds/taa-tours';

export const PL_FX_BASE = { USD: 1, VND: 25000, AUD: 1.55, EUR: 0.93 } as const;
export type PlCurrency = keyof typeof PL_FX_BASE;

export function getSpUSD(t: TaaTour, n: number) {
  const key = `p${n}` as keyof TaaTour;
  return (t[key] as number) || 0;
}

export function getCostUSD(t: TaaTour, n: number) {
  const key = `c${n}` as keyof TaaTour;
  return (t[key] as number) || 0;
}

export function mkPct(sp: number, co: number) {
  if (!co) return 0;
  return Math.round(((sp - co) / co) * 100);
}

export function fmtPx(amount: number, currency: PlCurrency = 'USD') {
  if (!amount) return '—';
  const rate = PL_FX_BASE[currency];
  const val = Math.round(amount * rate);
  if (currency === 'VND') return `${fmt(val)}₫`;
  if (currency === 'EUR') return `€${fmt(val)}`;
  if (currency === 'AUD') return `A$${fmt(val)}`;
  return `$${fmt(val)}`;
}

export const MULTI_DURATIONS = ['2 Days 1 Night', '3 Days 2 Nights', '4 Days 3 Nights'];

export const ICO_KEYS = ['g', 'tr', 'tk', 'w', 'm'] as const;
export const ICO_EMOJIS = ['🧑‍🦯', '🚐', '🏟', '💧', '🍽'];
export const ICO_LABELS = ['Guide', 'Transport', 'Tickets', 'Water', 'Meals'];
export const INCL_YES = [
  'Private guide included',
  'Air-conditioned transport',
  'Entrance tickets included',
  'Bottled water included',
  'Meals as per itinerary',
];
export const INCL_NO = [
  'No guide (self-guided)',
  'Own transport required',
  'Tickets at own cost',
  'Water not included',
  'Meals not included',
];
