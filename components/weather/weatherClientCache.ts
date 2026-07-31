import type { WeeklyWeatherResponse } from '@/lib/weather/types';

const SESSION_KEY = 'ant_weather_weekly_v1';

export function readWeeklySessionCache(): WeeklyWeatherResponse | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeeklyWeatherResponse;
    if (!parsed?.destinations?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeWeeklySessionCache(payload: WeeklyWeatherResponse): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}
