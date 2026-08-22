import assert from 'node:assert/strict';
import test from 'node:test';
import { TourDraftSaveQueue } from '../lib/tour-design/tour-save-queue';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('Tour save queue serializes same-draft saves and applies only the newest local state', async () => {
  const queue = new TourDraftSaveQueue();
  const firstSave = deferred<{ saveRevision: number }>();
  const firstSaveStarted = deferred<void>();
  const expectedRevisions: number[] = [];
  const applied: string[] = [];

  const olderRequest = queue.enqueue({
    draftId: 'TD-1',
    initialSaveRevision: 0,
    save: async (expectedSaveRevision) => {
      expectedRevisions.push(expectedSaveRevision);
      firstSaveStarted.resolve();
      return firstSave.promise;
    },
    onLatestSuccess: ({ saveRevision }) => applied.push(`older:${saveRevision}`),
  });
  await firstSaveStarted.promise;

  const newerRequest = queue.enqueue({
    draftId: 'TD-1',
    initialSaveRevision: 0,
    save: async (expectedSaveRevision) => {
      expectedRevisions.push(expectedSaveRevision);
      return { saveRevision: 2 };
    },
    onLatestSuccess: ({ saveRevision }) => applied.push(`newer:${saveRevision}`),
  });

  assert.deepEqual(expectedRevisions, [0]);
  firstSave.resolve({ saveRevision: 1 });
  await olderRequest;
  await newerRequest;

  assert.deepEqual(expectedRevisions, [0, 1]);
  assert.deepEqual(applied, ['newer:2']);
  assert.equal(queue.getSaveRevision('TD-1'), 2);
});
