'use client';

import { useMemo, useState } from 'react';
import WeatherWeeklyGrid from '@/components/weather/WeatherWeeklyGrid';
import EmptyState from '@/components/EmptyState';
import WeatherLegend from '@/components/weather/WeatherLegend';
import WeatherRegionChips from '@/components/weather/WeatherRegionChips';
import { BEST_BY, DEFAULT_WEATHER, DESTINATIONS, MONTHS, TEMP_RANGES, WR } from '@/lib/seeds/weather';
import { REG_COLORS_HEX } from '@/lib/core/page-helpers';
import { matchesFoldedQuery } from '@/lib/gallery/fold-search';
import { wrStyle } from '@/components/weather/weatherUiHelpers';

type WeatherData = Record<string, string[]>;
type WeatherCode = keyof typeof WR;
type WeatherTab = 'week' | 'grid' | 'region' | 'month';

const STORAGE_KEY = 'ant_weather_v3';

function getStoredWeatherData(): WeatherData {
  if (typeof window === 'undefined') return { ...DEFAULT_WEATHER } as WeatherData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WeatherData) : ({ ...DEFAULT_WEATHER } as WeatherData);
  } catch {
    return { ...DEFAULT_WEATHER } as WeatherData;
  }
}

const TABS: { id: WeatherTab; label: string }[] = [
  { id: 'week', label: 'This Week' },
  { id: 'grid', label: 'Seasonal' },
  { id: 'region', label: 'By Region' },
  { id: 'month', label: 'Best Time' },
];

