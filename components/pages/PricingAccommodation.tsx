'use client';

import { useCallback, useMemo, useState } from 'react';
import CatalogImportModal from '@/components/pricing/CatalogImportModal';
import EmptyState from '@/components/EmptyState';
import PricingSubnav from '@/components/pricing/PricingSubnav';
import AccCruiseTable from '@/components/pricing/accommodation/AccCruiseTable';
import AccOverview from '@/components/pricing/accommodation/AccOverview';
import AccPropertyTable from '@/components/pricing/accommodation/AccPropertyTable';
import AccRateSheet from '@/components/pricing/accommodation/AccRateSheet';
import { useAccommodationCatalog } from '@/hooks/usePricingCatalog';
import { updateAccommodationCatalogRow } from '@/lib/pricing/catalog-api';
import { usePagePermission } from '@/hooks/usePagePermission';
import type {
  AccCruiseRate,
  AccProperty,
  AccRoomRate,
  AccommodationCatalog,
  PricingSetting,
} from '@/lib/pricing/catalog-types';

/** Trims the repeated "… Hotels" suffix so tabs stay short. */
function tabLabel(sheet: string): string {
  return sheet.replace(/\s*Vietnam Hotels$/i, '').replace(/\s*Hotels$/i, '').trim() || sheet;
}

export default function PricingAccommodation() {
  const { canWrite } = usePagePermission('pricing-accommodation');
  const { data, lastImport, loading, error, configured, reload, setData } = useAccommodationCatalog();
  const [tab, setTab] = useState('properties');
  const [importOpen, setImportOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const rateSheets = useMemo(
    () => Array.from(new Set(data.roomRates.map((r) => r.sheet))),
    [data.roomRates]
  );
  const cruiseSheets = useMemo(
    () => Array.from(new Set(data.cruiseRates.map((r) => r.sheet))),
    [data.cruiseRates]
  );

  const tabs = useMemo(
    () => [
      { id: 'properties', label: '🏨 All properties', count: data.properties.length },
      ...rateSheets.map((sheet) => ({
        id: `sheet:${sheet}`,
        label: `📍 ${tabLabel(sheet)}`,
        count: data.roomRates.filter((r) => r.sheet === sheet).length,
      })),
      { id: 'cruises', label: '🚢 Cruises', count: data.cruiseRates.length },
      { id: 'overview', label: '📊 Overview', count: 0 },
    ],
    [data.properties.length, data.roomRates, data.cruiseRates.length, rateSheets]
  );

  const persist = useCallback(
    async (
      optimistic: (previous: AccommodationCatalog) => AccommodationCatalog,
      write: () => Promise<void>
    ) => {
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

  const patchProperty = useCallback(
    (id: string, patch: Partial<AccProperty>) =>
      persist(
        (prev) => ({
          ...prev,
          properties: prev.properties.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }),
        () => updateAccommodationCatalogRow('properties', id, patch)
      ),
    [persist]
  );

  const patchRate = useCallback(
    (id: string, patch: Partial<AccRoomRate>) =>
      persist(
        (prev) => ({
          ...prev,
          roomRates: prev.roomRates.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }),
        () => updateAccommodationCatalogRow('roomRates', id, patch)
      ),
    [persist]
  );

  const patchCruise = useCallback(
    (id: string, patch: Partial<AccCruiseRate>) =>
      persist(
        (prev) => ({
          ...prev,
          cruiseRates: prev.cruiseRates.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }),
        () => updateAccommodationCatalogRow('cruiseRates', id, patch)
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
        () => updateAccommodationCatalogRow('settings', id, patch)
      ),
    [persist]
  );

  const activeSheet = tab.startsWith('sheet:') ? tab.slice('sheet:'.length) : null;
  const isEmpty = !loading && !data.properties.length && !data.roomRates.length && !data.cruiseRates.length;

  return (
    <div className="pcx-page">
      <PricingSubnav active="pricing-accommodation" />

      <div className="pcx-toolbar">
        <div className="info-bar pcx-info">
          Imported from the <b>Accommodation &amp; Cruises</b> workbook — one tab per source sheet. Click a
          property to expand its contacts, contract terms and every seasonal rate.
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
          title={!canWrite ? 'You need write permission for Accommodation to import' : undefined}
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
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`tab${tab === t.id ? ' on' : ''}`}
            onClick={() => setTab(t.id)}
            role="button"
            tabIndex={0}
          >
            {t.label}
            {t.count > 0 && <span className="pcx-tab-count">{t.count}</span>}
          </div>
        ))}
      </div>

      {loading ? (
        <p className="pcx-empty">Loading the accommodation catalog…</p>
      ) : isEmpty ? (
        <EmptyState
          className="crm-empty-state--flush"
          variant="suppliers"
          title="No accommodation pricing yet"
          description="Import the Accommodation & Cruises workbook to populate properties, room rates and cabins."
          action={
            <button
              className="btn btn-p btn-sm"
              type="button"
              onClick={() => setImportOpen(true)}
              disabled={!canWrite}
              title={!canWrite ? 'You need write permission for Accommodation to import' : undefined}
            >
              Import Excel
            </button>
          }
        />
      ) : (
        <>
          {tab === 'properties' && (
            <AccPropertyTable
              properties={data.properties}
              roomRates={data.roomRates}
              cruiseRates={data.cruiseRates}
              onPatch={patchProperty}
            />
          )}
          {activeSheet && (
            <AccRateSheet
              sheet={activeSheet}
              rates={data.roomRates.filter((r) => r.sheet === activeSheet)}
              onPatch={patchRate}
            />
          )}
          {tab === 'cruises' && (
            <AccCruiseTable cruises={data.cruiseRates} sheets={cruiseSheets} onPatch={patchCruise} />
          )}
          {tab === 'overview' && (
            <AccOverview
              properties={data.properties}
              roomRates={data.roomRates}
              cruiseRates={data.cruiseRates}
              settings={data.settings}
              onPatchSetting={patchSetting}
            />
          )}
        </>
      )}

      <CatalogImportModal
        open={importOpen}
        workbook="accommodation"
        onClose={() => setImportOpen(false)}
        onImported={(rows) => {
          setFlash(`Imported ${rows.toLocaleString('en-US')} rows from the Accommodation workbook.`);
          void reload();
        }}
      />
    </div>
  );
}
