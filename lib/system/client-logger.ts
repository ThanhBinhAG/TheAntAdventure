export type ClientLogLevel = 'info' | 'warn' | 'error';

type ClientLogOptions = {
  level?: ClientLogLevel;
  meta?: Record<string, unknown>;
  error?: unknown;
};

const SENSITIVE = /^(password|token|jwt|authorization|apikey|api_key|secret)$/i;

function sanitize(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [key, SENSITIVE.test(key) ? '[redacted]' : value])
  );
}

/** Browser diagnostics stay local to development; operational logs are server-only. */
export function clientLog(scope: string, message: string, options?: ClientLogOptions): void {
  if (process.env.NODE_ENV === 'production') return;

  const level = options?.level ?? 'info';
  const meta = sanitize(options?.meta);
  const payload = {
    tag: 'client-debug', scope, level, message, ts: new Date().toISOString(),
    ...(meta ? { meta } : {}),
    ...(options?.error != null
      ? { error: options.error instanceof Error ? { name: options.error.name, message: options.error.message } : String(options.error) }
      : {}),
  };

  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.info(payload);
}
