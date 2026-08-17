/** WMO weather code → short Vietnamese label + glyph kind. */

export type WeatherGlyphKind = 'sun' | 'cloud' | 'rain' | 'storm' | 'fog';

export function weatherLabelVi(code: number): string {
  if (code === 0) return 'Trời quang';
  if (code === 1) return 'Ít mây';
  if (code === 2) return 'Mây rải rác';
  if (code === 3) return 'Nhiều mây';
  if (code === 45 || code === 48) return 'Sương mù';
  if (code >= 51 && code <= 55) return 'Mưa phùn';
  if (code >= 56 && code <= 57) return 'Mưa phùn đóng băng';
  if (code >= 61 && code <= 65) return 'Mưa';
  if (code >= 66 && code <= 67) return 'Mưa đóng băng';
  if (code >= 71 && code <= 77) return 'Tuyết';
  if (code >= 80 && code <= 82) return 'Mưa rào';
  if (code >= 85 && code <= 86) return 'Mưa tuyết';
  if (code >= 95) return 'Dông';
  return 'Thời tiết hỗn hợp';
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
  if (region === 'north') return 'Miền Bắc';
  if (region === 'central') return 'Miền Trung';
  if (region === 'south') return 'Miền Nam';
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
