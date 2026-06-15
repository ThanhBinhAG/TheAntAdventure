import { fmt } from './constants';

export const TIER_COLORS: Record<string, string> = {
  Platinum: '#6B21A8',
  Gold: '#C9A84C',
  Silver: '#1565C0',
  Bronze: '#D97706',
  Direct: '#6B7F74',
};

export const TIER_BG: Record<string, string> = {
  Platinum: '#F3E8FF',
  Gold: '#FDF6E3',
  Silver: '#E3F2FD',
  Bronze: '#FEF3C7',
  Direct: '#F0F0EE',
};

export const STAGE_COLORS: Record<string, string> = {
  Inquiry: 'bdg-b',
  Designing: 'bdg-p',
  Quoted: 'bdg-a',
  Negotiation: 'bdg-a',
  Confirmed: 'bdg-g',
  'On Tour': 'bdg-p',
  Completed: 'bdg-g',
  Lost: 'bdg-r',
  Pending: 'bdg-a',
};

export const SRC_COLORS: Record<string, string> = {
  Referral: 'bdg-g',
  Website: 'bdg-b',
  Agent: 'bdg-p',
  Direct: 'bdg-w',
  Virtuoso: 'bdg-a',
  Abercrombie: 'bdg-a',
};

export const FORECAST_STAGE_BADGE: Record<string, string> = {
  Inquiry: 'bdg-b',
  Designing: 'bdg-p',
  Quoted: 'bdg-a',
  Negotiation: 'bdg-a',
  Confirmed: 'bdg-g',
  'On Tour': 'bdg-p',
};

export const STAGE_PROB: Record<string, number> = {
  Inquiry: 10,
  Designing: 25,
  Quoted: 40,
  Negotiation: 40,
  Pending: 70,
  Confirmed: 90,
  'On Tour': 95,
  Completed: 100,
  Lost: 0,
};

export const REG_COLORS: Record<string, string> = {
  north: 'bdg-g',
  central: 'bdg-a',
  south: 'bdg-b',
  services: 'bdg-p',
};

export const REG_LABELS: Record<string, string> = {
  north: 'Northern VN',
  central: 'Central VN',
  south: 'Southern VN',
  services: 'Services',
  full: 'Full Route',
};

export const REG_COLORS_HEX: Record<string, [string, string]> = {
  north: ['#E8F5EE', '#1a5c38'],
  central: ['#FFF3CD', '#856404'],
  south: ['#E1F0FF', '#0c5464'],
  services: ['#F3E8FF', '#6B21A8'],
  full: ['#FFE4E1', '#c0392b'],
};

export function badge(text: string, cls: string) {
  return `<span class="bdg ${cls}">${text}</span>`;
}

export { fmt };

export function getCustomerName(customers: { id: string; name: string }[], custId: string) {
  return customers.find((c) => c.id === custId)?.name || custId;
}

export function npsBadgeClass(avg: number) {
  if (avg >= 9) return 'bdg-g';
  if (avg >= 7) return 'bdg-b';
  if (avg >= 5) return 'bdg-a';
  return 'bdg-r';
}

export function npsIcon(avg: number) {
  if (avg >= 9) return '😍';
  if (avg >= 7) return '🙂';
  if (avg >= 5) return '😐';
  return '😞';
}
