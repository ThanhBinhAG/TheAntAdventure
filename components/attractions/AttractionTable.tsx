'use client';

import type { Attraction } from '@/lib/types';
import AttractionRow from './AttractionRow';
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

export default function AttractionTable({
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
  const { tp, tpl } = useLanguage();
  const [rbg, rfg] = REG_COLORS[region] || ['#f5f5f5', '#333'];
  const regionKey = REGION_KEYS[region as keyof typeof REGION_KEYS];
  const regionLabel = regionKey ? tp('attractions', regionKey) : region;
  const emptyTitle = emptyHint ?? tp('attractions', 'emptyRegion');

  return (
    <div className="att-region-block">
      <div className="att-region-hd">
        <span className="att-region-badge" style={{ background: rbg, color: rfg }}>
          {regionLabel}
        </span>
        <div className="att-region-hd-actions">
          <span className="att-region-count">
            {tpl('attractions', 'attractionsCount', { count: attractions.length })}
          </span>
          {onAdd && (
            <button type="button" className="btn btn-s btn-sm att-region-add" onClick={onAdd}>
              {tp('attractions', 'add')}
            </button>
          )}
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
                <th className="att-th-name">{tp('attractions', 'colName')}</th>
                <th className="att-th-dest">{tp('attractions', 'colDest')}</th>
                <th className="att-th-type">{tp('attractions', 'colType')}</th>
                <th className="att-th-hours">{tp('attractions', 'colHours')}</th>
                <th className="att-th-closed">{tp('attractions', 'colClosed')}</th>
                <th className="att-th-admission">{tp('attractions', 'colAdmission')}</th>
                <th className="att-th-phone">{tp('attractions', 'colPhone')}</th>
                <th className="att-th-best">{tp('attractions', 'colBestTime')}</th>
                <th className="att-th-crowd">{tp('attractions', 'colCrowdTips')}</th>
                <th className="att-th-seasonal">{tp('attractions', 'colSeasonal')}</th>
                <th className="att-th-actions">{tp('attractions', 'colActions')}</th>
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
                  onEdit={onEdit ? () => onEdit(a) : undefined}
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
    </div>
  );
}
