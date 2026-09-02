export const SUGGESTED_HOTEL_TIERS = ['3★', '4★', '5★'];

type HotelTierSource = { stars?: string | null; status?: string | null };

/** Preserve the designation supplied by the hotel/contact; only trim accidental outer spaces. */
export function normalizeHotelTier(value: string): string {
  return value.trim();
}

export function collectActiveHotelTiers(hotels: HotelTierSource[]): string[] {
  const unique = new Map<string, string>();
  for (const hotel of hotels) {
    if (hotel.status?.trim().toLocaleLowerCase() !== 'active') continue;
    const tier = normalizeHotelTier(hotel.stars ?? '');
    if (tier) unique.set(tier.toLocaleLowerCase(), tier);
  }
  return [...unique.values()].sort((a, b) => a.localeCompare(b));
}
