import 'server-only';
import v8 from 'node:v8';
import * as Sentry from '@sentry/nextjs';

/** Heap used / heap limit above this marks health as degraded. */
export const HEAP_USED_RATIO_THRESHOLD = 0.85;

const MEMORY_PRESSURE_SENTRY_COOLDOWN_MS = 5 * 60 * 1000;
let lastMemoryPressureSentryAt = 0;

export type ProcessMemoryMetrics = {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
  heapLimitMb: number;
  heapUsedRatio: number;
  pressure: boolean;
};

function bytesToMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

/** Snapshot Node process / V8 heap for health and diagnostics. */
export function getProcessMemoryMetrics(): ProcessMemoryMetrics {
  const usage = process.memoryUsage();
  const heap = v8.getHeapStatistics();
  const heapLimitMb = bytesToMb(heap.heap_size_limit);
  const heapUsedMb = bytesToMb(usage.heapUsed);
  const heapUsedRatio =
    heap.heap_size_limit > 0 ? Math.round((usage.heapUsed / heap.heap_size_limit) * 1000) / 1000 : 0;

  return {
    rssMb: bytesToMb(usage.rss),
    heapUsedMb,
    heapTotalMb: bytesToMb(usage.heapTotal),
    heapLimitMb,
    heapUsedRatio,
    pressure: heapUsedRatio >= HEAP_USED_RATIO_THRESHOLD,
  };
}

/**
 * Emit at most one Sentry warning per cooldown when heap pressure is detected.
 * Safe to call on every health check.
 */
export function maybeReportMemoryPressure(memory: ProcessMemoryMetrics): void {
  if (!memory.pressure) return;
  const now = Date.now();
  if (now - lastMemoryPressureSentryAt < MEMORY_PRESSURE_SENTRY_COOLDOWN_MS) return;
  lastMemoryPressureSentryAt = now;

  Sentry.captureMessage('Process heap pressure (health check)', {
    level: 'warning',
    tags: { scope: 'memory', source: 'health' },
    extra: {
      rssMb: memory.rssMb,
      heapUsedMb: memory.heapUsedMb,
      heapTotalMb: memory.heapTotalMb,
      heapLimitMb: memory.heapLimitMb,
      heapUsedRatio: memory.heapUsedRatio,
      threshold: HEAP_USED_RATIO_THRESHOLD,
    },
  });
}
