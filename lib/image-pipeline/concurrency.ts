import { GALLERY_MAX_CONCURRENT_SHARP_WORKERS } from '@/lib/image-pipeline/limits';

/**
 * Minimal FIFO semaphore. Bounds concurrent Sharp child processes so gallery uploads
 * do not spike RAM on dev machines.
 */
class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve();
      });
    });
  }

  private release(): void {
    this.active -= 1;
    const next = this.queue.shift();
    if (next) next();
  }
}

/** Shared gate for all gallery Sharp work in this process. */
export const sharpWorkerGate = new Semaphore(GALLERY_MAX_CONCURRENT_SHARP_WORKERS);
