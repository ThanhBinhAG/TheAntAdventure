import 'server-only';
import { ensureDestinationsSeeded, listDestinations } from './destinations';
import { getDestinationWeather } from './refresh';
import type { DestinationWeatherDetail, WeatherDestinationMeta } from './types';

export type WeatherPageBoot = {
  destinations: WeatherDestinationMeta[];
  featuredWeather: DestinationWeatherDetail[];
};

const MAX_FEATURED = 2;

/**
 * Weather page boot: full destination catalog + cache-first forecast
 * for featured slots only (explore stays lazy per id).
 */
export async function getWeatherPageBoot(): Promise<WeatherPageBoot> {
  await ensureDestinationsSeeded();
  const destinations = await listDestinations({ activeOnly: true });
  const featured = destinations.filter((d) => d.isFeatured).slice(0, MAX_FEATURED);

  const featuredWeather = (
    await Promise.all(
      featured.map(async (d) => {
        try {
          // Pass meta to skip getDestinationById N+1 (cover already on catalog rows).
          const { detail } = await getDestinationWeather(d, { force: false });
          return detail;
        } catch {
          return null;
        }
      })
    )
  ).filter((d): d is DestinationWeatherDetail => d != null);

  return { destinations, featuredWeather };
}
