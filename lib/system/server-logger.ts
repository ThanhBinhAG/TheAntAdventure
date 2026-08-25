import 'server-only';

import { randomUUID } from 'node:crypto';
import pino, { type DestinationStream, type Logger } from 'pino';

export const SERVER_LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
export type ServerLogLevel = (typeof SERVER_LOG_LEVELS)[number];

export type HttpLogContext = {
  scope: string;
  route: string;
  actorId?: string;
  healthCheck?: boolean;
};

export type HttpCompletionLog = {
  statusCode: number;
  durationMs: number;
  resourceId?: string;
  actorId?: string;
};

export type HttpRequestLogger = {
  logger: Logger;
  requestId: string;
  logCompletion: (completion: HttpCompletionLog) => void;
};

const REDACTED = '[redacted]';
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const LOG_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
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

function safeLogIdentifier(value: string | undefined): string | undefined {
  return value && LOG_IDENTIFIER.test(value) ? value : undefined;
}

function normalizeDurationMs(durationMs: number): number {
  return Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs)) : 0;
}

function completionLevel(statusCode: number, healthCheck: boolean): 'debug' | 'info' | 'warn' | 'error' {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return healthCheck ? 'debug' : 'info';
}

/**
 * Creates the common request context for API logging. Call logCompletion once
 * before each HTTP response so every completed request uses the same contract.
 */
export function createHttpRequestLogger(
  request: Request,
  context: HttpLogContext,
  parentLogger: Logger = serverLogger
): HttpRequestLogger {
  const requestId = getOrCreateRequestId(request);
  const actorId = safeLogIdentifier(context.actorId);
  const logger = parentLogger.child({
    scope: context.scope,
    requestId,
    route: context.route,
    method: request.method,
    ...(actorId ? { actorId } : {}),
  });

  return {
    logger,
    requestId,
    logCompletion: ({ statusCode, durationMs, resourceId, actorId: completionActorId }) => {
      const safeActorId = safeLogIdentifier(completionActorId) ?? actorId;
      const entry = {
        event: 'http.request.completed',
        statusCode,
        durationMs: normalizeDurationMs(durationMs),
        ...(safeActorId ? { actorId: safeActorId } : {}),
        ...(safeLogIdentifier(resourceId) ? { resourceId } : {}),
      };
      logger[completionLevel(statusCode, context.healthCheck === true)](entry, 'HTTP request completed');
    },
  };
}

export function requestLogger(request: Request, scope: string): { logger: Logger; requestId: string } {
  const requestId = getOrCreateRequestId(request);
  return { logger: serverLogger.child({ scope, requestId }), requestId };
}
