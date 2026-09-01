'use client';

import ProvinceCard from '@/components/weather/destinations/ProvinceCard';
import ProvinceGridSkeleton from '@/components/weather/destinations/ProvinceGridSkeleton';
import type { WeatherDestinationMeta } from '@/lib/weather/types';
import { useLanguage } from '@/hooks/useLanguage';

type Props = {
  destinations: WeatherDestinationMeta[];
  loading?: boolean;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
};

export default function ProvinceCardGrid({
  destinations,
  loading = false,
  onSelect,
  onEdit,
}: Props) {
  const { tp } = useLanguage();

  if (loading && !destinations.length) {
    return <ProvinceGridSkeleton count={8} />;
  }

  if (!destinations.length) {
    return (
      <div className="wg-empty-state">
        <p>{tp('weather', 'emptyExplore')}</p>
      </div>
    );
  }

  return (
    <div className="wg-province-grid">
      {destinations.map((d) => (
        <ProvinceCard key={d.id} destination={d} onSelect={onSelect} onEdit={onEdit} />
      ))}
    </div>
  );
}
