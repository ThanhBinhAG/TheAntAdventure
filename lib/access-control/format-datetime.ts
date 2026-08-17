/**
 * Shared Access Control date/time display helpers (Audit + Login History tabs).
 */

import type { AppLanguage } from '@/lib/i18n/stages';

/** Format an ISO timestamp for AC tables (vi-VN / en-US). */
export function formatAccessControlDateTime(value: string, language: AppLanguage): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}
