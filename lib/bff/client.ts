type BffArrayResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

/** Browser-safe reader for BFF collection endpoints. */
export async function getBffArray<T>(url: string, fallbackError: string): Promise<T[]> {
  const response = await fetch(url, { credentials: 'same-origin' });
  const body = await response.json().catch(() => null) as BffArrayResponse<unknown> | null;
  if (!response.ok || !body?.ok || !Array.isArray(body.data)) {
    throw new Error(body?.error ?? fallbackError);
  }
  return body.data as T[];
}
