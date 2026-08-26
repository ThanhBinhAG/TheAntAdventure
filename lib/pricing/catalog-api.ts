import type {
  AccommodationCatalog,
  CatalogImportRecord,
  CatalogWorkbook,
  EssCostLine,
  EssentialsCatalog,
} from './catalog-types';

type CatalogResponse<T> = { catalog: T; lastImport: CatalogImportRecord | null };
type ImportMeta = { fileName: string; sheetCount: number; warningCount: number };
type ApiEnvelope<T> = { ok?: boolean; data?: T; error?: string };

type EssentialsTable = 'settings' | 'products' | 'services' | 'cars' | 'hotels' | 'notes';
type AccommodationTable = 'settings' | 'properties' | 'roomRates' | 'cruiseRates';

function endpoint(workbook: CatalogWorkbook): string {
  return workbook === 'essentials'
    ? '/api/pricing/essentials'
    : '/api/pricing/accommodation';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers,
  });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.ok) {
    throw new Error(body?.error || `Pricing catalog request failed (${response.status}).`);
  }
  return body.data as T;
}

export function loadEssentialsCatalog(): Promise<CatalogResponse<EssentialsCatalog>> {
  return request<CatalogResponse<EssentialsCatalog>>(endpoint('essentials'));
}

export function loadAccommodationCatalog(): Promise<CatalogResponse<AccommodationCatalog>> {
  return request<CatalogResponse<AccommodationCatalog>>(endpoint('accommodation'));
}

export function updateEssentialsCatalogRow(
  table: EssentialsTable,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  return request<{ saved: true }>(endpoint('essentials'), {
    method: 'PATCH',
    body: JSON.stringify({ table, id, patch }),
  }).then(() => undefined);
}

export function updateAccommodationCatalogRow(
  table: AccommodationTable,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  return request<{ saved: true }>(endpoint('accommodation'), {
    method: 'PATCH',
    body: JSON.stringify({ table, id, patch }),
  }).then(() => undefined);
}

export function updateCostLine(id: string, patch: Partial<EssCostLine>): Promise<void> {
  return request<{ saved: true }>(endpoint('essentials'), {
    method: 'PATCH',
    body: JSON.stringify({ table: 'costLines', id, patch }),
  }).then(() => undefined);
}

export async function replaceEssentialsCatalog(
  catalog: EssentialsCatalog,
  meta: ImportMeta,
): Promise<number> {
  const result = await request<{ rowCount: number }>(endpoint('essentials'), {
    method: 'POST',
    body: JSON.stringify({ catalog, meta }),
  });
  return result.rowCount;
}

export async function replaceAccommodationCatalog(
  catalog: AccommodationCatalog,
  meta: ImportMeta,
): Promise<number> {
  const result = await request<{ rowCount: number }>(endpoint('accommodation'), {
    method: 'POST',
    body: JSON.stringify({ catalog, meta }),
  });
  return result.rowCount;
}
