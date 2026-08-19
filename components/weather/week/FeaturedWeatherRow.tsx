'use client';

import { useEffect } from 'react';
import MainWeatherCard from '@/components/weather/week/MainWeatherCard';
import FeaturedWeatherSkeleton from '@/components/weather/week/FeaturedWeatherSkeleton';
import { useDestinationWeather } from '@/components/weather/hooks/useDestinationWeather';
import type { WeatherDestinationMeta } from '@/lib/weather/types';

type Props = {
  destinations: WeatherDestinationMeta[];
  loading?: boolean;
  onOpenDetail: (id: string) => void;
  onEdit?: (id: string) => void;
  cacheVersion?: number;
};

function FeaturedSlot({
  meta,
  onOpenDetail,
  onEdit,
  cacheVersion = 0,
}: {
  meta: WeatherDestinationMeta;
  onOpenDetail: (id: string) => void;
  onEdit?: (id: string) => void;
  cacheVersion?: number;
}) {
  const { data, loading, error, refresh, reload } = useDestinationWeather(meta.id, {
    enabled: true,
  });

  useEffect(() => {
    if (cacheVersion > 0) void reload();
  }, [cacheVersion, reload]);

  return (
    <div className="wg-featured-card-wrap">
      <MainWeatherCard
        meta={meta}
        detail={data}
        loading={loading && !data}
        error={error}
        onOpenDetail={() => onOpenDetail(meta.id)}
        onRetry={() => void refresh()}
      />
      {onEdit && (
        <button
          type="button"
          className="wg-province-edit"
          onClick={() => onEdit(meta.id)}
          aria-label={`Sửa ${meta.name}`}
          title="Sửa"
        >
          ✎
        </button>
      )}
    </div>
  );
}

export default function FeaturedWeatherRow({
  destinations,
  loading = false,
  onOpenDetail,
  onEdit,
  cacheVersion = 0,
}: Props) {
  if (loading && !destinations.length) {
    return <FeaturedWeatherSkeleton count={2} />;
  }

  if (!destinations.length) {
    return (
      <div className="wg-empty-state">
        <p>Chưa có điểm đến nổi bật. Bấm “Chỉnh 2 điểm nổi bật” để chọn.</p>
      </div>
    );
  }

  return (
    <div className="wg-featured-row">
      {destinations.map((d) => (
        <FeaturedSlot
          key={d.id}
          meta={d}
          onOpenDetail={onOpenDetail}
          onEdit={onEdit}
          cacheVersion={cacheVersion}
        />
      ))}
    </div>
  );
}
