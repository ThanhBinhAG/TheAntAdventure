'use client';

import { useMemo } from 'react';
import { getDayPhotos } from '@/lib/tour-photos';
import { formatDayDateLabel } from '@/lib/tour-itinerary';
import type { TourBrief } from '@/lib/tour-design-types';
import type { TourPackage } from '@/lib/seeds/tourPackages';
import PhotoStack from '@/components/tourdesign/PhotoStack';

interface Props {
  pkg: TourPackage | null;
  brief: TourBrief;
  onUsePackage: (pkg: TourPackage) => void;
}

export default function PackagePreviewPanel({ pkg, brief, onUsePackage }: Props) {
  const heroUrl = useMemo(() => {
    if (!pkg?.days?.length) return '';
    return getDayPhotos(pkg.days[0].title, pkg.tag, pkg.days[0].hotel, 0, 1)[0];
  }, [pkg]);

  if (!pkg) {
    return (
      <div className="card td-pkg-preview-card">
        <div className="td-pkg-preview-empty">
          <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
          Select a tour package on the left to preview the full itinerary here.
        </div>
      </div>
    );
  }

  return (
    <div className="card td-pkg-preview-card">
      <div className="td-pkg-preview-body">
        {heroUrl && (
          <div className="td-pkg-hero">
            <img src={heroUrl} alt={pkg.name} loading="lazy" />
            <div className="td-pkg-hero-overlay" />
            <div className="td-pkg-hero-text">
              <div className="td-pkg-hero-title">{pkg.name}</div>
            </div>
          </div>
        )}

        <div className="td-pkg-tagline">{pkg.tagline}</div>

        <div className="td-section-lbl">📅 Detailed Programme</div>
        {pkg.days.map((d) => {
          const dayPhotos = getDayPhotos(d.title, pkg.tag, d.hotel, d.n, 2).map((url) => ({ url }));
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
                    🏨 {d.hotel} | Meals: {d.meals}
                  </div>
                </div>
                <PhotoStack photos={dayPhotos} height={108} />
              </div>
            </div>
          );
        })}

        <div className="td-incl-excl-grid">
          <div className="td-incl-box">
            <div className="td-incl-title">✓ Included</div>
            {pkg.incl.map((i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>
                • {i}
              </div>
            ))}
          </div>
          <div className="td-excl-box">
            <div className="td-excl-title">✗ Excluded</div>
            {pkg.excl.map((i) => (
              <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>
                • {i}
              </div>
            ))}
          </div>
        </div>

        <div className="td-section-lbl">💵 Sample Quotation — Premium Boutique 4★</div>
        <table className="tbl" style={{ fontSize: 11.5 }}>
          <thead>
            <tr>
              <th>Pax</th>
              <th style={{ textAlign: 'right' }}>Peak (Oct–Mar)</th>
              <th style={{ textAlign: 'right' }}>Off-Season (Apr–Sep)</th>
            </tr>
          </thead>
          <tbody>
            {pkg.pricing.map((r) => (
              <tr key={r.pax} style={r.pax === 4 ? { background: 'var(--gl)', fontWeight: 700 } : undefined}>
                <td>
                  {r.pax} pax{r.pax === 4 ? ' ⭐' : ''}
                </td>
                <td style={{ textAlign: 'right', color: 'var(--g)' }}>${r.peak.toLocaleString()}/pp</td>
                <td style={{ textAlign: 'right' }}>${r.off.toLocaleString()}/pp</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontSize: 10.5, color: 'var(--m)', marginTop: 8 }}>
          Peak season (Oct–Mar) +20% · Off-season (Apr–Sep) −10%
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button className="btn btn-p" type="button" style={{ width: '100%' }} onClick={() => onUsePackage(pkg)}>
            ✓ Use This Package
          </button>
        </div>
      </div>
    </div>
  );
}
