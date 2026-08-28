'use client';

import { useMemo, useState } from 'react';
import ExtendedSupplierTab from '@/components/suppliers/ExtendedSupplierTab';
import HotelTab from '@/components/suppliers/HotelTab';
import QuickListTab from '@/components/suppliers/QuickListTab';
import SupplierFilterBar, { computeSupplierCounts, type SupTab } from '@/components/suppliers/SupplierFilterBar';
import EmptyState from '@/components/EmptyState';
import { useStore } from '@/hooks/useStore';
import { useSuppliersPage } from '@/hooks/useSuppliersPage';
import type { SupplierFilters } from '@/lib/suppliers/supplier-utils';
import { usePagePermission } from '@/hooks/usePagePermission';

const TABS: { id: SupTab; label: string }[] = [
  { id: 'hotels', label: '🏨 Hotels' },
  { id: 'cruises', label: '⛵ Cruises' },
  { id: 'transport', label: '🚐 Transport' },
  { id: 'restaurants', label: '🍜 Restaurants' },
  { id: 'logistics', label: '✈️ Logistics & Immigration' },
  { id: 'water', label: '🚤 Water Transport' },
  { id: 'adventure', label: '🧗 Adventure & Equipment' },
  { id: 'experience', label: '🎭 High-End Experiences' },
  { id: 'personnel', label: '👥 Personnel & Safety' },
];

const EXTENDED_TABS: SupTab[] = ['logistics', 'water', 'adventure', 'experience', 'personnel'];

export default function Suppliers() {
  const { canWrite } = usePagePermission('suppliers');
  const { loading, error, reload } = useSuppliersPage();
  const hotels = useStore((s) => s.hotels);
  const transport = useStore((s) => s.transport);
  const restaurants = useStore((s) => s.restaurants);
  const cruises = useStore((s) => s.cruises);
  const specialSuppliers = useStore((s) => s.specialSuppliers);

  const [tab, setTab] = useState<SupTab>('hotels');
  const [filters, setFilters] = useState<SupplierFilters>({ search: '', region: '', tier: '' });

  const counts = useMemo(
    () => computeSupplierCounts({ hotels, transport, restaurants, cruises, specialSuppliers }),
    [hotels, transport, restaurants, cruises, specialSuppliers]
  );

  if (loading && !hotels.length && !transport.length && !restaurants.length && !cruises.length && !specialSuppliers.length) {
    return (
      <div className="sup-page">
        <EmptyState
          size="compact"
          variant="suppliers"
          title="Loading suppliers…"
          description="Fetching partner catalogs from the CRM API."
        />
      </div>
    );
  }

  if (error && !hotels.length && !transport.length) {
    return (
      <div className="sup-page">
        <EmptyState
          size="compact"
          variant="suppliers"
          title="Could not load suppliers"
          description={error}
          action={
            <button type="button" className="btn btn-p btn-sm" onClick={() => void reload()}>
              Retry
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="sup-page">
      <SupplierFilterBar tab={tab} filters={filters} onFilterChange={setFilters} counts={counts} />

      <div className="tabs sup-tabs">
        {TABS.map((t) => (
          <div key={t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)} role="button" tabIndex={0}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'hotels' && <HotelTab filters={filters} canWrite={canWrite} />}
      {tab === 'cruises' && <QuickListTab kind="cruise" filters={filters} canWrite={canWrite} />}
      {tab === 'transport' && <QuickListTab kind="transport" filters={filters} canWrite={canWrite} />}
      {tab === 'restaurants' && <QuickListTab kind="restaurant" filters={filters} canWrite={canWrite} />}
      {EXTENDED_TABS.includes(tab) && (
        <ExtendedSupplierTab section={tab as 'logistics' | 'water' | 'adventure' | 'experience' | 'personnel'} filters={filters} canWrite={canWrite} />
      )}
    </div>
  );
}
