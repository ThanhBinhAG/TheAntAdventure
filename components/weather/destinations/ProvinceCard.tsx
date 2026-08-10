'use client';

import type { WeatherDestinationMeta } from '@/lib/weather/types';
import { regionLabel } from '@/components/weather/weatherLabels';
import { useResolvedCover } from '@/components/weather/hooks/useResolvedCover';
import DestinationCoverPlaceholder from '@/components/weather/destinations/DestinationCoverPlaceholder';

type Props = {
  destination: WeatherDestinationMeta;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
};

export default function ProvinceCard({ destination, onSelect, onEdit }: Props) {
  const { coverUrl, coverThumbUrl } = useResolvedCover(destination);
  const cover = coverUrl || coverThumbUrl;

  return (
    <div className={`wg-province-card${!cover ? ' wg-province-card--no-cover' : ''}`}>
      <button
        type="button"
        className="wg-province-card-hit"
        onClick={() => onSelect(destination.id)}
        aria-label={`Xem thời tiết ${destination.name}`}
      >
        {cover ? (
          <div
            className="wg-province-card-bg"
            style={{ backgroundImage: `url(${cover})` }}
            aria-hidden
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
