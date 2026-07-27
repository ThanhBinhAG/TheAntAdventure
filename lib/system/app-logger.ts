/**
 * Always-on structured app logger (not gated by SYSTEM_DEBUG).
 * Writes JSON to stdout and reports errors to Sentry when DSN is set.
 */
import * as Sentry from '@sentry/nextjs';

export type AppLogLevel = 'info' | 'warn' | 'error';

type LogOptions = {
  level?: AppLogLevel;
  meta?: Record<string, unknown>;
  error?: unknown;
};

const SENSITIVE = /^(password|token|jwt|authorization|apikey|api_key|secret)$/i;

function sanitize(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = SENSITIVE.test(key) ? '[redacted]' : value;
  }
  return out;
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === 'string' ? error : String(error));
}

export function appLog(scope: string, message: string, options?: LogOptions): void {
  const level = options?.level ?? 'info';
  const meta = sanitize(options?.meta);
  const payload = {
    tag: 'app',
    scope,
    level,
    message,
    ts: new Date().toISOString(),
    ...(meta ? { meta } : {}),
    ...(options?.error != null
      ? {
          error:
            options.error instanceof Error
              ? { name: options.error.name, message: options.error.message }
              : String(options.error),
        }
      : {}),
  };

  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);

  if (level === 'error' && options?.error != null) {
    Sentry.captureException(toError(options.error), {
      tags: { scope },
      extra: { message, ...(meta ?? {}) },
    });
  } else if (level === 'error') {
    Sentry.captureMessage(message, {
      level: 'error',
      tags: { scope },
      extra: meta,
    });
  }
}

export function captureAppError(scope: string, error: unknown, message?: string, meta?: Record<string, unknown>): void {
  appLog(scope, message ?? (error instanceof Error ? error.message : 'Unhandled error'), {
    level: 'error',
    error,
    meta,
  });
}
