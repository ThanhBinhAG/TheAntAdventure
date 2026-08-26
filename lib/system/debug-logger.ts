import { isSystemDebugEnabled, maskSecret } from './debug-config';
import { serverLogger } from './server-logger';

export type DebugLogLevel = 'info' | 'warn' | 'error';
export type DebugLogCategory = 'middleware' | 'auth' | 'diagnostics' | 'supabase';

export type DebugLogEntry = {
  id: string;
  ts: string;
  level: DebugLogLevel;
  category: DebugLogCategory;
  message: string;
  meta?: Record<string, unknown>;
};

const MAX_ENTRIES = 200;
const buffer: DebugLogEntry[] = [];
let seq = 0;

const SENSITIVE_KEYS = new Set(['password', 'token', 'jwt', 'authorization', 'apikey', 'api_key']);

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower)) {
      out[key] = '[redacted]';
    } else if (lower.includes('key') && typeof value === 'string') {
      out[key] = maskSecret(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function debugLog(
  category: DebugLogCategory,
  message: string,
  options?: { level?: DebugLogLevel; meta?: Record<string, unknown> }
): void {
  if (!isSystemDebugEnabled()) return;

  const level = options?.level ?? 'info';
  const meta = sanitizeMeta(options?.meta);
  const entry: DebugLogEntry = {
    id: `${Date.now()}-${++seq}`,
    ts: new Date().toISOString(),
    level,
    category,
    message,
    meta,
  };

  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();

  serverLogger.debug(
    {
      scope: 'system/debug',
      event: 'system.debug.emitted',
      category,
      debugId: entry.id,
      debugLevel: level,
    },
    'System debug event emitted',
  );
}

export function getDebugLogs(category?: DebugLogCategory): DebugLogEntry[] {
  if (!category) return [...buffer];
  return buffer.filter((e) => e.category === category);
}
