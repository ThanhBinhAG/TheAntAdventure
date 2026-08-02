'use client';

import { WEATHER_DESTINATIONS, type WeatherDestinationCoord } from '@/lib/weather/coordinates';
import { MONTHS, getBestByFor } from '@/lib/seeds/weather';
import { REG_COLORS_HEX } from '@/lib/core/page-helpers';
import { matchesFoldedQuery } from '@/lib/gallery/fold-search';
import EmptyState from '@/components/EmptyState';

type Props = {
  query: string;
  onClearQuery: () => void;
};

function peakDestsForMonth(mi: number, query: string): WeatherDestinationCoord[] {
  return WEATHER_DESTINATIONS.filter((d) => {
    const bb = getBestByFor(d.id);
    if (!bb || !bb.months.includes(mi)) return false;
    if (!query.trim()) return true;
    return matchesFoldedQuery(`${d.name} ${d.id} ${d.region}`, query);
  });
}

export default function WeatherBestTimePanel({ query, onClearQuery }: Props) {
  const anyMatch =
    !query.trim() ||
    WEATHER_DESTINATIONS.some((d) => {
      const bb = getBestByFor(d.id);
      return (
        Boolean(bb?.months.length) && matchesFoldedQuery(`${d.name} ${d.id} ${d.region}`, query)
      );
    });

  if (query.trim() && !anyMatch) {
    return (
      <EmptyState
        className="crm-empty-state--flush crm-empty-state--inline"
        size="compact"
        variant="weather"
        title={`No destinations match “${query.trim()}”`}
        description="Clear the search to see peak months for all destinations."
        action={
          <button type="button" className="btn btn-s btn-sm" onClick={onClearQuery}>
            Clear search
          </button>
        }
      />
    );
  }

  return (
    <div className="wg-best">
      <p className="wg-section-label">Best months to visit · peak destinations by season</p>
      <div className="wg-month-grid">
        {MONTHS.map((m, mi) => {
          const bestDests = peakDestsForMonth(mi, query);
          if (query.trim() && !bestDests.length) return null;
          return (
            <section key={m} className="wg-month-card">
              <div className="wg-month-hd">
                <span>{m}</span>
                {bestDests.length > 0 && (
                  <span className="wg-month-hd-count">{bestDests.length}</span>
                )}
              </div>
              <div className="wg-month-body">
                {bestDests.length ? (
                  bestDests.map((d) => {
                    const bb = getBestByFor(d.id)!;
                    const [rbg, rfg] = REG_COLORS_HEX[d.region] ?? ['#E8F5EE', '#1a5c38'];
                    const tip = bb.tooltips?.[mi];
                    return (
                      <div key={d.id} className="wg-month-chip" title={tip || bb.activity}>
                        <div className="wg-month-chip-hd">
                          <b>{d.name}</b>
                          <span className="wg-dest-region" style={{ background: rbg, color: rfg }}>
                            {d.region}
                          </span>
                        </div>
                        <div className="wg-month-chip-activity">{bb.activity}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="wg-muted">Shoulder season — check Seasonal for ratings.</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
