/** Client form field validators (email, phone, travel start date). */

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Digits with optional leading +, spaces, dashes, parentheses. */
const PHONE_RE = /^\+?[\d\s().-]{6,30}$/;

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

/** Strip letters / invalid chars from phone input while typing. */
export function sanitizePhoneInput(raw: string): string {
  const cleaned = raw.replace(/[^\d+\s().-]/g, '');
  const hasPlus = cleaned.startsWith('+');
  const rest = cleaned.replace(/\+/g, '');
  return hasPlus ? `+${rest}` : rest;
}

/** Local calendar YYYY-MM-DD for today. */
export function todayIsoLocal(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** True when isoDate is empty or calendar date ≥ today (local). */
export function isTravelDateNotPast(isoDate: string, now = new Date()): boolean {
  const t = isoDate.trim();
  if (!t) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  return t >= todayIsoLocal(now);
}
