'use client';

const REGIONS = [
  { id: 'all', label: 'All' },
  { id: 'north', label: 'North' },
  { id: 'central', label: 'Central' },
  { id: 'south', label: 'South' },
] as const;

type Props = {
  value: string;
  onChange: (region: string) => void;
};

export default function WeatherRegionChips({ value, onChange }: Props) {
  return (
    <div className="wg-region-chips" role="group" aria-label="Filter by region">
      {REGIONS.map((r) => (
        <button
          key={r.id}
          type="button"
          className={`wg-chip${value === r.id ? ' on' : ''}`}
          onClick={() => onChange(r.id)}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
