export const GALLERY_TAG_TAXONOMY = {
  REGION: [
    'Hanoi',
    'Ha Long Bay',
    'Ninh Binh',
    'Hue',
    'Hoi An',
    'Da Nang',
    'Ho Chi Minh City',
    'Mekong Delta',
    'Sapa',
    'Phu Quoc',
    'Can Tho',
    'Phong Nha',
  ],
  'TOUR TYPE': [
    'Cultural',
    'Adventure',
    'Culinary',
    'Luxury',
    'Family',
    'Honeymoon',
    'Community',
    'Off-the-beaten-path',
    'Wellness',
  ],
  SEASON: ['Dry Season (Nov–Apr)', 'Wet Season (May–Oct)', 'Tet Holiday', 'Peak Season', 'Shoulder Season'],
  OTHER: ['Guide Featured', 'Client Photo', 'Supplier Venue', 'Marketing Use OK', 'Drone Shot', 'Before & After'],
} as const;

export const ALL_GALLERY_TAXONOMY_TAGS = Object.values(GALLERY_TAG_TAXONOMY).flat();

export type GalleryPhotoForm = {
  caption: string;
  region: string;
  tags: string[];
  file?: File | null;
};

export const EMPTY_GALLERY_PHOTO_FORM: GalleryPhotoForm = {
  caption: '',
  region: 'north',
  tags: [],
  file: null,
};

export const PHOTO_LIBRARY_REGIONS = [
  { id: 'all', label: 'All' },
  { id: 'north', label: 'Northern Vietnam' },
  { id: 'central', label: 'Central Vietnam' },
  { id: 'south', label: 'Southern Vietnam' },
  { id: 'people', label: 'People & Culture' },
  { id: 'services', label: 'Services' },
] as const;
