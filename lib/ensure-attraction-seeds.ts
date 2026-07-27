import { ATTRACTION_DATA } from './seeds/attractions';
import type { Attraction } from './types';

const SEED_PHONES: Record<string, string> = {
  'ATT-N-001': '+84 24 3756 2193',
  'ATT-N-003': '+84 24 3824 5344',
  'ATT-N-007': '+84 24 3934 2253',
  'ATT-S-001': '+84 28 3930 5587',
  'ATT-S-004': '+84 28 3822 3652',
  'ATT-C-002': '+84 234 3501 143',
};

function normalizeSeed(row: (typeof ATTRACTION_DATA)[number]): Attraction {
  return {
    ...row,
    region: row.region as Attraction['region'],
    phone: SEED_PHONES[row.id] ?? '',
    photoIds: [],
    linkedPhotoIds: [],
  };
}

export function mergeAttractionSeeds(input?: Attraction[]): Attraction[] {
  if (input?.length) return input;
  return ATTRACTION_DATA.map(normalizeSeed);
}
