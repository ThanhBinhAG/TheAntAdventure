'use client';

import type { ResolvedPhoto } from '@/lib/gallery/tour-photos';

interface Props {
  photos: ResolvedPhoto[];
  productCode?: string;
  height?: number;
  className?: string;
  showCaptions?: boolean;
}

/** Display-only photo stack for Tour Design (photos come from the product catalog). */
export default function PhotoStack({ photos, height = 105, className = '', showCaptions = false }: Props) {
  if (!photos.length) return null;

  return (
    <div className={`td-photo-stack ${className}`.trim()}>
      {photos.map((p, i) => (
        <div key={`${p.url}-${i}`} className="td-photo-stack-item" style={{ marginTop: i > 0 ? 5 : 0 }}>
          {/* Raw public-storage URLs cannot be safely passed to Next's optimizer. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.thumbUrl || p.url}
            alt={p.caption || 'Experience photo'}
            loading="lazy"
            style={{ width: '100%', height, objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {showCaptions && p.caption && <div className="td-photo-caption">{p.caption}</div>}
        </div>
      ))}
    </div>
  );
}
