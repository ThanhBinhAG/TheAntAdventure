import 'server-only';

function read(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function getAppUrl() { return read('APP_URL') || 'http://localhost:3006'; }
export function getAuthCaptchaSiteKey() { return read('AUTH_CAPTCHA_SITE_KEY'); }
export function getAppVersion() { return read('APP_VERSION') || 'unknown'; }
