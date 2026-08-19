'use client';

import { useCallback, useMemo, useState } from 'react';
import CatalogImportModal from '@/components/pricing/CatalogImportModal';
import PricingSubnav from '@/components/pricing/PricingSubnav';
import EmptyState from '@/components/EmptyState';
import EssentialsHotels from '@/components/pricing/essentials/EssentialsHotels';
import EssentialsNotes from '@/components/pricing/essentials/EssentialsNotes';
import EssentialsProducts from '@/components/pricing/essentials/EssentialsProducts';
import EssentialsServices from '@/components/pricing/essentials/EssentialsServices';
import EssentialsTransport from '@/components/pricing/essentials/EssentialsTransport';
import { useEssentialsCatalog } from '@/hooks/usePricingCatalog';
import { updateCatalogRow, updateCostLine } from '@/lib/pricing/catalog-db';
import { usePagePermission } from '@/hooks/usePagePermission';
import type {
  EssCarRate,
  EssCostLine,
  EssHotelRate,
  EssNote,
  EssProduct,
  EssServiceRate,
  EssentialsCatalog,
  PricingSetting,
} from '@/lib/pricing/catalog-types';

type Tab = 'products' | 'services' | 'transport' | 'hotels' | 'notes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'products', label: '🚲 Experiences' },
  { id: 'services', label: '🧾 Service rates' },
  { id: 'transport', label: '🚐 Car & Truck' },
  { id: 'hotels', label: '🏡 Hotels' },
  { id: 'notes', label: '📋 Guidelines & Inputs' },
];

