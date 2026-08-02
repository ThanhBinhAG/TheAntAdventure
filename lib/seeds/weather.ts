/* Seasonal / Best Time seed maps — destination list SSOT is lib/weather/coordinates. */

import { WEATHER_DESTINATIONS } from '@/lib/weather/coordinates';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const WR = {
  E: { label: 'Excellent', icon: '🌞', bg: '#E8F5EE', fg: '#1a5c38', score: 4 },
  G: { label: 'Good', icon: '🌤', bg: '#E3F2FD', fg: '#1565C0', score: 3 },
  F: { label: 'Fair', icon: '⛅', bg: '#FEF3C7', fg: '#D97706', score: 2 },
  P: { label: 'Poor', icon: '🌧', bg: '#FDECEA', fg: '#C0392B', score: 1 },
};

export type WeatherRatingCode = keyof typeof WR;

export type BestByEntry = {
  months: number[];
  activity: string;
  tooltips?: Record<number, string>;
};

/** Derived from WEATHER_DESTINATIONS — do not maintain a second list. */
export const DESTINATIONS = WEATHER_DESTINATIONS.map(({ id, name, region, emoji }) => ({
  id,
  name,
  region,
  emoji,
}));

export const BEST_BY: Record<string, BestByEntry> = {
  hanoi: {
    months: [9, 10],
    activity: 'Autumn Atmosphere & Street Photography',
    tooltips: {
      9: 'Peak autumn in Hanoi — golden light, cool breezes, and the city at its most photogenic.',
      10: 'November magic: crisp air, golden leaves, and legendary street food season in Hanoi.',
    },
  },
  sapa: {
    months: [8, 9],
    activity: 'Golden Rice Terrace Harvest',
    tooltips: {
      8: "September harvest: terraces turn luminous gold — the most iconic landscape in northern Vietnam.",
      9: "October ripens the rice — Sapa's terraces glow amber in the morning mist.",
    },
  },
  maichau: {
    months: [2, 3, 4],
    activity: 'Lush Greenery & Ethnic Festivals',
    tooltips: {
      2: 'March blooms in Mai Chau — valley turns vivid green, White Thai festivals fill the villages.',
      3: 'April brings ethnic harvest ceremonies and the valley at peak lush beauty.',
      4: 'May in Mai Chau: cool highland air, green paddy fields, and authentic community life.',
    },
  },
  ninhbinh: {
    months: [4, 5],
    activity: 'Golden Rice Photography at Tam Coc',
    tooltips: {
      4: 'May: golden rice frames the limestone karsts of Tam Coc — the shot every travel photographer seeks.',
      5: 'June harvest light in Ninh Binh — boat through emerald waterways flanked by ripening rice.',
    },
  },
  phongnha: {
    months: [2, 3, 4],
    activity: 'Optimal Cave Exploration',
    tooltips: {
      2: 'March: low river levels open inner chambers — the best conditions for Phong Nha cave diving.',
      3: 'April caves at their clearest — dry season peak for Hang En and Son Doong expeditions.',
      4: 'May: final prime window before summer rains — cave rivers at ideal levels for exploration.',
    },
  },
  hue: {
    months: [3],
    activity: 'Hue Festival & Imperial City Walks',
    tooltips: {
      3: 'April in Hue: the biennial Hue Festival fills the citadel with lanterns, court music, and royal ceremony.',
    },
  },
  danang: {
    months: [1, 2, 3, 4],
    activity: 'Best Visibility for Snorkeling & Ba Na Hills',
    tooltips: {
      1: 'February: crystalline sea visibility and Ba Na Hills above the clouds — a perfect coastal escape.',
      2: 'March calm seas deliver the finest snorkeling conditions of the year around Da Nang.',
      3: 'April: warm water, clear skies, and Ba Na Hills views stretching to the horizon.',
      4: 'May closes the peak snorkeling window — visibility still superb before summer winds arrive.',
    },
  },
  hoian: {
    months: [1, 2, 3],
    activity: 'Lantern Festivals & Mild Walking Weather',
    tooltips: {
      1: 'February lantern season peaks — the Full Moon festival transforms Hoi An into a river of light.',
      2: "March is Hoi An's sweet spot: cool mornings for walking, lanterns nightly, crowds still manageable.",
      3: 'April: warm days, gentle evenings, and the ancient town in full bloom for walking and cycling.',
    },
  },
  nhatrang: {
    months: [1, 2, 3, 4],
    activity: 'Crystal Clear Water for Diving',
    tooltips: {
      1: "February marks the start of Nha Trang's finest dive season — visibility exceeds 20 metres.",
      2: 'March: calm seas, warm water, and thriving reef life around Hon Mun Marine Reserve.',
      3: 'April peak diving: optimal conditions for both beginners and advanced wreck divers.',
      4: 'May closes the prime dive window — coral gardens still pristine before the monsoon shifts.',
    },
  },
  phanthiet: {
    months: [10, 11, 0, 1],
    activity: 'Kitesurfing & Sand Dune Photography',
    tooltips: {
      10: "November: Phan Thiet's famous trade winds arrive — kitesurfers from around the world converge.",
      11: 'December offers the strongest consistent winds and red dune photography at golden hour.',
      0: 'January peak season — the Mui Ne kite corridor at full power, dunes glowing at dawn.',
      1: 'February: final weeks of prime kitesurfing conditions before the winds ease into spring.',
    },
  },
  condao: {
    months: [2, 3, 4],
    activity: 'Turtle Season & Clear Diving',
    tooltips: {
      2: 'March: calm seas and nesting season begin — Con Dao diving at its clearest.',
      3: 'April peak for turtles and reef visibility around the national park.',
      4: 'May closes the prime dry window before summer storms pick up.',
    },
  },
  phuquoc: {
    months: [11, 0, 1, 2],
    activity: 'Beach Weather & Island Hopping',
    tooltips: {
      11: 'December opens Phu Quoc dry season — calm seas and long beach days.',
      0: 'January is peak island weather for snorkeling and sunset beaches.',
      1: 'February stays dry and warm — ideal for island hopping.',
      2: 'March still excellent before late-spring showers increase.',
    },
  },
  saigon: {
    months: [11, 0, 1, 2],
    activity: 'City Walking & Food Tours',
    tooltips: {
      11: 'December: cooler evenings make Saigon walking tours far more comfortable.',
      0: 'January is the sweet spot for street food and city exploration.',
      1: 'February stays relatively dry before the heavier rains return.',
      2: 'March still workable for urban itineraries with lighter showers.',
    },
  },
  mekong: {
    months: [11, 0, 1, 2],
    activity: 'Floating Markets & Delta Boating',
    tooltips: {
      11: 'December dry season opens the best window for Delta boat days.',
      0: 'January: comfortable mornings for floating markets and orchard visits.',
      1: 'February remains dry enough for full-day Mekong itineraries.',
      2: 'March closes the prime dry window before heat and showers rise.',
    },
  },
};

