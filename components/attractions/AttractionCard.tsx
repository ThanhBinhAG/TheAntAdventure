'use client';

import type { Attraction } from '@/lib/types';
import {
  ATTRACTION_TYPE_LABELS,
  formatHoursCompact,
  galleryUrlForAttraction,
  getAttractionHighlight,
  getNonDuplicateAlert,
  photosForAttraction,
} from '@/lib/attractions-helpers';
import type { GalleryPhoto } from '@/lib/tour-design-types';
import AttractionExpandPanel from './AttractionExpandPanel';

type Props = {
  attraction: Attraction;
  expanded: boolean;
  todayLabel: string;
  photos: GalleryPhoto[];
  onToggle: () => void;
  onEdit: () => void;
  onPhotoClick: (index: number) => void;
};

export default function AttractionCard({
  attraction,
  expanded,
  todayLabel,
  photos,
  onToggle,
  onEdit,
  onPhotoClick,
}: Props) {
  const highlight = getAttractionHighlight(attraction, todayLabel);
  const alert = getNonDuplicateAlert(attraction.alert, attraction.closed);
  const hourLines = formatHoursCompact(attraction.hours);
  const linkedPhotos = photosForAttraction(photos, attraction);
  const phoneDigits = attraction.phone?.replace(/[^\d+]/g, '');

  return (
    <article
      className={`att-card${highlight === 'closed-today' ? ' att-card-closed-today' : ''}${
        highlight === 'warning' ? ' att-card-warning' : ''
      }${expanded ? ' att-card-expanded' : ''}`}
    >
      <div className="att-card-main" onClick={onToggle} role="button" tabIndex={0}>
        <div className="att-card-top">
          <span className={`att-type-pill att-type-${attraction.type}`}>
            {ATTRACTION_TYPE_LABELS[attraction.type] || attraction.type}
          </span>
          <div className="att-card-top-actions">
            {highlight === 'closed-today' && <span className="att-status-pill att-status-closed">Closed today</span>}
            {highlight === 'warning' && !alert && <span className="att-status-pill att-status-warn">Heads up</span>}
            <button
              type="button"
              className="btn btn-s btn-sm att-card-edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              Edit
            </button>
          </div>
        </div>

        <h3 className="att-card-name">{attraction.name}</h3>
        <div className="att-card-dest">📍 {attraction.dest}</div>

        {alert && <div className="att-card-alert">⚠ {alert}</div>}

        <div className="att-card-facts">
          <div className="att-fact">
            <span className="att-fact-label">Hours</span>
            <span className="att-fact-value">
              {hourLines.map((line) => (
                <span key={line} className="att-fact-line">
                  {line}
                </span>
              ))}
            </span>
          </div>
          <div className="att-fact">
            <span className="att-fact-label">Closed</span>
            <span className="att-fact-value att-fact-closed">{attraction.closed || '—'}</span>
          </div>
          <div className="att-fact">
            <span className="att-fact-label">Admission</span>
            <span className="att-fact-value">{attraction.admission || '—'}</span>
          </div>
          <div className="att-fact">
            <span className="att-fact-label">Phone</span>
            <span className="att-fact-value">
              {phoneDigits ? (
                <a href={`tel:${phoneDigits}`} className="att-phone-link" onClick={(e) => e.stopPropagation()}>
                  {attraction.phone}
                </a>
              ) : (
                '—'
              )}
            </span>
          </div>
        </div>

        {(attraction.best_time || attraction.crowd) && (
          <div className="att-card-extra">
            {attraction.best_time && <span>Best: {attraction.best_time}</span>}
            {attraction.crowd && <span>Crowd: {attraction.crowd}</span>}
          </div>
        )}

        <div className="att-card-footer">
          <span className={`att-chevron${expanded ? ' open' : ''}`}>▸</span>
          <span>{expanded ? 'Hide details' : 'View details'}</span>
        </div>
      </div>

      {expanded && (
        <div className="att-card-expand">
          <AttractionExpandPanel
            attraction={attraction}
            photos={linkedPhotos}
            onPhotoClick={onPhotoClick}
            onEdit={onEdit}
            galleryHref={galleryUrlForAttraction(attraction.id, attraction.name)}
          />
        </div>
      )}
    </article>
  );
}
