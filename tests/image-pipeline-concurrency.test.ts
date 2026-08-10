import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sharpWorkerGate } from '../lib/image-pipeline/concurrency';

describe('sharpWorkerGate', () => {
  it('queues callers past the limit and releases them in FIFO order', async () => {
    const order: number[] = [];
    let releaseFirst: () => void = () => {};
    const first = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const p1 = sharpWorkerGate.run(async () => {
      order.push(1);
      await first;
    });
    const p2 = sharpWorkerGate.run(async () => {
      order.push(2);
    });

    await new Promise((r) => setTimeout(r, 20));
    assert.deepEqual(order, [1], 'queued tasks must not start while the slot is held');

    releaseFirst();
    await Promise.all([p1, p2]);
    assert.deepEqual(order, [1, 2]);
  });
});
