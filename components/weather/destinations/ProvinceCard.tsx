'use client';

import { useRef } from 'react';
import type { WeatherDestinationMeta } from '@/lib/weather/types';
import { regionLabel } from '@/components/weather/weatherLabels';
import { useResolvedCover } from '@/components/weather/hooks/useResolvedCover';
import { prefetchDestinationWeather } from '@/components/weather/hooks/useDestinationWeather';
import DestinationCoverPlaceholder from '@/components/weather/destinations/DestinationCoverPlaceholder';
import StorageImage from '@/components/gallery/StorageImage';

const HOVER_PREFETCH_MS = 200;

type Props = {
  destination: WeatherDestinationMeta;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
};

export default function ProvinceCard({ destination, onSelect, onEdit }: Props) {
  const { coverUrl, coverThumbUrl } = useResolvedCover(destination);
  /** Prefer thumb so explore grid does not download full display assets. */
  const cover = coverThumbUrl || coverUrl;
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHoverPrefetch() {
    if (hoverTimerRef.current != null) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  function scheduleHoverPrefetch() {
    clearHoverPrefetch();
    hoverTimerRef.current = setTimeout(() => {
      hoverTimerRef.current = null;
      prefetchDestinationWeather(destination.id);
    }, HOVER_PREFETCH_MS);
  }

  return (
    <div className={`wg-province-card${!cover ? ' wg-province-card--no-cover' : ''}`}>
      <button
        type="button"
        className="wg-province-card-hit"
        onClick={() => onSelect(destination.id)}
        onPointerEnter={scheduleHoverPrefetch}
        onPointerLeave={clearHoverPrefetch}
        onFocus={() => prefetchDestinationWeather(destination.id)}
        aria-label={`Xem thời tiết ${destination.name}`}
      >
        {cover ? (
          <StorageImage
            src={cover}
            alt=""
            fill
            sizes="(max-width: 900px) 50vw, (max-width: 1100px) 33vw, 25vw"
            className="wg-province-card-bg"
            loading="lazy"
            unoptimized
          />
        ) : (
          <DestinationCoverPlaceholder name={destination.name} className="wg-province-card-bg" />
        )}
        <div className="wg-province-card-overlay" aria-hidden />
        <div className="wg-province-card-content">
          <span className="wg-province-card-region">{regionLabel(destination.region)}</span>
          <span className="wg-province-card-name">
            {destination.emoji ? `${destination.emoji} ` : ''}
            {destination.name}
          </span>
          <span className="wg-province-card-hint">
            {cover ? 'Nhấn để xem thời tiết' : 'Chưa có ảnh · nhấn để xem thời tiết'}
          </span>
        </div>
      </button>
      <button
        type="button"
        className="wg-province-edit"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(destination.id);
        }}
        aria-label={`Sửa ${destination.name}`}
        title="Sửa"
      >
        ✎
      </button>
    </div>
  );
}