export const DEFAULT_WEATHER: Record<string, string[]> = {
  hanoi: ['G', 'G', 'G', 'G', 'F', 'F', 'G', 'G', 'G', 'E', 'E', 'G'],
  sapa: ['F', 'F', 'G', 'G', 'F', 'F', 'G', 'G', 'F', 'E', 'G', 'F'],
  maichau: ['G', 'G', 'G', 'E', 'F', 'F', 'G', 'G', 'G', 'E', 'E', 'G'],
  ninhbinh: ['G', 'G', 'G', 'E', 'F', 'G', 'G', 'G', 'G', 'E', 'E', 'G'],
  phongnha: ['G', 'G', 'G', 'E', 'E', 'E', 'E', 'P', 'P', 'P', 'P', 'G'],
  hue: ['F', 'F', 'G', 'G', 'E', 'E', 'E', 'G', 'F', 'P', 'P', 'F'],
  danang: ['F', 'G', 'G', 'E', 'E', 'E', 'E', 'E', 'F', 'P', 'P', 'F'],
  hoian: ['F', 'G', 'G', 'E', 'E', 'E', 'E', 'E', 'F', 'P', 'P', 'F'],
  nhatrang: ['G', 'G', 'E', 'E', 'E', 'E', 'E', 'E', 'G', 'F', 'F', 'G'],
  phanthiet: ['G', 'G', 'E', 'E', 'E', 'E', 'E', 'E', 'G', 'F', 'G', 'G'],
  condao: ['G', 'G', 'E', 'E', 'E', 'F', 'F', 'G', 'G', 'G', 'G', 'G'],
  phuquoc: ['E', 'E', 'E', 'E', 'G', 'F', 'F', 'F', 'F', 'G', 'G', 'E'],
  saigon: ['E', 'E', 'E', 'E', 'F', 'F', 'G', 'F', 'F', 'G', 'G', 'E'],
  mekong: ['E', 'E', 'E', 'E', 'F', 'F', 'G', 'F', 'F', 'G', 'G', 'E'],
};

