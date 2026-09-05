import { z } from 'zod';
import { CRM_CATALOG_DB_KINDS, CRM_CATALOG_KINDS } from './catalog-kinds';

export const catalogItemSchema = z.object({
  kind: z.enum(CRM_CATALOG_KINDS),
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  label: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(1_000_000),
  isActive: z.boolean(),
});

export const listCatalogQuerySchema = z
  .object({
    kind: z.enum(CRM_CATALOG_KINDS).optional(),
    kinds: z.string().trim().max(400).optional(),
    activeOnly: z
      .union([z.literal('1'), z.literal('0'), z.literal('true'), z.literal('false')])
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.kind && !value.kinds) {
      ctx.addIssue({ code: 'custom', message: 'kind or kinds is required', path: ['kind'] });
    }
  });

export const replaceCatalogBodySchema = z.object({
  kind: z.enum(CRM_CATALOG_DB_KINDS),
  items: z.array(catalogItemSchema.omit({ kind: true })).min(1).max(500),
});

export const deleteCatalogQuerySchema = z.object({
  kind: z.enum(CRM_CATALOG_DB_KINDS),
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
});

export function parseKindsParam(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
