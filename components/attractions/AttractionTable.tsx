'use client';

import type { Attraction } from '@/lib/types';
import AttractionRow from './AttractionRow';
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

export default function AttractionTable({
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
    <div className="att-region-block">
      <div className="att-region-hd">
        <span className="att-region-badge" style={{ background: rbg, color: rfg }}>
          {REG_GROUPS[region]}
        </span>
        <div className="att-region-hd-actions">
          <span className="att-region-count">{attractions.length} attractions</span>
          <button type="button" className="btn btn-s btn-sm att-region-add" onClick={onAdd}>
            + Add
          </button>
        </div>
      </div>
      {attractions.length ? (
      <div className="card att-table-card">
        <div className="card-body att-table-wrap">
          <table className="tbl att-table">
            <colgroup>
              <col className="att-w-chevron" />
              <col className="att-w-name" />
              <col className="att-w-dest" />
              <col className="att-w-type" />
              <col className="att-w-hours" />
              <col className="att-w-closed" />
              <col className="att-w-admission" />
              <col className="att-w-phone" />
              <col className="att-w-best" />
              <col className="att-w-crowd" />
              <col className="att-w-seasonal" />
              <col className="att-w-actions" />
            </colgroup>
            <thead>
              <tr>
                <th className="att-col-chevron" />
                <th className="att-th-name">Name</th>
                <th className="att-th-dest">Dest.</th>
                <th className="att-th-type">Type</th>
                <th className="att-th-hours">Hours</th>
                <th className="att-th-closed">Closed</th>
                <th className="att-th-admission">Admission</th>
                <th className="att-th-phone">Phone</th>
                <th className="att-th-best">Best Time</th>
                <th className="att-th-crowd">Crowd Tips</th>
                <th className="att-th-seasonal">Seasonal</th>
                <th className="att-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attractions.map((a, index) => (
                <AttractionRow
                  key={a.id}
                  attraction={a}
                  striped={index % 2 === 1}
                  expanded={expandedId === a.id}
                  todayLabel={todayLabel}
                  photos={photos}
                  onToggle={() => onToggle(a.id)}
                  onEdit={() => onEdit(a)}
                  onPhotoClick={(index) => onPhotoClick(a.id, index)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <EmptyState
          className="crm-empty-state--flush att-region-empty-table"
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
    </div>
  );
}
