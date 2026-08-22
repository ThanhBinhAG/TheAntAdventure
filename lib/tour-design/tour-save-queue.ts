export type TourSaveResult = {
  saveRevision: number;
};

type EnqueueTourSave = {
  draftId: string;
  initialSaveRevision: number;
  save: (expectedSaveRevision: number) => Promise<TourSaveResult>;
  onLatestSuccess: (result: TourSaveResult) => void;
};

/**
 * Serializes saves for one draft and applies local state only for its newest request.
 * PostgreSQL save revisions still protect writes from other tabs or processes.
 */
export class TourDraftSaveQueue {
  private readonly chains = new Map<string, Promise<void>>();
  private readonly latestRequestIds = new Map<string, number>();
  private readonly saveRevisions = new Map<string, number>();
  private nextRequestId = 0;

  setSaveRevision(draftId: string, saveRevision: number): void {
    this.saveRevisions.set(draftId, saveRevision);
  }

  getSaveRevision(draftId: string, fallback = 0): number {
    return this.saveRevisions.get(draftId) ?? fallback;
  }

  clear(): void {
    this.chains.clear();
    this.latestRequestIds.clear();
    this.saveRevisions.clear();
  }

  enqueue({ draftId, initialSaveRevision, save, onLatestSuccess }: EnqueueTourSave): Promise<TourSaveResult> {
    const requestId = ++this.nextRequestId;
    this.latestRequestIds.set(draftId, requestId);
    if (!this.saveRevisions.has(draftId)) {
      this.saveRevisions.set(draftId, initialSaveRevision);
    }

    const previous = this.chains.get(draftId) ?? Promise.resolve();
    const request = previous.catch(() => undefined).then(async () => {
      const result = await save(this.getSaveRevision(draftId, initialSaveRevision));
      this.saveRevisions.set(draftId, result.saveRevision);
      if (this.latestRequestIds.get(draftId) === requestId) {
        onLatestSuccess(result);
      }
      return result;
    });

    this.chains.set(draftId, request.then(() => undefined, () => undefined));
    return request;
  }
}
