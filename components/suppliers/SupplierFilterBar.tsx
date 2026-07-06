'use client';

import type { ExtendedSupplier, Hotel } from '@/lib/types';
import type { CruiseSupplier, RestaurantSupplier, TransportSupplier } from '@/lib/types';
import type { SupplierFilters } from '@/lib/supplier-utils';

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

export default function SupplierFilterBar({ tab, filters, onFilterChange, counts, onAdd }: Props) {
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

  return (
    <div className="sup-top-bar">
      <input
        className="sup-search"
        placeholder="🔍  Search all suppliers…"
        value={filters.search}
        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
      />
      <select value={filters.region} onChange={(e) => onFilterChange({ ...filters, region: e.target.value })}>
        <option value="">All Regions</option>
        <option value="north">🔵 Northern Vietnam</option>
        <option value="central">🟡 Central Vietnam</option>
        <option value="south">🟠 Southern Vietnam</option>
        <option value="national">🇻🇳 Nationwide</option>
      </select>
      <select value={filters.tier} onChange={(e) => onFilterChange({ ...filters, tier: e.target.value })}>
        <option value="">All Tiers</option>
        <option value="luxury">💎 Luxury</option>
        <option value="premium">⭐ Premium</option>
        <option value="preferred">♥ Preferred</option>
      </select>
      <div style={{ flex: 1 }} />
      <div className="sup-kpi-strip">
        <div className="sup-kpi-pill">
          <div className="sup-kpi-pill-v">{activeCount}</div>
          <div className="sup-kpi-pill-l">{showExtendedKpi ? 'Extended' : tab.charAt(0).toUpperCase() + tab.slice(1)}</div>
        </div>
        {showExtendedKpi && (
          <>
            <div className="sup-kpi-pill">
              <div className="sup-kpi-pill-v">{counts.extendedActive}</div>
              <div className="sup-kpi-pill-l">Active</div>
            </div>
            <div className="sup-kpi-pill">
              <div className="sup-kpi-pill-v">{counts.extendedPreferred}</div>
              <div className="sup-kpi-pill-l">Preferred ♥</div>
            </div>
          </>
        )}
      </div>
      {onAdd && (
        <button className="btn btn-p btn-sm" type="button" onClick={onAdd}>
          ＋ Add New Supplier
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
