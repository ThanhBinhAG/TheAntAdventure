import { WR } from '@/lib/seeds/weather';
import type { TravelRating, WeatherDayForecast, WeeklyDestinationForecast } from '@/lib/weather/types';

const SCORE: Record<TravelRating, number> = { E: 4, G: 3, F: 2, P: 1 };

export function ratingScore(code: string): number {
  return SCORE[code as TravelRating] ?? 2;
}

export function weekComfort(days: WeatherDayForecast[]): {
  avg: number;
  label: string;
  excellentDays: number;
  totalRain: number;
} {
  if (!days.length) return { avg: 0, label: '—', excellentDays: 0, totalRain: 0 };
  const sum = days.reduce((acc, d) => acc + ratingScore(d.rating), 0);
  const avg = sum / days.length;
  const excellentDays = days.filter((d) => d.rating === 'E' || d.rating === 'G').length;
  const totalRain = days.reduce((acc, d) => acc + d.precipMm, 0);
  let label = 'Mixed';
  if (avg >= 3.5) label = 'Ideal';
  else if (avg >= 2.75) label = 'Favorable';
  else if (avg >= 2) label = 'Fair week';
  else label = 'Tough week';
  return { avg, label, excellentDays, totalRain };
}

export function formatDayParts(isoDate: string): { weekday: string; dayNum: string; isToday: boolean } {
  const d = new Date(isoDate + 'T12:00:00');
  const today = new Date();
  const todayIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(today);
  return {
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    dayNum: d.toLocaleDateString('en-GB', { day: 'numeric' }),
    isToday: isoDate === todayIso,
  };
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

/** Simple WMO code → glyph class for CSS weather marks */
export function weatherGlyph(code: number): 'sun' | 'cloud' | 'rain' | 'storm' | 'fog' {
  if (code === 0) return 'sun';
  if (code <= 3) return 'cloud';
  if (code >= 95) return 'storm';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 80 && code <= 82) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 71) return 'cloud';
  return 'cloud';
}

export function sortByComfort(dests: WeeklyDestinationForecast[]): WeeklyDestinationForecast[] {
  return [...dests].sort((a, b) => weekComfort(b.days).avg - weekComfort(a.days).avg);
}

export function wrStyle(code: string) {
  return WR[code as keyof typeof WR] || WR.G;
}
