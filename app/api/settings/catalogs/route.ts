import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import { checkPermissionForRequest } from '@/lib/auth/permissions-server';
import {
  deleteTravelStyleServer,
  listTravelStylesServer,
  replaceTravelStylesServer,
  TravelStyleRepositoryError,
} from '@/lib/customers/travel-style-repository';
import type { TravelStyle } from '@/lib/customers/travel-styles';
import { catalogItemSchema, listCatalogQuerySchema, parseKindsParam } from '@/lib/settings/catalog-input';
import {
  CRM_CATALOG_KINDS,
  isCrmCatalogDbKind,
  isCrmCatalogKind,
  type CatalogItem,
  type CrmCatalogKind,
} from '@/lib/settings/catalog-kinds';
import {
  CatalogRepositoryError,
  deleteCatalogItemServer,
  listCatalogItemsServer,
  replaceCatalogItemsServer,
} from '@/lib/settings/catalog-repository';

export const dynamic = 'force-dynamic';

const replaceAnyCatalogBodySchema = z.object({
  kind: z.enum(CRM_CATALOG_KINDS),
  items: z.array(catalogItemSchema.omit({ kind: true })).min(1).max(500),
});

const deleteAnyCatalogQuerySchema = z.object({
  kind: z.enum(CRM_CATALOG_KINDS),
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
});

function travelStylesToCatalog(styles: TravelStyle[]): CatalogItem[] {
  return styles.map((style) => ({
    kind: 'travel_style' as const,
    code: style.code,
    label: style.label,
    sortOrder: style.sortOrder,
    isActive: style.isActive,
  }));
}

function resolveKinds(query: { kind?: string; kinds?: string }): CrmCatalogKind[] {
  if (query.kind && isCrmCatalogKind(query.kind)) return [query.kind];
  return parseKindsParam(query.kinds).filter(isCrmCatalogKind);
}

function activeOnlyFlag(raw: string | undefined): boolean {
  return raw === '1' || raw === 'true';
}

export const GET = bffRoute(
  {
    logging: { scope: 'settings', route: '/api/settings/catalogs' },
    querySchema: listCatalogQuerySchema,
  },
  async ({ auth, supabase, query }) => {
    const getClient = async () => supabase;
    const checks = await Promise.all([
      checkPermissionForRequest('settings.read', { auth, getSupabaseClient: getClient }),
      checkPermissionForRequest('customers.read', { auth, getSupabaseClient: getClient }),
      checkPermissionForRequest('customers.write', { auth, getSupabaseClient: getClient }),
      checkPermissionForRequest('tour_design.read', { auth, getSupabaseClient: getClient }),
    ]);
    if (!checks.some((c) => c.allowed)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const kinds = resolveKinds(query);
    const activeOnly = activeOnlyFlag(query.activeOnly);
    const dbKinds = kinds.filter(isCrmCatalogDbKind);
    const wantTravel = kinds.includes('travel_style');

    const items: CatalogItem[] = [];
    if (dbKinds.length) {
      items.push(...(await listCatalogItemsServer(supabase, dbKinds, activeOnly)));
    }
    if (wantTravel) {
      let styles = await listTravelStylesServer(supabase);
      if (activeOnly) styles = styles.filter((style) => style.isActive);
      items.push(...travelStylesToCatalog(styles));
    }
    return items;
  },
);

export const PATCH = bffRoute(
  {
    logging: { scope: 'settings', route: '/api/settings/catalogs' },
    requiredPermission: 'settings.write',
    bodySchema: replaceAnyCatalogBodySchema,
  },
  async ({ supabase, body }) => {
    try {
      if (body.kind === 'travel_style') {
        const styles = await replaceTravelStylesServer(
          supabase,
          body.items.map((item) => ({
            code: item.code,
            label: item.label,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          })),
        );
        return travelStylesToCatalog(styles);
      }
      if (!isCrmCatalogDbKind(body.kind)) {
        return NextResponse.json({ ok: false, error: 'Unsupported catalog kind' }, { status: 400 });
      }
      return await replaceCatalogItemsServer(supabase, body.kind, body.items);
    } catch (error) {
      if (error instanceof CatalogRepositoryError || error instanceof TravelStyleRepositoryError) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      throw error;
    }
  },
);

export const DELETE = bffRoute(
  {
    logging: { scope: 'settings', route: '/api/settings/catalogs' },
    requiredPermission: 'settings.write',
    querySchema: deleteAnyCatalogQuerySchema,
  },
  async ({ supabase, query }) => {
    try {
      if (query.kind === 'travel_style') {
        const styles = await deleteTravelStyleServer(supabase, query.code);
        return travelStylesToCatalog(styles);
      }
      if (!isCrmCatalogDbKind(query.kind)) {
        return NextResponse.json({ ok: false, error: 'Unsupported catalog kind' }, { status: 400 });
      }
      return await deleteCatalogItemServer(supabase, query.kind, query.code);
    } catch (error) {
      if (error instanceof CatalogRepositoryError || error instanceof TravelStyleRepositoryError) {
        const code = error.code;
        const status = code === 'not_found' ? 404 : code === 'in_use' || code === 'last_active' ? 409 : 400;
        return NextResponse.json({ ok: false, error: error.message }, { status });
      }
      throw error;
    }
  },
);
