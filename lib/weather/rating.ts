import { WR } from '@/lib/seeds/weather';
import type { TravelRating } from './types';

/** Map Open-Meteo daily data to tourism E/G/F/P rating (matches seed legend). */
export function toTravelRating(
  weatherCode: number,
  precipMm: number,
  tempMax: number,
  tempMin?: number
): TravelRating {
  const min = tempMin ?? tempMax;

  if (precipMm > 20 || weatherCode >= 80) return 'P';
  if (precipMm > 8 || weatherCode >= 61) return 'F';
  if (tempMax > 38 || min < 8) return 'F';
  if (weatherCode <= 3 && precipMm <= 2) return 'E';
  if (precipMm > 2 || weatherCode >= 51) return 'F';
  return 'G';
}

export function ratingDisplay(rating: TravelRating) {
  return WR[rating];
}
