/** Runs a store mirror update without scheduling legacy browser auto-sync (removed in D2.13). */
export async function withoutAutoSyncAsync<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}
