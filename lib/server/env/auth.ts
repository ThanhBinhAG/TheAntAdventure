import 'server-only';

function read(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function getWeatherCronSecret() { return read('WEATHER_CRON_SECRET'); }
export function getSessionEncryptionKey() { return read('SESSION_ENCRYPTION_KEY'); }
export function getBreakGlassUsername() { return read('BREAK_GLASS_USERNAME'); }
export function getBreakGlassPassword() { return read('BREAK_GLASS_PASSWORD'); }
export function isBreakGlassConfigured() { return Boolean(getBreakGlassUsername() && getBreakGlassPassword()); }
