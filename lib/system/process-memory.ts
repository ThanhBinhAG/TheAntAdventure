import 'server-only';
import v8 from 'node:v8';

/** Heap used / heap limit above this marks health as degraded. */
export const HEAP_USED_RATIO_THRESHOLD = 0.85;

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
