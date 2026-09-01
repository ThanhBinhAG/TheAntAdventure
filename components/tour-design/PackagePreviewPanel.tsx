'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { resolvePackageDayPhotos } from '@/lib/gallery/tour-photos';
import { formatDayDateLabel } from '@/lib/tour-design/tour-itinerary';
import type { TourBrief, GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { TourPackage } from '@/lib/seeds/tourPackages';
import PhotoStack from '@/components/tour-design/PhotoStack';
import StorageImage from '@/components/gallery/StorageImage';

interface Props {
  pkg: TourPackage | null;
  brief: TourBrief;
  photos: GalleryPhoto[];
  onUsePackage: (pkg: TourPackage) => void;
  isSelected?: boolean;
  canWrite?: boolean;
}

export default function PackagePreviewPanel({ pkg, brief, photos, onUsePackage, isSelected = false, canWrite = true }: Props) {
  const { tp } = useLanguage();
  const heroPhoto = useMemo(() => {
    if (!pkg?.days?.length) return null;
    const day = pkg.days[0];
    return resolvePackageDayPhotos(day.title, pkg.tag, day.hotel, photos, 0, 1)[0] ?? null;
  }, [pkg, photos]);

  if (!pkg) {
    return (
      <div className="card td-pkg-preview-card">
        <div className="td-pkg-preview-empty">
          <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
          {tp('tour-design', 'pkgEmpty')}
        </div>
      </div>
    );
  }

  return (
    <div className="card td-pkg-preview-card">
      <div className="td-pkg-preview-body">
        {heroPhoto?.url && (
          <div className="td-pkg-hero" style={{ position: 'relative' }}>
            <StorageImage src={heroPhoto.thumbUrl || heroPhoto.url} alt={pkg.name} fill className="td-pkg-hero-img" />
            <div className="td-pkg-hero-overlay" />
            <div className="td-pkg-hero-text">
              <div className="td-pkg-hero-title">{pkg.name}</div>
            </div>
          </div>
        )}

        <div className="td-pkg-tagline">{pkg.tagline}</div>

        <div className="td-section-lbl">📅 {tp('tour-design', 'pkgDetailedProgramme')}</div>
        {pkg.days.map((d) => {
          const dayPhotos = resolvePackageDayPhotos(d.title, pkg.tag, d.hotel, photos, d.n, 2);
          const dayLabel = formatDayDateLabel(brief.startDate, brief.travelMonth, d.n);
          return (
            <div key={d.n} className="td-draft-day">
              <div className="td-draft-day-hd">
                <span className="td-day-badge">{dayLabel}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{d.title}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g)', marginBottom: 7, fontStyle: 'italic' }}>{d.sub}</div>
              <div className="td-draft-day-grid">
                <div>
                  <div style={{ fontSize: 12, lineHeight: 1.65, marginBottom: 7 }}>{d.body}</div>
                  <div style={{ fontSize: 11, color: 'var(--m)' }}>
                    🏨 {d.hotel} | {tp('tour-design', 'pkgMeals')} {d.meals}
                  </div>
                </div>
                <PhotoStack photos={dayPhotos} height={108} />
              </div>
            </div>
          );
        })}

        <div className="td-incl-excl-grid">
          <div className="td-incl-box">
            <div className="td-incl-title">✓ {tp('tour-design', 'pkgIncluded')}</div>
            {pkg.incl.map((i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>
                • {i}
              </div>
            ))}
          </div>
          <div className="td-excl-box">
            <div className="td-excl-title">✗ {tp('tour-design', 'pkgExcluded')}</div>
            {pkg.excl.map((i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>
                • {i}
              </div>
            ))}
          </div>
        </div>

        <div className="td-section-lbl">💵 {tp('tour-design', 'pkgSampleQuotation')}</div>
        <table className="tbl" style={{ fontSize: 11.5 }}>
          <thead>
            <tr>
              <th>{tp('tour-design', 'pkgColPax')}</th>
              <th style={{ textAlign: 'right' }}>{tp('tour-design', 'pkgColPeak')}</th>
              <th style={{ textAlign: 'right' }}>{tp('tour-design', 'pkgColOffSeason')}</th>
            </tr>
          </thead>
          <tbody>
            {pkg.pricing.map((r) => (
              <tr key={r.pax} style={r.pax === 4 ? { background: 'var(--gl)', fontWeight: 700 } : undefined}>
                <td>
                  {r.pax}{tp('tour-design', 'pkgPaxSuffix')}{r.pax === 4 ? ' ⭐' : ''}
                </td>
                <td style={{ textAlign: 'right', color: 'var(--g)' }}>${r.peak.toLocaleString()}/pp</td>
                <td style={{ textAlign: 'right' }}>${r.off.toLocaleString()}/pp</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="td-pkg-price-row">
          <div>
            <div style={{ fontSize: 11, color: 'var(--m)' }}>{tp('tour-design', 'pkgIndicativePrice')}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--g)' }}>{pkg.price4pax}</div>
          </div>
          <button className="btn btn-p" type="button" onClick={() => onUsePackage(pkg)} disabled={!canWrite}>
            {isSelected ? tp('tour-design', 'pkgSelected') : tp('tour-design', 'pkgUse')}
          </button>
        </div>
      </div>
    </div>
  );
}
