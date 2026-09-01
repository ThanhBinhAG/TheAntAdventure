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
import { useLanguage } from '@/hooks/useLanguage';

export default function Suppliers() {
  const { tp, tc } = useLanguage();
  const { canWrite } = usePagePermission('suppliers');
  const { loading, error, reload } = useSuppliersPage();
  const hotels = useStore((s) => s.hotels);
  const transport = useStore((s) => s.transport);
  const restaurants = useStore((s) => s.restaurants);
  const cruises = useStore((s) => s.cruises);
  const specialSuppliers = useStore((s) => s.specialSuppliers);

  const [tab, setTab] = useState<SupTab>('hotels');
  const [filters, setFilters] = useState<SupplierFilters>({ search: '', region: '', tier: '' });

  const TABS: { id: SupTab; label: string }[] = useMemo(
    () => [
      { id: 'hotels', label: tp('suppliers', 'tabHotels') },
      { id: 'cruises', label: tp('suppliers', 'tabCruises') },
      { id: 'transport', label: tp('suppliers', 'tabTransport') },
      { id: 'restaurants', label: tp('suppliers', 'tabRestaurants') },
      { id: 'logistics', label: tp('suppliers', 'tabLogistics') },
      { id: 'water', label: tp('suppliers', 'tabWater') },
      { id: 'adventure', label: tp('suppliers', 'tabAdventure') },
      { id: 'experience', label: tp('suppliers', 'tabExperience') },
      { id: 'personnel', label: tp('suppliers', 'tabPersonnel') },
    ],
    [tp]
  );

  const counts = useMemo(
    () => computeSupplierCounts({ hotels, transport, restaurants, cruises, specialSuppliers }),
    [hotels, transport, restaurants, cruises, specialSuppliers]
  );

  const EXTENDED_TABS: SupTab[] = ['logistics', 'water', 'adventure', 'experience', 'personnel'];

  if (loading && !hotels.length && !transport.length && !restaurants.length && !cruises.length && !specialSuppliers.length) {
    return (
      <div className="sup-page">
        <EmptyState
          size="compact"
          variant="suppliers"
          title={tp('suppliers', 'loadingTitle')}
          description={tp('suppliers', 'loadingDesc')}
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
          title={tp('suppliers', 'loadErrorTitle')}
          description={error}
          action={
            <button type="button" className="btn btn-p btn-sm" onClick={() => void reload()}>
              {tc('retry')}
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
