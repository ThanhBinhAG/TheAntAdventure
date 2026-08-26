let activeRefreshController: AbortController | null = null;

export function registerSessionRefreshRequest(controller: AbortController): () => void {
  activeRefreshController = controller;
  return () => {
    if (activeRefreshController === controller) activeRefreshController = null;
  };
}

/** Cancels the current tab's in-flight refresh before its session is revoked. */
export function cancelSessionRefreshRequest(): void {
  activeRefreshController?.abort();
  activeRefreshController = null;
}
