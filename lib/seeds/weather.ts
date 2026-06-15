/* Auto-extracted weather data from index.html */

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const WR = {
  E:{label:'Excellent',icon:'🌞',bg:'#E8F5EE',fg:'#1a5c38',score:4},
  G:{label:'Good',icon:'🌤',bg:'#E3F2FD',fg:'#1565C0',score:3},
  F:{label:'Fair',icon:'⛅',bg:'#FEF3C7',fg:'#D97706',score:2},
  P:{label:'Poor',icon:'🌧',bg:'#FDECEA',fg:'#C0392B',score:1},
};

export const BEST_BY = {
  hanoi: {
    months: [9, 10], // Oct, Nov
    activity: 'Autumn Atmosphere & Street Photography',
    tooltips: {
      9: '🍂 Peak autumn in Hanoi — golden light, cool breezes, and the city at its most photogenic.',
      10: '🍂 November magic: crisp air, golden leaves, and legendary street food season in Hanoi.'
    }
  },
  sapa: {
    months: [8, 9], // Sep, Oct
    activity: 'Golden Rice Terrace Harvest',
    tooltips: {
      8: '🌾 September harvest: terraces turn luminous gold — the most iconic landscape in northern Vietnam.',
      9: '🌾 October ripens the rice — Sapa\'s terraces glow amber in the morning mist.'
    }
  },
  maichau: {
    months: [2, 3, 4], // Mar, Apr, May
    activity: 'Lush Greenery & Ethnic Festivals',
    tooltips: {
      2: '🌿 March blooms in Mai Chau — valley turns vivid green, White Thai festivals fill the villages.',
      3: '🌿 April brings ethnic harvest ceremonies and the valley at peak lush beauty.',
      4: '🌿 May in Mai Chau: cool highland air, green paddy fields, and authentic community life.'
    }
  },
  ninhbinh: {
    months: [4, 5], // May, Jun
    activity: 'Golden Rice Photography at Tam Coc',
    tooltips: {
      4: '📸 May: golden rice frames the limestone karsts of Tam Coc — the shot every travel photographer seeks.',
      5: '📸 June harvest light in Ninh Binh — boat through emerald waterways flanked by ripening rice.'
    }
  },
  phongnha: {
    months: [2, 3, 4], // Mar, Apr, May
    activity: 'Optimal Cave Exploration',
    tooltips: {
      2: '🦇 March: low river levels open inner chambers — the best conditions for Phong Nha cave diving.',
      3: '🦇 April caves at their clearest — dry season peak for Hang En and Son Doong expeditions.',
      4: '🦇 May: final prime window before summer rains — cave rivers at ideal levels for exploration.'
    }
  },
  hue: {
    months: [3], // Apr
    activity: 'Hue Festival & Imperial City Walks',
    tooltips: {
      3: '🏯 April in Hue: the biennial Hue Festival fills the citadel with lanterns, court music, and royal ceremony.'
    }
  },
  danang: {
    months: [1, 2, 3, 4], // Feb, Mar, Apr, May
    activity: 'Best Visibility for Snorkeling & Ba Na Hills',
    tooltips: {
      1: '🌊 February: crystalline sea visibility and Ba Na Hills above the clouds — a perfect coastal escape.',
      2: '🌊 March calm seas deliver the finest snorkeling conditions of the year around Da Nang.',
      3: '🌊 April: warm water, clear skies, and Ba Na Hills views stretching to the horizon.',
      4: '🌊 May closes the peak snorkeling window — visibility still superb before summer winds arrive.'
    }
  },
  hoian: {
    months: [1, 2, 3], // Feb, Mar, Apr
    activity: 'Lantern Festivals & Mild Walking Weather',
    tooltips: {
      1: '🏮 February lantern season peaks — the Full Moon festival transforms Hoi An into a river of light.',
      2: '🏮 March is Hoi An\'s sweet spot: cool mornings for walking, lanterns nightly, crowds still manageable.',
      3: '🏮 April: warm days, gentle evenings, and the ancient town in full bloom for walking and cycling.'
    }
  },
  nhatrang: {
    months: [1, 2, 3, 4], // Feb, Mar, Apr, May
    activity: 'Crystal Clear Water for Diving',
    tooltips: {
      1: '🤿 February marks the start of Nha Trang\'s finest dive season — visibility exceeds 20 metres.',
      2: '🤿 March: calm seas, warm water, and thriving reef life around Hon Mun Marine Reserve.',
      3: '🤿 April peak diving: optimal conditions for both beginners and advanced wreck divers.',
      4: '🤿 May closes the prime dive window — coral gardens still pristine before the monsoon shifts.'
    }
  },
  phanthiet: {
    months: [10, 11, 0, 1], // Nov, Dec, Jan, Feb
    activity: 'Kitesurfing & Sand Dune Photography',
    tooltips: {
      10: '🏄 November: Phan Thiet\'s famous trade winds arrive — kitesurfers from around the world converge.',
      11: '🏄 December offers the strongest consistent winds and red dune photography at golden hour.',
      0: '🏄 January peak season — the Mui Ne kite corridor at full power, dunes glowing at dawn.',
      1: '🏄 February: final weeks of prime kitesurfing conditions before the winds ease into spring.'
    }
  }
};

