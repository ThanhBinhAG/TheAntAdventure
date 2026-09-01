'use client';

import type { Attraction } from '@/lib/types';
import AttractionCard from './AttractionCard';
import EmptyState from '@/components/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';

const REG_COLORS: Record<string, [string, string]> = {
  north: ['#E8F5EE', '#1a5c38'],
  central: ['#FFF3CD', '#856404'],
  south: ['#E1F0FF', '#0c5464'],
};

const REGION_KEYS = {
  north: 'regionNorth',
  central: 'regionCentral',
  south: 'regionSouth',
} as const;

import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';

type Props = {
  region: string;
  attractions: Attraction[];
  photos: GalleryPhoto[];
  expandedId: string | null;
  todayLabel: string;
  onToggle: (id: string) => void;
  onEdit?: (attraction: Attraction) => void;
  onAdd?: () => void;
  emptyHint?: string;
  onPhotoClick: (attractionId: string, index: number) => void;
};

export default function AttractionRegionColumn({
  region,
  attractions,
  photos,
  expandedId,
  todayLabel,
  onToggle,
  onEdit,
  onAdd,
  emptyHint,
  onPhotoClick,
}: Props) {
  const { tp } = useLanguage();
  const [rbg, rfg] = REG_COLORS[region] || ['#f5f5f5', '#333'];
  const regionKey = REGION_KEYS[region as keyof typeof REGION_KEYS];
  const regionLabel = regionKey ? tp('attractions', regionKey) : region;
  const emptyTitle = emptyHint ?? tp('attractions', 'emptyRegion');

  return (
    <section className="att-region-column">
      <header className="att-region-hd">
        <span className="att-region-badge" style={{ background: rbg, color: rfg }}>
          {regionLabel}
        </span>
        <div className="att-region-hd-actions">
          <span className="att-region-count">{attractions.length}</span>
          {onAdd && (
            <button type="button" className="btn btn-s btn-sm att-region-add" onClick={onAdd}>
              {tp('attractions', 'add')}
            </button>
          )}
        </div>
      </header>
      {attractions.length ? (
        <div className="att-card-grid">
          {attractions.map((a) => (
            <AttractionCard
              key={a.id}
              attraction={a}
              expanded={expandedId === a.id}
              todayLabel={todayLabel}
              photos={photos}
              onToggle={() => onToggle(a.id)}
              onEdit={onEdit ? () => onEdit(a) : undefined}
              onPhotoClick={(index) => onPhotoClick(a.id, index)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="crm-empty-state--flush"
          size="compact"
          variant="attractions"
          title={emptyTitle.replace(/\.$/, '')}
          description={tp('attractions', 'emptyDesc')}
          action={
            onAdd && (
              <button type="button" className="btn btn-s btn-sm" onClick={onAdd}>
                {tp('attractions', 'addAttraction')}
              </button>
            )
          }
        />
      )}
    </section>
  );
}
