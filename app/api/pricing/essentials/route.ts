import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import {
  loadEssentialsCatalog,
  loadLatestImport,
  replaceEssentialsCatalog,
  updateCatalogRow,
  updateCostLine,
} from '@/lib/pricing/catalog-db';
import {
  catalogImportMetaSchema,
  catalogRowPatchSchema,
  costLinePatchSchema,
  essentialsCatalogSchema,
} from '@/lib/pricing/catalog-schema';

export const dynamic = 'force-dynamic';

const rowIdSchema = z.string().min(1).max(200);
const catalogTableSchema = z.enum(['settings', 'products', 'services', 'cars', 'hotels', 'notes']);
const patchSchema = z.discriminatedUnion('table', [
  z.object({ table: catalogTableSchema, id: rowIdSchema, patch: catalogRowPatchSchema }),
  z.object({ table: z.literal('costLines'), id: rowIdSchema, patch: costLinePatchSchema }),
]);

export const GET = bffRoute(
  { requiredPermission: 'pricing_essentials.read' },
  async ({ supabase }) => {
    const [catalog, lastImport] = await Promise.all([
      loadEssentialsCatalog(supabase),
      loadLatestImport(supabase, 'essentials'),
    ]);
    return { catalog, lastImport };
  },
);

export const PATCH = bffRoute(
  { requiredPermission: 'pricing_essentials.write', bodySchema: patchSchema },
  async ({ supabase, body }) => {
    if (body.table === 'costLines') {
      await updateCostLine(supabase, body.id, body.patch);
    } else {
      await updateCatalogRow(supabase, body.table, body.id, body.patch);
    }
    return { saved: true };
  },
);

export const POST = bffRoute(
  {
    requiredPermission: 'pricing_essentials.write',
    bodySchema: z.object({ catalog: essentialsCatalogSchema, meta: catalogImportMetaSchema }),
  },
  async ({ supabase, body }) => ({
    rowCount: await replaceEssentialsCatalog(supabase, body.catalog, body.meta),
  }),
);