export default function Weather() {
  const [tab, setTab] = useState<WeatherTab>('week');
  const [regionF, setRegionF] = useState('all');
  const [query, setQuery] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData>(getStoredWeatherData);
  const [editCell, setEditCell] = useState<{ destId: string; monthIdx: number } | null>(null);
  const [pendingCode, setPendingCode] = useState<string>('G');
  const [savedFlash, setSavedFlash] = useState(false);

  const dests = useMemo(
    () =>
      DESTINATIONS.filter((d) => {
        if (regionF !== 'all' && d.region !== regionF) return false;
        if (!query.trim()) return true;
        return matchesFoldedQuery(`${d.name} ${d.id} ${d.region}`, query);
      }),
    [regionF, query]
  );

  function setCell(destId: string, monthIdx: number, code: string) {
    setWeatherData((prev) => {
      const row = [
        ...(prev[destId] ||
          DEFAULT_WEATHER[destId as keyof typeof DEFAULT_WEATHER] ||
          Array(12).fill('G')),
      ];
      row[monthIdx] = code;
      return { ...prev, [destId]: row };
    });
    setEditCell(null);
  }

  function saveAll() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(weatherData));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="wg-page">
      <div className="wg-chrome">
        <div className="wg-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`wg-tab${tab === t.id ? ' on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label className="wg-search">
          <span className="wg-search-icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            aria-label="Search destination"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="wg-search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </label>

        {(tab === 'week' || tab === 'grid') && (
          <WeatherRegionChips value={regionF} onChange={setRegionF} />
        )}

        {tab !== 'week' && (
          <button className="btn btn-p btn-sm" type="button" onClick={saveAll}>
            {savedFlash ? 'Saved' : 'Save'}
          </button>
        )}
      </div>

      <div className="wg-meta-row">
        <WeatherLegend showBestBy={tab === 'grid' || tab === 'month'} compact />
      </div>

      {tab === 'week' && <WeatherWeeklyGrid region={regionF} query={query} />}

      {tab === 'grid' && (
        <div className="wg-seasonal-list">
          {!dests.length && (
<EmptyState
              className="crm-empty-state--flush"
              size="compact"
              variant="weather"
              title={`No destinations match “${query.trim()}”`}
              description="Clear the search or try another region to see destinations."
              action={
                <button type="button" className="btn btn-s btn-sm" onClick={() => setQuery('')}>
                  Clear search
                </button>
              }
            />
          )}
          {dests.map((d) => {
            const row =
              weatherData[d.id] ||
              DEFAULT_WEATHER[d.id as keyof typeof DEFAULT_WEATHER] ||
              Array(12).fill('G');
            const temps = TEMP_RANGES[d.id as keyof typeof TEMP_RANGES] || [];
            const [rbg, rfg] = REG_COLORS_HEX[d.region as keyof typeof REG_COLORS_HEX] || [
              '#E8F5EE',
              '#1a5c38',
            ];
            const bb = BEST_BY[d.id as keyof typeof BEST_BY];

            return (
              <article key={d.id} className="wg-dest-card wg-dest-card--seasonal">
                <div className="wg-dest-card-accent" style={{ background: rbg }} />
                <div className="wg-dest-card-hd">
                  <div>
                    <h3 className="wg-dest-card-name">{d.name}</h3>
                    <span className="wg-dest-region" style={{ background: rbg, color: rfg }}>
                      {d.region}
                    </span>
                  </div>
                </div>
                <div className="wg-month-strip">
                  {row.map((code, mi) => {
                    const wr = wrStyle(code);
                    const t = temps[mi] || [];
                    const isBest = bb && (bb as { months: number[] }).months.includes(mi);
                    const bbTooltip =
                      isBest && (bb as { tooltips?: Record<number, string> }).tooltips?.[mi];
                    return (
                      <button
                        key={mi}
                        type="button"
                        className={`wg-month-cell${isBest ? ' wg-month-cell--best' : ''}`}
                        style={{ background: wr.bg, color: wr.fg }}
                        onClick={() => {
                          setEditCell({ destId: d.id, monthIdx: mi });
                          setPendingCode(code);
                        }}
                        title={
                          isBest
                            ? `Peak: ${bbTooltip || (bb as { activity?: string }).activity}`
                            : `Edit ${d.name} ${MONTHS[mi]}`
                        }
                      >
                        <span className="wg-month-abbr">{MONTHS[mi]}</span>
                        <span className="wg-month-code">{code}</span>
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
      )}

      {tab === 'region' && (
        <div className="wg-region-grid">
          {!dests.length && query.trim() && (
<EmptyState
              className="crm-empty-state--flush crm-empty-state--inline"
              size="compact"
              variant="weather"
              title={`No destinations match “${query.trim()}”`}
              description="Clear the search or try another region to see destinations."
              action={
                <button type="button" className="btn btn-s btn-sm" onClick={() => setQuery('')}>
                  Clear search
                </button>
              }
            />
          )}
          {(['north', 'central', 'south'] as const).map((reg) => {
            const [rbg, rfg] = REG_COLORS_HEX[reg];
            const regDests = dests.filter((d) => d.region === reg);
            if (!regDests.length) return null;
            return (
              <div key={reg} className="wg-region-card">
                <div className="wg-region-hd" style={{ background: rbg, color: rfg }}>
                  {reg} Vietnam
                </div>
                <div className="wg-region-body">
                  {regDests.map((d) => {
                    const row =
                      weatherData[d.id] || DEFAULT_WEATHER[d.id as keyof typeof DEFAULT_WEATHER];
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
                            />
                          ))}
                        </div>
                        <span className="wg-muted">
                          {excellent}E · {good}G
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'month' && (
        <div className="wg-month-grid">
          {query.trim() &&
            !DESTINATIONS.some((d) => {
              const bb = BEST_BY[d.id as keyof typeof BEST_BY];
              return (
                bb &&
                matchesFoldedQuery(`${d.name} ${d.id} ${d.region}`, query) &&
                (bb as { months: number[] }).months.length > 0
              );
            }) && (
              <EmptyState
                className="crm-empty-state--flush crm-empty-state--inline"
                size="compact"
                variant="weather"
                title={`No destinations match “${query.trim()}”`}
                description="Clear the search or try another region to see destinations."
                action={
                  <button type="button" className="btn btn-s btn-sm" onClick={() => setQuery('')}>
                    Clear search
                  </button>
                }
              />
            )}
          {MONTHS.map((m, mi) => {
            const bestDests = DESTINATIONS.filter((d) => {
              const bb = BEST_BY[d.id as keyof typeof BEST_BY];
              if (!bb || !(bb as { months: number[] }).months.includes(mi)) return false;
              if (!query.trim()) return true;
              return matchesFoldedQuery(`${d.name} ${d.id} ${d.region}`, query);
            });
            if (query.trim() && !bestDests.length) return null;
            return (
              <div key={m} className="wg-month-card">
                <div className="wg-month-hd">{m}</div>
                <div className="wg-month-body">
                  {bestDests.length ? (
                    bestDests.map((d) => (
                      <div key={d.id} className="wg-month-item">
                        <b>{d.name}</b>
                        <div className="wg-muted">
                          {(BEST_BY[d.id as keyof typeof BEST_BY] as { activity?: string }).activity}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="wg-muted">Shoulder season — check Seasonal.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editCell && (
        <div className="modal-overlay open" onClick={() => setEditCell(null)}>
          <div className="modal wg-edit-modal" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const d = DESTINATIONS.find((x) => x.id === editCell.destId);
              return (
                <>
                  <div className="wg-edit-title">
                    {d?.name} — {MONTHS[editCell.monthIdx]}
                  </div>
                  <div className="wg-muted" style={{ marginBottom: 16 }}>
                    Select travel rating for this month
                  </div>
                  <div className="wg-edit-codes">
                    {(['E', 'G', 'F', 'P'] as WeatherCode[]).map((code) => {
                      const wr = wrStyle(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          className={`wg-edit-code${pendingCode === code ? ' on' : ''}`}
                          style={{ background: wr.bg, color: wr.fg }}
                          onClick={() => setPendingCode(code)}
                        >
                          <div className="wg-cell-code">{code}</div>
                          <div className="wg-cell-label">{wr.label}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="wg-edit-actions">
                    <button className="btn btn-s" type="button" onClick={() => setEditCell(null)}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-p"
                      type="button"
                      onClick={() => setCell(editCell.destId, editCell.monthIdx, pendingCode)}
                    >
                      Save
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
