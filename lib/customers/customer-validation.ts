/** Client form field validators (email, phone, travel start date). */

import { localIsoDate } from '../core/date-utils';

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Digits with optional leading +, spaces, dashes, parentheses. */
const PHONE_RE = /^\+?[\d\s().-]{6,30}$/;
const GUEST_COUNT_RE = /^[1-9]\d{0,3}$/;

export function isValidEmail(email: string): boolean {
  const t = email.trim();
  if (!t || t.length > 254) return false;
  return EMAIL_RE.test(t);
}

export function isValidPhone(phone: string): boolean {
  const t = phone.trim();
  if (!t) return true;
  if (!PHONE_RE.test(t)) return false;
  const digits = t.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15;
}

/** Whole number of adult guests accepted by Customer, Lead, and quote workflows. */
export function isValidGuestCount(value: string): boolean {
  return GUEST_COUNT_RE.test(value.trim()) && Number(value) <= 9999;
}

/** Strip letters / invalid chars from phone input while typing. */
export function sanitizePhoneInput(raw: string): string {
  const cleaned = raw.replace(/[^\d+\s().-]/g, '');
  const hasPlus = cleaned.startsWith('+');
  const rest = cleaned.replace(/\+/g, '');
  return hasPlus ? `+${rest}` : rest;
}

/** Business-day YYYY-MM-DD (ICT via date-utils). */
export function todayIsoLocal(now = new Date()): string {
  return localIsoDate(now);
}

/** True when isoDate is empty or calendar date ≥ today (ICT). */
export function isTravelDateNotPast(isoDate: string, now = new Date()): boolean {
  const t = isoDate.trim();
  if (!t) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  return t >= todayIsoLocal(now);
}
