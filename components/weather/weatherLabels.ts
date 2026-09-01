import { twth, type WEATHERKey } from '@/lib/i18n/pages/weather';
import type { AppLanguage } from '@/lib/i18n/stages';

/** WMO weather code → short label + glyph kind. */

export type WeatherGlyphKind = 'sun' | 'cloud' | 'rain' | 'storm' | 'fog';

const WEATHER_CODE_KEYS: Record<number, WEATHERKey> = {
  0: 'weatherSunny',
  1: 'weatherFewClouds',
  2: 'weatherScatteredClouds',
  3: 'weatherManyClouds',
  45: 'weatherFog',
  48: 'weatherFog',
};

function weatherCodeKey(code: number): WEATHERKey {
  if (WEATHER_CODE_KEYS[code]) return WEATHER_CODE_KEYS[code]!;
  if (code >= 51 && code <= 55) return 'weatherLightRain';
  if (code >= 56 && code <= 57) return 'weatherFreezingLightRain';
  if (code >= 61 && code <= 65) return 'weatherRain';
  if (code >= 66 && code <= 67) return 'weatherFreezingRain';
  if (code >= 71 && code <= 77) return 'weatherSnow';
  if (code >= 80 && code <= 82) return 'weatherRainShowers';
  if (code >= 85 && code <= 86) return 'weatherSnowShowers';
  if (code >= 95) return 'weatherThunderstorm';
  return 'weatherMixed';
}

export function weatherLabel(code: number, language: AppLanguage): string {
  return twth(weatherCodeKey(code), language);
}

/** @deprecated Use `weatherLabel(code, language)` */
export function weatherLabelVi(code: number): string {
  return weatherLabel(code, 'en');
}

export function weatherGlyphKind(code: number): WeatherGlyphKind {
  if (code <= 1) return 'sun';
  if (code <= 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 95) return 'storm';
  if (code >= 51) return 'rain';
  return 'cloud';
}

export function formatDayLabel(dateStr: string, language: AppLanguage): string {
  try {
    const locale = language === 'vi' ? 'vi-VN' : 'en-US';
    const d = new Date(`${dateStr}T12:00:00+07:00`);
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function regionLabel(region: string, language: AppLanguage): string {
  if (region === 'north') return twth('regionNorth', language);
  if (region === 'central') return twth('regionCentral', language);
  if (region === 'south') return twth('regionSouth', language);
  return region;
}

export function formatUpdatedAt(iso: string | null | undefined, language: AppLanguage): string {
  if (!iso) return '—';
  try {
    const locale = language === 'vi' ? 'vi-VN' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
