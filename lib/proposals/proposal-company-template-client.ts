import {
  emptyCompanyTemplatesMap,
  parseCompanyTemplateFields,
  resolveCompanyTemplate,
  type CompanyTemplatesMap,
} from './proposal-company-template';
import type { ProposalTemplateOverrides } from './proposal-content-overrides';
import type { ProposalVariant } from './proposal-types';

let cached: CompanyTemplatesMap | undefined;
let inflight: Promise<CompanyTemplatesMap> | null = null;

function parseMap(raw: unknown): CompanyTemplatesMap {
  const map = emptyCompanyTemplatesMap();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return map;
  const rec = raw as Record<string, unknown>;
  for (const variant of ['b2c', 'b2b'] as const) {
    const row = rec[variant];
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const o = row as Record<string, unknown>;
    const resolved = resolveCompanyTemplate(variant, parseCompanyTemplateFields(o.fields));
    map[variant] = {
      ...resolved,
      updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : null,
    };
  }
  return map;
}

/** In-memory cache after a successful GET/PUT (Strict Mode remount safe). */
export function getCachedCompanyProposalTemplates(): CompanyTemplatesMap | undefined {
  return cached;
}

export function setCachedCompanyProposalTemplates(next: CompanyTemplatesMap): void {
  cached = next;
  inflight = null;
}

/** @internal tests only */
export function resetCompanyProposalTemplatesClientForTests(): void {
  cached = undefined;
  inflight = null;
}

export function fetchCompanyProposalTemplatesClient(): Promise<CompanyTemplatesMap> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch('/api/proposals/templates', { cache: 'no-store' });
      const body = (await res.json()) as { ok?: boolean; data?: unknown };
      if (!res.ok || !body.ok) {
        return cached ?? emptyCompanyTemplatesMap();
      }
      const map = parseMap(body.data);
      cached = map;
      return map;
    } catch {
      return cached ?? emptyCompanyTemplatesMap();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function saveCompanyProposalTemplateClient(
  variant: ProposalVariant,
  fields: ProposalTemplateOverrides
): Promise<CompanyTemplatesMap> {
  const res = await fetch('/api/proposals/templates', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant, fields }),
  });
  const body = (await res.json()) as { ok?: boolean; data?: unknown; error?: string };
  if (!res.ok || !body.ok) {
    throw new Error(body.error || 'Could not save company template');
  }
  const map = parseMap(body.data);
  cached = map;
  return map;
}
