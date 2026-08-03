'use client';

import type { Attraction } from '@/lib/types';
import AttractionCard from './AttractionCard';
import EmptyState from '@/components/EmptyState';

const REG_GROUPS: Record<string, string> = {
  north: '🏔 Northern Vietnam',
  central: '🏯 Central Vietnam',
  south: '🌿 Southern Vietnam',
};

const REG_COLORS: Record<string, [string, string]> = {
  north: ['#E8F5EE', '#1a5c38'],
  central: ['#FFF3CD', '#856404'],
  south: ['#E1F0FF', '#0c5464'],
};

import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';

type Props = {
  region: string;
  attractions: Attraction[];
  photos: GalleryPhoto[];
  expandedId: string | null;
  todayLabel: string;
  onToggle: (id: string) => void;
  onEdit: (attraction: Attraction) => void;
  onAdd: () => void;
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
  emptyHint = 'No attractions in this region yet.',
  onPhotoClick,
}: Props) {
  const [rbg, rfg] = REG_COLORS[region] || ['#f5f5f5', '#333'];

  return (
    <section className="att-region-column">
      <header className="att-region-hd">
        <span className="att-region-badge" style={{ background: rbg, color: rfg }}>
          {REG_GROUPS[region]}
        </span>
        <div className="att-region-hd-actions">
          <span className="att-region-count">{attractions.length}</span>
          <button type="button" className="btn btn-s btn-sm att-region-add" onClick={onAdd}>
            + Add
          </button>
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
              onEdit={() => onEdit(a)}
              onPhotoClick={(index) => onPhotoClick(a.id, index)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="crm-empty-state--flush"
          size="compact"
          variant="attractions"
          title={emptyHint.replace(/\.$/, '')}
          description="Add an attraction to this region, or clear filters if you expected matches."
          action={
            <button type="button" className="btn btn-s btn-sm" onClick={onAdd}>
              + Add Attraction
            </button>
          }
        />
      )}
    </section>
  );
}
