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
  url: string;
  url2: string;
  caption2: string;
  region: string;
  product: string;
  tags: string[];
};

export const EMPTY_GALLERY_PHOTO_FORM: GalleryPhotoForm = {
  caption: '',
  url: '',
  url2: '',
  caption2: '',
  region: 'north',
  product: '',
  tags: [],
};
