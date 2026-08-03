'use client';

import type { WeatherDestinationCoord } from '@/lib/weather/coordinates';
import { getDefaultWeatherRow } from '@/lib/seeds/weather';
import { REG_COLORS_HEX } from '@/lib/core/page-helpers';
import { wrStyle } from '@/components/weather/weatherUiHelpers';
import EmptyState from '@/components/EmptyState';
import type { WeatherData } from '@/components/weather/WeatherSeasonalPanel';

type Props = {
  destinations: WeatherDestinationCoord[];
  weatherData: WeatherData;
  query: string;
  onClearQuery: () => void;
};

export default function WeatherRegionPanel({
  destinations,
  weatherData,
  query,
  onClearQuery,
}: Props) {
  if (query.trim() && !destinations.length) {
    return (
      <EmptyState
        className="crm-empty-state--flush crm-empty-state--inline"
        size="compact"
        variant="weather"
        title={`No destinations match “${query.trim()}”`}
        description="Clear the search or try another region to see destinations."
        action={
          <button type="button" className="btn btn-s btn-sm" onClick={onClearQuery}>
            Clear search
          </button>
        }
      />
    );
  }

  return (
    <div className="wg-region">
      <p className="wg-section-label">Compare destinations by region · year overview</p>
      <div className="wg-region-grid">
        {(['north', 'central', 'south'] as const).map((reg) => {
          const [rbg, rfg] = REG_COLORS_HEX[reg];
          const regDests = destinations.filter((d) => d.region === reg);
          if (!regDests.length) return null;
          return (
            <section key={reg} className="wg-region-card">
              <div className="wg-region-hd" style={{ background: rbg, color: rfg }}>
                <span>{reg} Vietnam</span>
                <span className="wg-region-count">{regDests.length}</span>
              </div>
              <div className="wg-region-body">
                {regDests.map((d) => {
                  const row = weatherData[d.id] || getDefaultWeatherRow(d.id);
                  const excellent = row.filter((c) => c === 'E').length;
                  const good = row.filter((c) => c === 'G').length;
                  return (
                    <div key={d.id} className="wg-region-row">
                      <span className="wg-region-name">{d.name}</span>
                      <div className="wg-region-bars" aria-hidden>
                        {row.map((c, i) => (
                          <span
                            key={i}
                            className="wg-region-dot"
                            style={{ background: wrStyle(c).fg, opacity: 0.85 }}
                            title={`${c}`}
                          />
                        ))}
                      </div>
                      <span className="wg-region-stats">
                        {excellent}E · {good}G
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
