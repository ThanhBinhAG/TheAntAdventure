'use client';

import { GALLERY_TAG_TAXONOMY } from '@/lib/gallery/gallery-tags';
import { useLanguage } from '@/hooks/useLanguage';
import type { GALLERYKey } from '@/lib/i18n/pages/gallery';

interface Props {
  selected: string[];
  onChange: (tags: string[]) => void;
  customTag: string;
  onCustomTagChange: (value: string) => void;
  onAddCustomTag: () => void;
}

const CAT_KEYS: Record<string, GALLERYKey> = {
  REGION: 'tagCatRegion',
  'TOUR TYPE': 'tagCatTourType',
  SEASON: 'tagCatSeason',
  OTHER: 'tagCatOther',
};

const TAG_KEYS: Record<string, GALLERYKey> = {
  Hanoi: 'tagHanoi',
  'Ha Long Bay': 'tagHaLongBay',
  'Ninh Binh': 'tagNinhBinh',
  Hue: 'tagHue',
  'Hoi An': 'tagHoiAn',
  'Da Nang': 'tagDaNang',
  'Ho Chi Minh City': 'tagHoChiMinhCity',
  'Mekong Delta': 'tagMekongDelta',
  Sapa: 'tagSapa',
  'Phu Quoc': 'tagPhuQuoc',
  'Can Tho': 'tagCanTho',
  'Phong Nha': 'tagPhongNha',
  Cultural: 'tagCultural',
  Adventure: 'tagAdventure',
  Culinary: 'tagCulinary',
  Luxury: 'tagLuxury',
  Family: 'tagFamily',
  Honeymoon: 'tagHoneymoon',
  Community: 'tagCommunity',
  'Off-the-beaten-path': 'tagOffTheBeatenPath',
  Wellness: 'tagWellness',
  'Dry Season (Nov–Apr)': 'tagDrySeason',
  'Wet Season (May–Oct)': 'tagWetSeason',
  'Tet Holiday': 'tagTetHoliday',
  'Peak Season': 'tagPeakSeason',
  'Shoulder Season': 'tagShoulderSeason',
  'Guide Featured': 'tagGuideFeatured',
  'Client Photo': 'tagClientPhoto',
  'Supplier Venue': 'tagSupplierVenue',
  'Marketing Use OK': 'tagMarketingUseOk',
  'Drone Shot': 'tagDroneShot',
  'Before & After': 'tagBeforeAfter',
};

export default function GalleryTagSelector({ selected, onChange, customTag, onCustomTagChange, onAddCustomTag }: Props) {
  const { tp, tpl } = useLanguage();

  function toggle(tag: string) {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  }

  function tagLabel(tag: string) {
    const key = TAG_KEYS[tag];
    return key ? tp('gallery', key) : tag;
  }

  return (
    <div>
      <div className="gallery-tag-selector">
        {Object.entries(GALLERY_TAG_TAXONOMY).map(([cat, tags]) => (
          <div key={cat} className="gallery-tag-category">
            <div className="gallery-tag-category-lbl">{tp('gallery', CAT_KEYS[cat] ?? 'tagCatOther')}</div>
            <div className="gallery-tag-pills">
              {tags.map((tag) => {
                const on = selected.includes(tag);
                return (
                  <button key={tag} type="button" className={`gallery-tag-pill${on ? ' on' : ''}`} onClick={() => toggle(tag)}>
                    {tagLabel(tag)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="gallery-custom-tag-row">
        <input
          value={customTag}
          onChange={(e) => onCustomTagChange(e.target.value)}
          placeholder={tp('gallery', 'addCustomTagPlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddCustomTag();
            }
          }}
        />
        <button type="button" className="btn btn-s btn-sm" onClick={onAddCustomTag}>
          {tp('gallery', 'addTag')}
        </button>
      </div>
      {selected.length > 0 && (
        <div className="gallery-selected-tags">
          {selected.map((t) => (
            <span key={t} className="gallery-tag gallery-tag-removable">
              {tagLabel(t) !== t ? tagLabel(t) : t}
              <button type="button" aria-label={tpl('gallery', 'removeTagAria', { tag: t })} onClick={() => toggle(t)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 4 }}>{tp('gallery', 'tagsHelp')}</div>
    </div>
  );
}
