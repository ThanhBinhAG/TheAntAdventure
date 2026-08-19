/** WMO weather code → short Vietnamese label + glyph kind. */

export type WeatherGlyphKind = 'sun' | 'cloud' | 'rain' | 'storm' | 'fog';

export function weatherLabelVi(code: number): string {
  if (code === 0) return 'Sunny';
  if (code === 1) return 'Few clouds';
  if (code === 2) return 'Scattered clouds';
  if (code === 3) return 'Many clouds';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 55) return 'Light rain';
  if (code >= 56 && code <= 57) return 'Freezing light rain';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 66 && code <= 67) return 'Freezing rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Mixed weather';
}

export function weatherGlyphKind(code: number): WeatherGlyphKind {
  if (code <= 1) return 'sun';
  if (code <= 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 95) return 'storm';
  if (code >= 51) return 'rain';
  return 'cloud';
}

export function formatDayLabel(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00+07:00`);
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function regionLabel(region: string): string {
  if (region === 'north') return 'North';
  if (region === 'central') return 'Central';
  if (region === 'south') return 'South';
  return region;
}

export function formatUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
