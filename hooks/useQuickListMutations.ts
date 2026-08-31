'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type {
  CruiseInput,
  CruiseListItem,
  RestaurantInput,
  RestaurantListItem,
  TransportInput,
  TransportListItem,
} from '@/lib/suppliers/quicklist-input';
import type {
  CruiseSupplier,
  RestaurantSupplier,
  TransportSupplier,
} from '@/lib/types';
import { useStore } from '@/hooks/useStore';

export type QuickListKind = 'transport' | 'restaurant' | 'cruise';

export type QuickListMutationOutcome =
  | {
      ok: true;
      row: TransportListItem | RestaurantListItem | CruiseListItem;
    }
  | { ok: false; error: 'save_failed'; message: string };

export type QuickListDeleteOutcome =
  | { ok: true }
  | { ok: false; error: 'save_failed'; message: string };

type ApiResponse<T> = {
  ok?: boolean;
  error?: string;
  data?: T;
};

async function readJson<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

const ENDPOINTS: Record<
  QuickListKind,
  { list: string; bodyKey: 'transport' | 'restaurant' | 'cruise' }
> = {
  transport: { list: '/api/transport', bodyKey: 'transport' },
  restaurant: { list: '/api/restaurants', bodyKey: 'restaurant' },
  cruise: { list: '/api/cruises', bodyKey: 'cruise' },
};

export function useQuickListMutations(kind: QuickListKind) {
  const transport = useStore((s) => s.transport);
  const restaurants = useStore((s) => s.restaurants);
  const cruises = useStore((s) => s.cruises);
  const addTransport = useStore((s) => s.addTransport);
  const updateTransport = useStore((s) => s.updateTransport);
  const removeTransport = useStore((s) => s.removeTransport);
  const addRestaurant = useStore((s) => s.addRestaurant);
  const updateRestaurant = useStore((s) => s.updateRestaurant);
  const removeRestaurant = useStore((s) => s.removeRestaurant);
  const addCruise = useStore((s) => s.addCruise);
  const updateCruise = useStore((s) => s.updateCruise);
  const removeCruise = useStore((s) => s.removeCruise);

  const endpoint = ENDPOINTS[kind];

  const createRow = useCallback(
    async (
      row: TransportInput | RestaurantInput | CruiseInput,
    ): Promise<QuickListMutationOutcome> => {
      const res = await fetch(endpoint.list, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [endpoint.bodyKey]: row }),
      });
      const body = await readJson<
        TransportListItem | RestaurantListItem | CruiseListItem
      >(res);
      if (!res.ok || !body.ok || !body.data) {
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể tạo partner.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        if (kind === 'transport') addTransport(body.data as TransportSupplier);
        else if (kind === 'restaurant')
          addRestaurant(body.data as RestaurantSupplier);
        else addCruise(body.data as CruiseSupplier);
      });

      return { ok: true, row: body.data };
    },
    [addCruise, addRestaurant, addTransport, endpoint, kind],
  );

  const patchRow = useCallback(
    async (
      id: string,
      row: TransportSupplier | RestaurantSupplier | CruiseSupplier,
    ): Promise<QuickListMutationOutcome> => {
      const current =
        kind === 'transport'
          ? transport.find((r) => r.id === id)
          : kind === 'restaurant'
            ? restaurants.find((r) => r.id === id)
            : cruises.find((r) => r.id === id);
      if (!current) {
        return {
          ok: false,
          error: 'save_failed',
          message: 'Không tìm thấy partner trên client.',
        };
      }

      const previous = { ...current };
      await withoutAutoSyncAsync(async () => {
        if (kind === 'transport')
          updateTransport(id, row as TransportSupplier);
        else if (kind === 'restaurant')
          updateRestaurant(id, row as RestaurantSupplier);
        else updateCruise(id, row as CruiseSupplier);
      });

      const res = await fetch(`${endpoint.list}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [endpoint.bodyKey]: { ...row, id } }),
      });
      const body = await readJson<
        TransportListItem | RestaurantListItem | CruiseListItem
      >(res);

      if (!res.ok || !body.ok || !body.data) {
        await withoutAutoSyncAsync(async () => {
          if (kind === 'transport')
            updateTransport(id, previous as TransportSupplier);
          else if (kind === 'restaurant')
            updateRestaurant(id, previous as RestaurantSupplier);
          else updateCruise(id, previous as CruiseSupplier);
        });
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể cập nhật partner.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        if (kind === 'transport')
          updateTransport(id, body.data as TransportSupplier);
        else if (kind === 'restaurant')
          updateRestaurant(id, body.data as RestaurantSupplier);
        else updateCruise(id, body.data as CruiseSupplier);
      });

      return { ok: true, row: body.data };
    },
    [
      cruises,
      endpoint.list,
      endpoint.bodyKey,
      kind,
      restaurants,
      transport,
      updateCruise,
      updateRestaurant,
      updateTransport,
    ],
  );

  const deleteRow = useCallback(
    async (id: string): Promise<QuickListDeleteOutcome> => {
      const current =
        kind === 'transport'
          ? transport.find((r) => r.id === id) ?? null
          : kind === 'restaurant'
            ? restaurants.find((r) => r.id === id) ?? null
            : cruises.find((r) => r.id === id) ?? null;

      if (current) {
        await withoutAutoSyncAsync(async () => {
          if (kind === 'transport') removeTransport(id);
          else if (kind === 'restaurant') removeRestaurant(id);
          else removeCruise(id);
        });
      }

      const res = await fetch(`${endpoint.list}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const body = await readJson<unknown>(res);

      if (!res.ok || body.ok === false) {
        if (current) {
          await withoutAutoSyncAsync(async () => {
            if (kind === 'transport')
              addTransport(current as TransportSupplier);
            else if (kind === 'restaurant')
              addRestaurant(current as RestaurantSupplier);
            else addCruise(current as CruiseSupplier);
          });
        }
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể xóa partner.',
        };
      }

      return { ok: true };
    },
    [
      addCruise,
      addRestaurant,
      addTransport,
      cruises,
      endpoint.list,
      kind,
      removeCruise,
      removeRestaurant,
      removeTransport,
      restaurants,
      transport,
    ],
  );

  return { createRow, patchRow, deleteRow };
}
