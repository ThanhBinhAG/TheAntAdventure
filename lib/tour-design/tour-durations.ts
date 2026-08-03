/** Trip duration presets for Client Brief (compact datalist + custom free text). */

export function formatDurationLabel(days: number): string {
  const nights = days - 1;
  const dayLabel = days === 1 ? 'Day' : 'Days';
  const nightLabel = nights === 1 ? 'Night' : 'Nights';
  return `${days} ${dayLabel} ${nights} ${nightLabel}`;
}

/** Presets from `minDays` through `maxDays` inclusive (default 2–30). */
export function buildDurationPresets(minDays = 2, maxDays = 30): string[] {
  const out: string[] = [];
  for (let d = minDays; d <= maxDays; d++) {
    out.push(formatDurationLabel(d));
  }
  return out;
}

export const DURATION_PRESETS = buildDurationPresets(2, 30);

const PRESET_SET = new Set(DURATION_PRESETS);

export function isDurationPreset(value: string): boolean {
  return PRESET_SET.has(value.trim());
}
