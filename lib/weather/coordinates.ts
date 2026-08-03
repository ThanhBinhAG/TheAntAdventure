/** Fixed coordinates for Vietnam weather destinations (Open-Meteo). */

export type WeatherRegion = 'north' | 'central' | 'south';

export type WeatherDestinationCoord = {
  id: string;
  name: string;
  region: WeatherRegion;
  emoji: string;
  latitude: number;
  longitude: number;
  elevationM?: number;
  sortOrder: number;
};

/** This Week featured panels — always shown with full 7-day detail when present in filter. */
export const FEATURED_WEEKLY_IDS = ['hanoi', 'saigon'] as const;

export type FeaturedWeeklyId = (typeof FEATURED_WEEKLY_IDS)[number];

export const WEATHER_DESTINATIONS: WeatherDestinationCoord[] = [
  { id: 'hanoi', name: 'Hanoi', region: 'north', emoji: '🏛', latitude: 21.0285, longitude: 105.8542, sortOrder: 1 },
  { id: 'sapa', name: 'Sapa', region: 'north', emoji: '⛰', latitude: 22.3364, longitude: 103.8438, elevationM: 1500, sortOrder: 2 },
  { id: 'maichau', name: 'Mai Chau', region: 'north', emoji: '🌾', latitude: 20.6797, longitude: 105.0883, elevationM: 400, sortOrder: 3 },
  { id: 'ninhbinh', name: 'Ninh Binh', region: 'north', emoji: '🛶', latitude: 20.2506, longitude: 105.9745, sortOrder: 4 },
  { id: 'phongnha', name: 'Phong Nha', region: 'central', emoji: '🦇', latitude: 17.59, longitude: 106.283, sortOrder: 5 },
  { id: 'hue', name: 'Hue', region: 'central', emoji: '🏯', latitude: 16.4637, longitude: 107.5909, sortOrder: 6 },
  { id: 'danang', name: 'Da Nang', region: 'central', emoji: '🌉', latitude: 16.0544, longitude: 108.2022, sortOrder: 7 },
  { id: 'hoian', name: 'Hoi An', region: 'central', emoji: '🏮', latitude: 15.8801, longitude: 108.338, sortOrder: 8 },
  { id: 'nhatrang', name: 'Nha Trang', region: 'central', emoji: '🤿', latitude: 12.2388, longitude: 109.1967, sortOrder: 9 },
  { id: 'phanthiet', name: 'Phan Thiet', region: 'south', emoji: '🏄', latitude: 10.9289, longitude: 108.1021, sortOrder: 10 },
  { id: 'condao', name: 'Con Dao', region: 'south', emoji: '🐢', latitude: 8.6864, longitude: 106.6074, sortOrder: 11 },
  { id: 'phuquoc', name: 'Phu Quoc', region: 'south', emoji: '🏝', latitude: 10.2899, longitude: 103.984, sortOrder: 12 },
  { id: 'saigon', name: 'Saigon (HCMC)', region: 'south', emoji: '🌆', latitude: 10.8231, longitude: 106.6297, sortOrder: 13 },
  { id: 'mekong', name: 'Mekong Delta', region: 'south', emoji: '🚣', latitude: 10.0452, longitude: 105.7469, sortOrder: 14 },
];

export function getDestinationsByRegion(region?: string | null): WeatherDestinationCoord[] {
  if (!region || region === 'all') return [...WEATHER_DESTINATIONS];
  return WEATHER_DESTINATIONS.filter((d) => d.region === region);
}
