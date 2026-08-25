import 'server-only';

import { randomUUID } from 'node:crypto';
import pino, { type DestinationStream, type Logger } from 'pino';

export const SERVER_LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
export type ServerLogLevel = (typeof SERVER_LOG_LEVELS)[number];

const REDACTED = '[redacted]';
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ERROR_TYPE = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;
const ERROR_CODE = /^(?:[A-Z][A-Z0-9_.-]{0,79}|[0-9]{5})$/;

const REDACT_PATHS = [
  'password', 'token', 'jwt', 'authorization', 'cookie', 'secret', 'apiKey', 'api_key',
  'accessToken', 'refreshToken', 'captchaToken',
  '*.password', '*.token', '*.jwt', '*.authorization', '*.cookie', '*.secret', '*.apiKey', '*.api_key',
  '*.accessToken', '*.refreshToken', '*.captchaToken',
  'headers.authorization', 'headers.cookie', 'req.headers.authorization', 'req.headers.cookie',
] as const;

export function resolveLogLevel(value: string | undefined): ServerLogLevel {
  const level = value?.trim().toLowerCase();
  return SERVER_LOG_LEVELS.includes(level as ServerLogLevel) ? level as ServerLogLevel : 'info';
}

/**
 * Upstream errors may carry credentials in their message, stack, cause, or own
 * properties. Keep only stable identifiers; callers provide the safe log message.
 */
function serializeError(error: unknown): { type: string; code?: string } {
  if (!error || typeof error !== 'object') return { type: 'NonError' };

  const candidate = error as { name?: unknown; code?: unknown };
  const type = typeof candidate.name === 'string' && ERROR_TYPE.test(candidate.name)
    ? candidate.name
    : 'Error';
  const code = typeof candidate.code === 'string' && ERROR_CODE.test(candidate.code)
    ? candidate.code
    : undefined;

  return { type, ...(code ? { code } : {}) };
}

export function createServerLogger(options?: {
  level?: ServerLogLevel;
  destination?: DestinationStream;
}): Logger {
  return pino(
    {
      level: options?.level ?? resolveLogLevel(process.env.LOG_LEVEL),
      base: {
        service: 'the-ant-adventures-crm',
        environment: process.env.NODE_ENV ?? 'development',
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
      },
      redact: { paths: [...REDACT_PATHS], censor: REDACTED },
      serializers: { err: serializeError },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    options?.destination
  );
}

/** JSON application logs are written to stdout for the container log collector. */
export const serverLogger = createServerLogger();

export function getOrCreateRequestId(request: Request): string {
  const supplied = request.headers.get('x-request-id')?.trim();
  return supplied && REQUEST_ID.test(supplied) ? supplied : randomUUID();
}

export function requestLogger(request: Request, scope: string): { logger: Logger; requestId: string } {
  const requestId = getOrCreateRequestId(request);
  return { logger: serverLogger.child({ scope, requestId }), requestId };
}
