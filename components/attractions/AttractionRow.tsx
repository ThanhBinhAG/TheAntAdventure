'use client';

import type { Attraction } from '@/lib/types';
import {
  ATTRACTION_TYPE_LABELS,
  formatHoursCompact,
  galleryUrlForAttraction,
  getAttractionHighlight,
  getNonDuplicateAlert,
  photosForAttraction,
} from '@/lib/attractions/attractions-helpers';
import AttractionExpandPanel from './AttractionExpandPanel';

import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';

type Props = {
  attraction: Attraction;
  expanded: boolean;
  striped?: boolean;
  todayLabel: string;
  photos: GalleryPhoto[];
  onToggle: () => void;
  onEdit?: () => void;
  onPhotoClick: (index: number) => void;
};

function CellText({
  text,
  title,
  wrap = false,
}: {
  text: string;
  title?: string;
  wrap?: boolean;
}) {
  const label = text?.trim() || '—';
  return (
    <span
      className={`att-cell-text${wrap ? ' att-cell-wrap' : ' att-cell-clip'}`}
      title={title || (label !== '—' ? label : undefined)}
    >
      {label}
    </span>
  );
}

export default function AttractionRow({
  attraction,
  expanded,
  striped = false,
  todayLabel,
  photos,
  onToggle,
  onEdit,
  onPhotoClick,
}: Props) {
  const highlight = getAttractionHighlight(attraction, todayLabel);
  const alert = getNonDuplicateAlert(attraction.alert, attraction.closed);
  const hoursText = formatHoursCompact(attraction.hours).join(' · ');
  const linkedPhotos = photosForAttraction(photos, attraction);
  const phoneDigits = attraction.phone?.replace(/[^\d+]/g, '');

  return (
    <>
      <tr
        className={`att-row${striped ? ' att-row-striped' : ''}${expanded ? ' att-row-expanded' : ''}${
          highlight === 'closed-today' ? ' att-row-closed-today' : ''
        }${highlight === 'warning' ? ' att-row-warning' : ''}`}
        onClick={onToggle}
      >
        <td className="att-col-chevron">
          <span className={`att-chevron${expanded ? ' open' : ''}`}>▸</span>
        </td>
        <td className="att-col-name">
          <div className="att-name-wrap">
            <span className="att-name-text" title={attraction.name}>
              {attraction.name}
            </span>
            {alert && (
              <span className="att-alert-chip" title={alert}>
                ⚠
              </span>
            )}
          </div>
        </td>
        <td className="att-col-dest">
          <CellText text={attraction.dest} title={attraction.dest} />
        </td>
        <td className="att-col-type">
          <span className={`att-type-pill att-type-${attraction.type}`}>
            {ATTRACTION_TYPE_LABELS[attraction.type] || attraction.type}
          </span>
        </td>
        <td className="att-col-hours">
          <CellText text={hoursText} title={attraction.hours} wrap />
        </td>
        <td className="att-col-closed">
          <CellText text={attraction.closed} title={attraction.closed} wrap />
        </td>
        <td className="att-col-admission">
          <CellText text={attraction.admission} title={attraction.admission} wrap />
        </td>
        <td className="att-col-phone" onClick={(e) => e.stopPropagation()}>
          {phoneDigits ? (
            <a
              href={`tel:${phoneDigits}`}
              className="att-phone-link att-cell-text att-cell-clip"
              title={attraction.phone}
            >
              {attraction.phone}
            </a>
          ) : (
            <CellText text="—" />
          )}
        </td>
        <td className="att-col-best">
          <CellText text={attraction.best_time} title={attraction.best_time} wrap />
        </td>
        <td className="att-col-crowd">
          <CellText text={attraction.crowd} title={attraction.crowd} wrap />
        </td>
        <td className="att-col-seasonal">
          <CellText text={attraction.seasonal} title={attraction.seasonal} wrap />
        </td>
        <td className="att-col-actions" onClick={(e) => e.stopPropagation()}>
          {onEdit && (
            <button type="button" className="btn btn-s btn-sm att-row-edit" onClick={onEdit}>
              Edit
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="att-expand-row">
          <td colSpan={12}>
            <AttractionExpandPanel
              attraction={attraction}
              photos={linkedPhotos}
              onPhotoClick={onPhotoClick}
              onEdit={onEdit}
              galleryHref={galleryUrlForAttraction(attraction.id, attraction.name)}
            />
          </td>
        </tr>
      )}
    </>
  );
}
