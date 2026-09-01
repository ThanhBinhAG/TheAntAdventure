'use client';

import type { ExtendedSupplier, Hotel } from '@/lib/types';
import type { CruiseSupplier, RestaurantSupplier, TransportSupplier } from '@/lib/types';
import type { SupplierFilters } from '@/lib/suppliers/supplier-utils';
import { useLanguage } from '@/hooks/useLanguage';
import type { SUPPLIERSKey } from '@/lib/i18n/pages/suppliers';

export type SupTab =
  | 'hotels'
  | 'cruises'
  | 'transport'
  | 'restaurants'
  | 'logistics'
  | 'water'
  | 'adventure'
  | 'experience'
  | 'personnel'
  | 'custom';

type Props = {
  tab: SupTab;
  filters: SupplierFilters;
  onFilterChange: (filters: SupplierFilters) => void;
  counts: {
    hotels: number;
    transport: number;
    restaurants: number;
    cruises: number;
    extended: number;
    extendedActive: number;
    extendedPreferred: number;
  };
  onAdd?: () => void;
};

const TAB_KPI_KEY: Partial<Record<SupTab, SUPPLIERSKey>> = {
  hotels: 'tabHotels',
  transport: 'tabTransport',
  restaurants: 'tabRestaurants',
  cruises: 'tabCruises',
};

export default function SupplierFilterBar({ tab, filters, onFilterChange, counts, onAdd }: Props) {
  const { tp } = useLanguage();

  const activeCount = (() => {
    switch (tab) {
      case 'hotels':
        return counts.hotels;
      case 'transport':
        return counts.transport;
      case 'restaurants':
        return counts.restaurants;
      case 'cruises':
        return counts.cruises;
      default:
        return counts.extended;
    }
  })();

  const showExtendedKpi = ['logistics', 'water', 'adventure', 'experience', 'personnel'].includes(tab);
  const kpiLabel = showExtendedKpi
    ? tp('suppliers', 'kpiExtended')
    : TAB_KPI_KEY[tab]
      ? tp('suppliers', TAB_KPI_KEY[tab]!)
      : tab.charAt(0).toUpperCase() + tab.slice(1);

  return (
    <div className="sup-top-bar">
      <input
        className="sup-search"
        placeholder={tp('suppliers', 'searchPlaceholder')}
        value={filters.search}
        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
      />
      <select value={filters.region} onChange={(e) => onFilterChange({ ...filters, region: e.target.value })}>
        <option value="">{tp('suppliers', 'filterAllRegions')}</option>
        <option value="north">{tp('suppliers', 'filterNorth')}</option>
        <option value="central">{tp('suppliers', 'filterCentral')}</option>
        <option value="south">{tp('suppliers', 'filterSouth')}</option>
        <option value="national">{tp('suppliers', 'filterNational')}</option>
      </select>
      <select value={filters.tier} onChange={(e) => onFilterChange({ ...filters, tier: e.target.value })}>
        <option value="">{tp('suppliers', 'filterAllTiers')}</option>
        <option value="luxury">{tp('suppliers', 'filterLuxury')}</option>
        <option value="premium">{tp('suppliers', 'filterPremium')}</option>
        <option value="preferred">{tp('suppliers', 'filterPreferred')}</option>
      </select>
      <div style={{ flex: 1 }} />
      <div className="sup-kpi-strip">
        <div className="sup-kpi-pill">
          <div className="sup-kpi-pill-v">{activeCount}</div>
          <div className="sup-kpi-pill-l">{kpiLabel}</div>
        </div>
        {showExtendedKpi && (
          <>
            <div className="sup-kpi-pill">
              <div className="sup-kpi-pill-v">{counts.extendedActive}</div>
              <div className="sup-kpi-pill-l">{tp('suppliers', 'kpiActive')}</div>
            </div>
            <div className="sup-kpi-pill">
              <div className="sup-kpi-pill-v">{counts.extendedPreferred}</div>
              <div className="sup-kpi-pill-l">{tp('suppliers', 'kpiPreferred')}</div>
            </div>
          </>
        )}
      </div>
      {onAdd && (
        <button className="btn btn-p btn-sm" type="button" onClick={onAdd}>
          {tp('suppliers', 'addNewSupplier')}
        </button>
      )}
    </div>
  );
}

export function computeSupplierCounts(input: {
  hotels: Hotel[];
  transport: TransportSupplier[];
  restaurants: RestaurantSupplier[];
  cruises: CruiseSupplier[];
  specialSuppliers: ExtendedSupplier[];
}) {
  return {
    hotels: input.hotels.length,
    transport: input.transport.length,
    restaurants: input.restaurants.length,
    cruises: input.cruises.length,
    extended: input.specialSuppliers.length,
    extendedActive: input.specialSuppliers.filter((s) => s.status === 'Active').length,
    extendedPreferred: input.specialSuppliers.filter((s) => (s.tags || []).includes('Preferred')).length,
  };
}