export const DESTINATIONS = [
  {id:'hanoi',    name:'Hanoi',          region:'north',   emoji:'🏛'},
  {id:'sapa',     name:'Sapa',           region:'north',   emoji:'⛰'},
  {id:'maichau',  name:'Mai Chau',       region:'north',   emoji:'🌾'},
  {id:'ninhbinh', name:'Ninh Binh',      region:'north',   emoji:'🛶'},
  {id:'phongnha', name:'Phong Nha',      region:'central', emoji:'🦇'},
  {id:'hue',      name:'Hue',            region:'central', emoji:'🏯'},
  {id:'danang',   name:'Da Nang',        region:'central', emoji:'🌉'},
  {id:'hoian',    name:'Hoi An',         region:'central', emoji:'🏮'},
  {id:'nhatrang', name:'Nha Trang',      region:'central', emoji:'🤿'},
  {id:'phanthiet',name:'Phan Thiet',     region:'south',   emoji:'🏄'},
  {id:'condao',   name:'Con Dao',        region:'south',   emoji:'🐢'},
  {id:'phuquoc',  name:'Phu Quoc',       region:'south',   emoji:'🏝'},
  {id:'saigon',   name:'Saigon (HCMC)',  region:'south',   emoji:'🌆'},
  {id:'mekong',   name:'Mekong Delta',   region:'south',   emoji:'🚣'},
];

export const DEFAULT_WEATHER = {
  hanoi:    ['G','G','G','G','F','F','G','G','G','E','E','G'],
  sapa:     ['F','F','G','G','F','F','G','G','F','E','G','F'],
  maichau:  ['G','G','G','E','F','F','G','G','G','E','E','G'],
  ninhbinh: ['G','G','G','E','F','G','G','G','G','E','E','G'],
  phongnha: ['G','G','G','E','E','E','E','P','P','P','P','G'],
  hue:      ['F','F','G','G','E','E','E','G','F','P','P','F'],
  danang:   ['F','G','G','E','E','E','E','E','F','P','P','F'],
  hoian:    ['F','G','G','E','E','E','E','E','F','P','P','F'],
  nhatrang: ['G','G','E','E','E','E','E','E','G','F','F','G'],
  phanthiet:['G','G','E','E','E','E','E','E','G','F','G','G'],
  condao:   ['G','G','E','E','E','F','F','G','G','G','G','G'],
  phuquoc:  ['E','E','E','E','G','F','F','F','F','G','G','E'],
  saigon:   ['E','E','E','E','F','F','G','F','F','G','G','E'],
  mekong:   ['E','E','E','E','F','F','G','F','F','G','G','E'],
};

export const TEMP_RANGES = {
  hanoi:    [[14,19],[15,20],[18,23],[22,28],[25,32],[27,33],[28,33],[28,32],[26,30],[22,28],[18,24],[15,20]],
  sapa:     [[6,13],[8,14],[11,17],[14,19],[17,22],[19,24],[20,24],[20,23],[18,21],[15,19],[11,16],[7,13]],
  maichau:  [[13,20],[15,22],[19,26],[23,30],[25,33],[27,33],[27,33],[27,32],[25,30],[22,28],[18,25],[14,21]],
  ninhbinh: [[14,19],[15,20],[18,23],[22,28],[25,32],[27,33],[28,33],[28,32],[26,30],[22,28],[18,24],[15,20]],
  phongnha: [[18,23],[19,24],[22,27],[25,31],[28,34],[29,35],[29,35],[28,33],[25,31],[23,28],[21,26],[18,23]],
  hue:      [[17,21],[18,22],[21,26],[24,30],[27,33],[29,35],[30,36],[30,35],[27,31],[24,28],[21,24],[18,22]],
  danang:   [[19,24],[20,25],[22,27],[25,30],[28,33],[29,34],[29,34],[29,33],[27,31],[25,28],[22,26],[20,24]],
  hoian:    [[19,24],[20,25],[22,27],[25,30],[28,33],[29,34],[29,34],[29,33],[27,31],[25,28],[22,26],[20,24]],
  nhatrang: [[22,27],[23,28],[25,30],[27,32],[29,34],[29,33],[28,32],[28,32],[27,31],[26,30],[24,28],[22,27]],
  phanthiet:[[21,28],[22,29],[24,31],[26,33],[28,34],[28,33],[27,32],[27,32],[27,31],[26,30],[24,29],[22,28]],
  condao:   [[24,29],[25,30],[26,31],[27,32],[28,33],[27,31],[27,30],[27,30],[27,30],[26,30],[25,29],[24,29]],
  phuquoc:  [[22,30],[23,31],[25,32],[26,33],[27,32],[26,30],[26,30],[26,30],[26,30],[26,30],[25,30],[23,30]],
  saigon:   [[21,33],[22,34],[24,35],[25,35],[25,33],[24,31],[24,31],[24,31],[24,31],[24,31],[23,31],[22,32]],
  mekong:   [[20,32],[21,33],[23,34],[24,35],[24,33],[23,31],[23,31],[23,31],[23,31],[23,31],[22,31],[21,32]],
};

