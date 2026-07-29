/* Photo library seeds — independent of products. Link via Product.photoIds / linkedPhotoIds. */

export const SEED_PHOTOS = [
  { id: 'PH-001', caption: 'Halong Bay at Dawn', region: 'north', tags: ['halong', 'cruise', 'sunrise', 'luxury'], url: 'https://picsum.photos/seed/ant-halong1/480/320' },
  { id: 'PH-001b', caption: 'Halong Bay Limestone Karst', region: 'north', tags: ['halong', 'karst', 'nature'], url: 'https://picsum.photos/seed/ant-halong2/480/320' },
  { id: 'PH-002', caption: 'Hoi An Lanterns at Night', region: 'central', tags: ['hoian', 'lanterns', 'night', 'culture'], url: 'https://picsum.photos/seed/ant-hoian1/480/320' },
  { id: 'PH-002b', caption: 'Hoi An Ancient Town', region: 'central', tags: ['hoian', 'oldtown', 'culture'], url: 'https://picsum.photos/seed/ant-hoian2/480/320' },
  { id: 'PH-003', caption: 'Mekong Delta Floating Market', region: 'south', tags: ['mekong', 'market', 'river', 'morning'], url: 'https://picsum.photos/seed/ant-mekong1/480/320' },
  { id: 'PH-003b', caption: 'Mekong River Life', region: 'south', tags: ['mekong', 'river', 'delta'], url: 'https://picsum.photos/seed/ant-mekong2/480/320' },
  { id: 'PH-004', caption: 'Sapa Rice Terraces', region: 'north', tags: ['sapa', 'terraces', 'trekking', 'hmong'], url: 'https://picsum.photos/seed/ant-sapa1/480/320' },
  { id: 'PH-004b', caption: 'Sapa Mountain Valley', region: 'north', tags: ['sapa', 'mountains', 'trekking'], url: 'https://picsum.photos/seed/ant-sapa2/480/320' },
  { id: 'PH-005', caption: 'Hue Imperial Citadel', region: 'central', tags: ['hue', 'citadel', 'history', 'royal'], url: 'https://picsum.photos/seed/ant-hue1/480/320' },
  { id: 'PH-005b', caption: 'Hue Royal Architecture', region: 'central', tags: ['hue', 'imperial', 'culture'], url: 'https://picsum.photos/seed/ant-hue2/480/320' },
  { id: 'PH-006', caption: 'Ha Giang Mountain Pass', region: 'north', tags: ['hagiang', 'mountains', 'adventure', 'motorbike'], url: 'https://picsum.photos/seed/ant-north1/480/320' },
  { id: 'PH-007', caption: 'Con Dao Sea Turtle', region: 'south', tags: ['condao', 'turtle', 'ocean', 'wildlife'], url: 'https://picsum.photos/seed/ant-south1/480/320' },
  { id: 'PH-008', caption: 'Phong Nha Cave Interior', region: 'central', tags: ['phongnha', 'cave', 'nature', 'expedition'], url: 'https://picsum.photos/seed/ant-central1/480/320' },
  { id: 'PH-009', caption: 'Old Quarter Hanoi Morning', region: 'north', tags: ['hanoi', 'oldquarter', 'street', 'breakfast'], url: 'https://picsum.photos/seed/ant-hanoi1/480/320' },
  { id: 'PH-009b', caption: 'Hanoi Street Food Market', region: 'north', tags: ['hanoi', 'food', 'culinary'], url: 'https://picsum.photos/seed/ant-hanoi2/480/320' },
  { id: 'PH-010', caption: 'Phu Quoc Sunset Beach', region: 'south', tags: ['phuquoc', 'beach', 'sunset', 'luxury'], url: 'https://picsum.photos/seed/ant-south2/480/320' },
  { id: 'PH-011', caption: 'Ethnic Minority Village', region: 'north', tags: ['culture', 'minority', 'village', 'authentic'], url: 'https://picsum.photos/seed/ant-maichau1/480/320' },
  { id: 'PH-012', caption: 'Vietnamese Family Kitchen', region: 'people', tags: ['food', 'family', 'cooking', 'culture'], url: 'https://picsum.photos/seed/ant-hanoi3/480/320' },
  { id: 'PH-013', caption: 'Sofitel Metropole Hanoi', region: 'north', tags: ['hanoi', 'history', 'luxury', 'cultural'], url: 'https://picsum.photos/seed/ant-hanoi1/480/320' },
  { id: 'PH-014', caption: 'HCMC Skyline at Dusk', region: 'south', tags: ['saigon', 'city', 'skyline'], url: 'https://picsum.photos/seed/ant-hcmc1/480/320' },
] as const;

/** Suggested product ↔ seed photo links for local/demo hydrate. */
export const SEED_PRODUCT_PHOTO_LINKS: Record<string, { photoIds: string[]; linkedPhotoIds: string[] }> = {
  'AA-NV-HAL-SEA-HD-01': { photoIds: ['PH-001', 'PH-001b'], linkedPhotoIds: ['PH-001', 'PH-001b'] },
  'AA-CV-HOI-HD-01': { photoIds: ['PH-002', 'PH-002b'], linkedPhotoIds: ['PH-002', 'PH-002b'] },
  'AA-SV-MKG-HD-01': { photoIds: ['PH-003', 'PH-003b'], linkedPhotoIds: ['PH-003', 'PH-003b'] },
  'AA-NV-SPA-HD-01': { photoIds: ['PH-004', 'PH-004b'], linkedPhotoIds: ['PH-004', 'PH-004b'] },
  'AA-CV-HUE-HD-01': { photoIds: ['PH-005', 'PH-005b'], linkedPhotoIds: ['PH-005', 'PH-005b'] },
  'AA-CV-PHN-DAY-FD-01': { photoIds: ['PH-008'], linkedPhotoIds: ['PH-008'] },
  'AA-NV-HAN-HD-02': { photoIds: ['PH-009', 'PH-009b'], linkedPhotoIds: ['PH-009', 'PH-009b'] },
  'AA-NV-HAN-HD-09': { photoIds: ['PH-011'], linkedPhotoIds: ['PH-011'] },
  'AA-NV-HAN-HD-29': { photoIds: ['PH-012'], linkedPhotoIds: ['PH-012'] },
  'AA-NV-HAN-HD-01': { photoIds: ['PH-013'], linkedPhotoIds: ['PH-013'] },
  'AA-SV-SGN-CT-FD-01': { photoIds: ['PH-014'], linkedPhotoIds: ['PH-014'] },
};