export default function PricingEssentials() {
  const { canWrite } = usePagePermission('pricing-essentials');
  const { data, lastImport, loading, error, configured, reload, setData } = useEssentialsCatalog();
  const [tab, setTab] = useState<Tab>('products');
  const [importOpen, setImportOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  /** Applies the edit locally first, then persists; a failure re-syncs from Supabase. */
  const persist = useCallback(
    async (optimistic: (previous: EssentialsCatalog) => EssentialsCatalog, write: () => Promise<void>) => {
      setData(optimistic);
      try {
        await write();
      } catch (e) {
        await reload();
        throw e;
      }
    },
    [reload, setData]
  );

  const patchProduct = useCallback(
    (code: string, patch: Partial<EssProduct>) =>
      persist(
        (prev) => ({
          ...prev,
          products: prev.products.map((p) => (p.code === code ? { ...p, ...patch } : p)),
        }),
        () => updateCatalogRow('products', code, patch)
      ),
    [persist]
  );

  const patchCostLine = useCallback(
    (id: string, patch: Partial<EssCostLine>) =>
      persist(
        (prev) => ({
          ...prev,
          costLines: prev.costLines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        }),
        () => updateCostLine(id, patch)
      ),
    [persist]
  );

  const patchService = useCallback(
    (id: string, patch: Partial<EssServiceRate>) =>
      persist(
        (prev) => ({
          ...prev,
          services: prev.services.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }),
        () => updateCatalogRow('services', id, patch)
      ),
    [persist]
  );

  const patchCar = useCallback(
    (id: string, patch: Partial<EssCarRate>) =>
      persist(
        (prev) => ({ ...prev, cars: prev.cars.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),
        () => updateCatalogRow('cars', id, patch)
      ),
    [persist]
  );

  const patchHotel = useCallback(
    (id: string, patch: Partial<EssHotelRate>) =>
      persist(
        (prev) => ({ ...prev, hotels: prev.hotels.map((h) => (h.id === id ? { ...h, ...patch } : h)) }),
        () => updateCatalogRow('hotels', id, patch)
      ),
    [persist]
  );

  const patchNote = useCallback(
    (id: string, patch: Partial<EssNote>) =>
      persist(
        (prev) => ({ ...prev, notes: prev.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }),
        () => updateCatalogRow('notes', id, patch)
      ),
    [persist]
  );

  const patchSetting = useCallback(
    (id: string, patch: Partial<PricingSetting>) =>
      persist(
        (prev) => ({
          ...prev,
          settings: prev.settings.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }),
        () => updateCatalogRow('settings', id, patch)
      ),
    [persist]
  );

  const counts = useMemo(
    () => ({
      products: data.products.length,
      services: data.services.length,
      transport: data.cars.length,
      hotels: data.hotels.length,
      notes: data.notes.length + data.settings.length,
    }),
    [data]
  );

  const isEmpty = !loading && !data.products.length && !data.hotels.length && !data.services.length;

  return (
    <div className="pcx-page">
      <PricingSubnav active="pricing-essentials" />

      <div className="pcx-toolbar">
        <div className="info-bar pcx-info">
          Imported from the <b>Essentials Saigon &amp; Mekong</b> workbook — every sheet is kept in its original
          shape. Click any row to expand it; click a value to edit it.
          {lastImport && (
            <span className="pcx-import-meta">
              Last import: <b>{lastImport.fileName}</b> ·{' '}
              {new Date(lastImport.importedAt).toLocaleString('en-GB')} · {lastImport.rowCount} rows
              {lastImport.warningCount > 0 && ` · ${lastImport.warningCount} warnings`}
            </span>
          )}
        </div>
        <button
          className="btn btn-p btn-sm"
          type="button"
          onClick={() => setImportOpen(true)}
          disabled={!canWrite}
          title={!canWrite ? 'You need write permission for Essentials to import' : undefined}
        >
          ⭱ Import Excel
        </button>
      </div>

      {flash && <div className="pcx-alert pcx-alert-ok">{flash}</div>}
      {error && <div className="pcx-alert pcx-alert-error">{error}</div>}
      {!configured && (
        <div className="pcx-alert pcx-alert-warn">
          Supabase is not configured, so imported pricing cannot be loaded or saved.
        </div>
      )}

      <div className="tabs pcx-tabs">
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`tab${tab === t.id ? ' on' : ''}`}
            onClick={() => setTab(t.id)}
            role="button"
            tabIndex={0}
          >
            {t.label}
            <span className="pcx-tab-count">{counts[t.id]}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="pcx-empty">Loading the Essentials catalog…</p>
      ) : isEmpty ? (
        <EmptyState
          className="crm-empty-state--flush"
          variant="products"
          title="No Essentials pricing yet"
          description="Import the Essentials workbook to populate experiences, provider rates, hotels and guidelines."
          action={
              <button
                className="btn btn-p btn-sm"
                type="button"
                onClick={() => setImportOpen(true)}
                disabled={!canWrite}
                title={!canWrite ? 'You need write permission for Essentials to import' : undefined}
              >
                Import Excel
              </button>
          }
        />
      ) : (
        <>
          {tab === 'products' && (
            <EssentialsProducts
              products={data.products}
              costLines={data.costLines}
              onPatchProduct={patchProduct}
              onPatchCostLine={patchCostLine}
            />
          )}
          {tab === 'services' && <EssentialsServices services={data.services} onPatch={patchService} />}
          {tab === 'transport' && <EssentialsTransport cars={data.cars} onPatch={patchCar} />}
          {tab === 'hotels' && (
            <EssentialsHotels hotels={data.hotels} notes={data.notes} onPatch={patchHotel} />
          )}
          {tab === 'notes' && (
            <EssentialsNotes
              notes={data.notes}
              settings={data.settings}
              onPatchNote={patchNote}
              onPatchSetting={patchSetting}
            />
          )}
        </>
      )}

      <CatalogImportModal
        open={importOpen}
        workbook="essentials"
        onClose={() => setImportOpen(false)}
        onImported={(rows) => {
          setFlash(`Imported ${rows.toLocaleString('en-US')} rows from the Essentials workbook.`);
          void reload();
        }}
      />
    </div>
  );
}
