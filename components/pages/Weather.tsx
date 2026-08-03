'use client';

import { useMemo, useState } from 'react';
import WeatherWeeklyGrid from '@/components/weather/WeatherWeeklyGrid';
import WeatherLegend from '@/components/weather/WeatherLegend';
import WeatherRegionChips from '@/components/weather/WeatherRegionChips';
import WeatherSeasonalPanel from '@/components/weather/WeatherSeasonalPanel';
import WeatherRegionPanel from '@/components/weather/WeatherRegionPanel';
import WeatherBestTimePanel from '@/components/weather/WeatherBestTimePanel';
import WeatherRatingEditModal from '@/components/weather/WeatherRatingEditModal';
import { DEFAULT_WEATHER, getDefaultWeatherRow } from '@/lib/seeds/weather';
import { WEATHER_DESTINATIONS } from '@/lib/weather/coordinates';
import { matchesFoldedQuery } from '@/lib/gallery/fold-search';
import type { WeatherData } from '@/components/weather/WeatherSeasonalPanel';

type WeatherTab = 'week' | 'grid' | 'region' | 'month';

const STORAGE_KEY = 'ant_weather_v3';

function getStoredWeatherData(): WeatherData {
  if (typeof window === 'undefined') return { ...DEFAULT_WEATHER };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WeatherData) : { ...DEFAULT_WEATHER };
  } catch {
    return { ...DEFAULT_WEATHER };
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
  const [editCell, setEditCell] = useState<{ destId: string; monthIdx: number; code: string } | null>(
    null
  );
  const [savedFlash, setSavedFlash] = useState(false);

  const dests = useMemo(
    () =>
      WEATHER_DESTINATIONS.filter((d) => {
        if (regionF !== 'all' && d.region !== regionF) return false;
        if (!query.trim()) return true;
        return matchesFoldedQuery(`${d.name} ${d.id} ${d.region}`, query);
      }),
    [regionF, query]
  );

  function setCell(destId: string, monthIdx: number, code: string) {
    setWeatherData((prev) => {
      const row = [...(prev[destId] || getDefaultWeatherRow(destId))];
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
      <header className="wg-page-hd">
        <div>
          <h1 className="wg-page-title">Weather Guide</h1>
          <p className="wg-page-sub">Live weekly forecasts and seasonal planning for Vietnam destinations</p>
        </div>
      </header>

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
            placeholder="Search destinations…"
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

        {(tab === 'week' || tab === 'grid' || tab === 'region') && (
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
        <WeatherSeasonalPanel
          destinations={dests}
          weatherData={weatherData}
          query={query}
          onClearQuery={() => setQuery('')}
          onEditCell={(destId, monthIdx, code) => setEditCell({ destId, monthIdx, code })}
        />
      )}

      {tab === 'region' && (
        <WeatherRegionPanel
          destinations={dests}
          weatherData={weatherData}
          query={query}
          onClearQuery={() => setQuery('')}
        />
      )}

      {tab === 'month' && (
        <WeatherBestTimePanel query={query} onClearQuery={() => setQuery('')} />
      )}

      {editCell && (
        <WeatherRatingEditModal
          destId={editCell.destId}
          monthIdx={editCell.monthIdx}
          initialCode={editCell.code}
          onCancel={() => setEditCell(null)}
          onSave={(code) => setCell(editCell.destId, editCell.monthIdx, code)}
        />
      )}
    </div>
  );
}
