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
