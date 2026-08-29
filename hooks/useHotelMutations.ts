'use client';

import { useCallback } from 'react';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { HotelInput, HotelListItem } from '@/lib/suppliers/hotel-input';
import type { Hotel } from '@/lib/types';
import { useStore } from '@/hooks/useStore';

export type HotelMutationOutcome =
  | { ok: true; hotel: HotelListItem }
  | { ok: false; error: 'save_failed'; message: string };

export type HotelDeleteOutcome =
  | { ok: true }
  | { ok: false; error: 'save_failed'; message: string };

type HotelResponse = {
  ok?: boolean;
  error?: string;
  data?: HotelListItem;
};

async function readJson(res: Response): Promise<HotelResponse> {
  try {
    return (await res.json()) as HotelResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useHotelMutations() {
  const addHotel = useStore((s) => s.addHotel);
  const updateHotel = useStore((s) => s.updateHotel);
  const removeHotel = useStore((s) => s.removeHotel);
  const hotels = useStore((s) => s.hotels);

  const createHotel = useCallback(
    async (hotel: HotelInput | Hotel): Promise<HotelMutationOutcome> => {
      const payload: HotelInput = {
        id: hotel.id,
        name: hotel.name,
        dest: hotel.dest ?? '',
        cat: hotel.cat ?? '',
        stars: hotel.stars ?? '',
        region: hotel.region,
        rooms: hotel.rooms ?? [],
        status: hotel.status ?? 'Active',
      };
      const res = await fetch('/api/hotels', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotel: payload }),
      });
      const body = await readJson(res);
      if (!res.ok || !body.ok || !body.data) {
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể tạo hotel.',
        };
      }
      await withoutAutoSyncAsync(async () => {
        addHotel(body.data as Hotel);
      });
      return { ok: true, hotel: body.data };
    },
    [addHotel],
  );

  const patchHotel = useCallback(
    async (
      hotelId: string,
      patch: Hotel,
    ): Promise<HotelMutationOutcome> => {
      const current = hotels.find((h) => h.id === hotelId);
      if (!current) {
        return {
          ok: false,
          error: 'save_failed',
          message: 'Không tìm thấy hotel trên client.',
        };
      }

      const previous = structuredClone(current);
      await withoutAutoSyncAsync(async () => {
        updateHotel(hotelId, patch);
      });

      const payload: HotelInput & { id: string } = {
        id: hotelId,
        name: patch.name,
        dest: patch.dest,
        cat: patch.cat,
        stars: patch.stars,
        region: patch.region,
        rooms: patch.rooms,
        status: patch.status ?? 'Active',
      };

      const res = await fetch(`/api/hotels/${encodeURIComponent(hotelId)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotel: payload }),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.data) {
        await withoutAutoSyncAsync(async () => {
          updateHotel(hotelId, previous);
        });
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể cập nhật hotel.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        updateHotel(hotelId, body.data as Hotel);
      });
      return { ok: true, hotel: body.data };
    },
    [hotels, updateHotel],
  );

  const deleteHotel = useCallback(
    async (hotelId: string): Promise<HotelDeleteOutcome> => {
      const current = hotels.find((h) => h.id === hotelId) ?? null;
      if (current) {
        await withoutAutoSyncAsync(async () => {
          removeHotel(hotelId);
        });
      }

      const res = await fetch(`/api/hotels/${encodeURIComponent(hotelId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const body = await readJson(res);

      if (!res.ok || body.ok === false) {
        if (current) {
          await withoutAutoSyncAsync(async () => {
            addHotel(current);
          });
        }
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể xóa hotel.',
        };
      }

      return { ok: true };
    },
    [addHotel, hotels, removeHotel],
  );

  return { createHotel, patchHotel, deleteHotel };
}
