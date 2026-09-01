'use client';

import { useEffect } from 'react';
import MainWeatherCard from '@/components/weather/week/MainWeatherCard';
import FeaturedWeatherSkeleton from '@/components/weather/week/FeaturedWeatherSkeleton';
import { useDestinationWeather } from '@/components/weather/hooks/useDestinationWeather';
import type { WeatherDestinationMeta } from '@/lib/weather/types';
import { useLanguage } from '@/hooks/useLanguage';

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
  const { tp, tpl } = useLanguage();
  const { data, loading, error, reload } = useDestinationWeather(meta.id, {
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
        onRetry={() => void reload()}
      />
      {onEdit && (
        <button
          type="button"
          className="wg-province-edit"
          onClick={() => onEdit(meta.id)}
          aria-label={tpl('weather', 'editAria', { name: meta.name })}
          title={tp('weather', 'editTitle')}
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
  const { tp } = useLanguage();

  if (loading && !destinations.length) {
    return <FeaturedWeatherSkeleton count={2} />;
  }

  if (!destinations.length) {
    return (
      <div className="wg-empty-state">
        <p>{tp('weather', 'emptyFeatured')}</p>
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
