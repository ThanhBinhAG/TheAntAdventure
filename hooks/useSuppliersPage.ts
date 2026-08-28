'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBffArray } from '@/lib/bff/client';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import { mergeSupplierSeeds } from '@/lib/suppliers/ensure-supplier-seeds';
import type { ExtendedSupplierListItem } from '@/lib/suppliers/extended-supplier-input';
import type { HotelListItem } from '@/lib/suppliers/hotel-input';
import type {
  CruiseListItem,
  RestaurantListItem,
  TransportListItem,
} from '@/lib/suppliers/quicklist-input';
import type {
  CruiseSupplier,
  ExtendedSupplier,
  Hotel,
  RestaurantSupplier,
  TransportSupplier,
} from '@/lib/types';
import { useStore } from '@/hooks/useStore';

type Catalog = {
  hotels: HotelListItem[];
  transport: TransportListItem[];
  restaurants: RestaurantListItem[];
  cruises: CruiseListItem[];
  specialSuppliers: ExtendedSupplierListItem[];
};

const inflight = new Map<string, Promise<Catalog>>();

async function fetchSuppliersOnce(bust = false): Promise<Catalog> {
  const key = 'suppliers-catalog';
  if (bust) inflight.delete(key);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = Promise.all([
    getBffArray<HotelListItem>('/api/hotels', 'Không thể tải hotels.'),
    getBffArray<TransportListItem>('/api/transport', 'Không thể tải transport.'),
    getBffArray<RestaurantListItem>(
      '/api/restaurants',
      'Không thể tải restaurants.',
    ),
    getBffArray<CruiseListItem>('/api/cruises', 'Không thể tải cruises.'),
    getBffArray<ExtendedSupplierListItem>(
      '/api/suppliers',
      'Không thể tải suppliers.',
    ),
  ])
    .then(([hotels, transport, restaurants, cruises, specialSuppliers]) => {
      const remoteEmpty =
        !hotels.length &&
        !transport.length &&
        !restaurants.length &&
        !cruises.length &&
        !specialSuppliers.length;
      if (!remoteEmpty) {
        return { hotels, transport, restaurants, cruises, specialSuppliers };
      }
      const seeded = mergeSupplierSeeds({});
      return {
        hotels: seeded.hotels,
        transport: seeded.transport,
        restaurants: seeded.restaurants,
        cruises: seeded.cruises,
        specialSuppliers: seeded.specialSuppliers,
      };
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function useSuppliersPage() {
  const setHotels = useStore((s) => s.setHotels);
  const setTransport = useStore((s) => s.setTransport);
  const setRestaurants = useStore((s) => s.setRestaurants);
  const setCruises = useStore((s) => s.setCruises);
  const setSpecialSuppliers = useStore((s) => s.setSpecialSuppliers);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyCatalog = useCallback(
    async (catalog: Catalog) => {
      await withoutAutoSyncAsync(async () => {
        setHotels(catalog.hotels as Hotel[]);
        setTransport(catalog.transport as TransportSupplier[]);
        setRestaurants(catalog.restaurants as RestaurantSupplier[]);
        setCruises(catalog.cruises as CruiseSupplier[]);
        setSpecialSuppliers(catalog.specialSuppliers as ExtendedSupplier[]);
      });
    },
    [setCruises, setHotels, setRestaurants, setSpecialSuppliers, setTransport],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catalog = await fetchSuppliersOnce(true);
      await applyCatalog(catalog);
      setLoading(false);
      setError(null);
      return catalog;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      return null;
    }
  }, [applyCatalog]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const catalog = await fetchSuppliersOnce();
        if (!active) return;
        await applyCatalog(catalog);
        if (active) {
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [applyCatalog]);

  return { loading, error, reload };
}
