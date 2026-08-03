'use client';

import type { WeatherDestinationCoord } from '@/lib/weather/coordinates';
import { MONTHS, getBestByFor, getDefaultWeatherRow, getTempRangesFor, type WeatherRatingCode } from '@/lib/seeds/weather';
import { REG_COLORS_HEX } from '@/lib/core/page-helpers';
import { wrStyle } from '@/components/weather/weatherUiHelpers';
import EmptyState from '@/components/EmptyState';

export type WeatherData = Record<string, string[]>;

type Props = {
  destinations: WeatherDestinationCoord[];
  weatherData: WeatherData;
  query: string;
  onClearQuery: () => void;
  onEditCell: (destId: string, monthIdx: number, currentCode: string) => void;
};

export default function WeatherSeasonalPanel({
  destinations,
  weatherData,
  query,
  onClearQuery,
  onEditCell,
}: Props) {
  if (!destinations.length) {
    return (
      <EmptyState
        className="crm-empty-state--flush"
        size="compact"
        variant="weather"
        title={query.trim() ? `No destinations match “${query.trim()}”` : 'No destinations'}
        description="Clear the search or try another region to see destinations."
        action={
          query.trim() ? (
            <button type="button" className="btn btn-s btn-sm" onClick={onClearQuery}>
              Clear search
            </button>
          ) : undefined
        }
      />
    );
  }

  const regions = (['north', 'central', 'south'] as const).filter((reg) =>
    destinations.some((d) => d.region === reg)
  );

  return (
    <div className="wg-seasonal">
      <p className="wg-section-label">Year-round travel ratings · click a month to edit</p>
      {regions.map((reg) => {
        const group = destinations.filter((d) => d.region === reg);
        const [rbg, rfg] = REG_COLORS_HEX[reg] ?? ['#E8F5EE', '#1a5c38'];
        return (
          <section key={reg} className="wg-seasonal-group">
            <h2 className="wg-seasonal-group-title" style={{ color: rfg }}>
              <span className="wg-seasonal-group-dot" style={{ background: rbg }} />
              {reg} Vietnam
            </h2>
            <div className="wg-seasonal-list">
              {group.map((d) => {
                const row = weatherData[d.id] || getDefaultWeatherRow(d.id);
                const temps = getTempRangesFor(d.id);
                const bb = getBestByFor(d.id);
                const [db, df] = REG_COLORS_HEX[d.region] ?? ['#E8F5EE', '#1a5c38'];

                return (
                  <article key={d.id} className="wg-seasonal-row">
                    <div className="wg-seasonal-row-hd">
                      <div>
                        <h3 className="wg-seasonal-name">{d.name}</h3>
                        <span className="wg-dest-region" style={{ background: db, color: df }}>
                          {d.region}
                        </span>
                      </div>
                      {bb ? (
                        <span className="wg-best-pill" title={bb.activity}>
                          Peak · {bb.months.map((m) => MONTHS[m]).join(', ')}
                        </span>
                      ) : null}
                    </div>
                    <div className="wg-month-strip">
                      {row.map((code, mi) => {
                        const wr = wrStyle(code);
                        const t = temps[mi] || [];
                        const isBest = Boolean(bb?.months.includes(mi));
                        const bbTooltip = isBest ? bb?.tooltips?.[mi] : undefined;
                        return (
                          <button
                            key={mi}
                            type="button"
                            className={`wg-month-cell${isBest ? ' wg-month-cell--best' : ''}`}
                            style={{ background: wr.bg, color: wr.fg }}
                            onClick={() => onEditCell(d.id, mi, code)}
                            title={
                              isBest
                                ? `Peak: ${bbTooltip || bb?.activity}`
                                : `Edit ${d.name} ${MONTHS[mi]}`
                            }
                          >
                            <span className="wg-month-abbr">{MONTHS[mi]}</span>
                            <span className="wg-month-code">{code as WeatherRatingCode}</span>
                            {t.length > 0 && (
                              <span className="wg-month-temp">
                                {t[0]}–{t[1]}°
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