export const TEMP_RANGES: Record<string, number[][]> = {
  hanoi: [
    [14, 19], [15, 20], [18, 23], [22, 28], [25, 32], [27, 33],
    [28, 33], [28, 32], [26, 30], [22, 28], [18, 24], [15, 20],
  ],
  sapa: [
    [6, 13], [8, 14], [11, 17], [14, 19], [17, 22], [19, 24],
    [20, 24], [20, 23], [18, 21], [15, 19], [11, 16], [7, 13],
  ],
  maichau: [
    [13, 20], [15, 22], [19, 26], [23, 30], [25, 33], [27, 33],
    [27, 33], [27, 32], [25, 30], [22, 28], [18, 25], [14, 21],
  ],
  ninhbinh: [
    [14, 19], [15, 20], [18, 23], [22, 28], [25, 32], [27, 33],
    [28, 33], [28, 32], [26, 30], [22, 28], [18, 24], [15, 20],
  ],
  phongnha: [
    [18, 23], [19, 24], [22, 27], [25, 31], [28, 34], [29, 35],
    [29, 35], [28, 33], [25, 31], [23, 28], [21, 26], [18, 23],
  ],
  hue: [
    [17, 21], [18, 22], [21, 26], [24, 30], [27, 33], [29, 35],
    [30, 36], [30, 35], [27, 31], [24, 28], [21, 24], [18, 22],
  ],
  danang: [
    [19, 24], [20, 25], [22, 27], [25, 30], [28, 33], [29, 34],
    [29, 34], [29, 33], [27, 31], [25, 28], [22, 26], [20, 24],
  ],
  hoian: [
    [19, 24], [20, 25], [22, 27], [25, 30], [28, 33], [29, 34],
    [29, 34], [29, 33], [27, 31], [25, 28], [22, 26], [20, 24],
  ],
  nhatrang: [
    [22, 27], [23, 28], [25, 30], [27, 32], [29, 34], [29, 33],
    [28, 32], [28, 32], [27, 31], [26, 30], [24, 28], [22, 27],
  ],
  phanthiet: [
    [21, 28], [22, 29], [24, 31], [26, 33], [28, 34], [28, 33],
    [27, 32], [27, 32], [27, 31], [26, 30], [24, 29], [22, 28],
  ],
  condao: [
    [24, 29], [25, 30], [26, 31], [27, 32], [28, 33], [27, 31],
    [27, 30], [27, 30], [27, 30], [26, 30], [25, 29], [24, 29],
  ],
  phuquoc: [
    [22, 30], [23, 31], [25, 32], [26, 33], [27, 32], [26, 30],
    [26, 30], [26, 30], [26, 30], [26, 30], [25, 30], [23, 30],
  ],
  saigon: [
    [21, 33], [22, 34], [24, 35], [25, 35], [25, 33], [24, 31],
    [24, 31], [24, 31], [24, 31], [24, 31], [23, 31], [22, 32],
  ],
  mekong: [
    [20, 32], [21, 33], [23, 34], [24, 35], [24, 33], [23, 31],
    [23, 31], [23, 31], [23, 31], [23, 31], [22, 31], [21, 32],
  ],
};

/** Safe seasonal row — missing catalog ids fall back to all Good. */
export function getDefaultWeatherRow(id: string): string[] {
  return [...(DEFAULT_WEATHER[id] ?? Array(12).fill('G'))];
}

export function getTempRangesFor(id: string): number[][] {
  return TEMP_RANGES[id] ?? [];
}

export function getBestByFor(id: string): BestByEntry | undefined {
  return BEST_BY[id];
}
