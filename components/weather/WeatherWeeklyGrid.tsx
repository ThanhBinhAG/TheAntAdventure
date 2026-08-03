'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REG_COLORS_HEX } from '@/lib/core/page-helpers';
import { FEATURED_WEEKLY_IDS } from '@/lib/weather/coordinates';
import type { WeeklyDestinationForecast, WeeklyWeatherResponse } from '@/lib/weather/types';
import {
  readWeeklySessionCache,
  writeWeeklySessionCache,
} from '@/components/weather/weatherClientCache';
import WeatherWeeklySkeleton from '@/components/weather/WeatherWeeklySkeleton';
import {
  formatDayParts,
  formatTimestamp,
  sortByComfort,
  weatherGlyph,
  weekComfort,
  wrStyle,
} from '@/components/weather/weatherUiHelpers';
import { matchesFoldedQuery } from '@/lib/gallery/fold-search';
import EmptyState from '@/components/EmptyState';

type Props = {
  region: string;
  query?: string;
};

const FEATURED_SET = new Set<string>(FEATURED_WEEKLY_IDS);

function DayTile({
  date,
  rating,
  tempMin,
  tempMax,
  precipMm,
  weatherCode,
}: {
  date: string;
  rating: string;
  tempMin: number;
  tempMax: number;
  precipMm: number;
  weatherCode: number;
}) {
  const parts = formatDayParts(date);
  const wr = wrStyle(rating);
  const glyph = weatherGlyph(weatherCode);
  const rainPct = Math.min(100, Math.round((precipMm / 40) * 100));

  return (
    <div
      className={`wg-day${parts.isToday ? ' wg-day--today' : ''}`}
      style={{ ['--day-fg' as string]: wr.fg, ['--day-bg' as string]: wr.bg }}
      title={`${wr.label} · ${Math.round(tempMin)}–${Math.round(tempMax)}°C${precipMm > 0 ? ` · ${precipMm.toFixed(0)} mm` : ''}`}
    >
      <div className="wg-day-top">
        <span className="wg-day-wd">{parts.weekday}</span>
        <span className="wg-day-num">{parts.dayNum}</span>
      </div>
      <div className={`wg-glyph wg-glyph--${glyph}`} aria-hidden />
      <div className="wg-day-rating">{wr.label}</div>
      <div className="wg-day-temps">
        <span className="wg-day-hi">{Math.round(tempMax)}°</span>
        <span className="wg-day-lo">{Math.round(tempMin)}°</span>
      </div>
      <div className="wg-rain-track" aria-hidden>
        <div className="wg-rain-fill" style={{ width: `${rainPct}%` }} />
      </div>
      {precipMm > 0 ? (
        <div className="wg-day-rain">{precipMm.toFixed(0)} mm</div>
      ) : (
        <div className="wg-day-rain wg-day-rain--dry">Dry</div>
      )}
    </div>
  );
}

function DestHeader({ dest }: { dest: WeeklyDestinationForecast }) {
  const [rbg, rfg] = REG_COLORS_HEX[dest.region] ?? ['#E8F5EE', '#1a5c38'];
  const comfort = weekComfort(dest.days);

  return (
    <div className="wg-dest-card-hd">
      <div>
        <h3 className="wg-dest-card-name">{dest.name}</h3>
        <span className="wg-dest-region" style={{ background: rbg, color: rfg }}>
          {dest.region}
        </span>
      </div>
      <div className="wg-comfort">
        <div className="wg-comfort-score">{comfort.avg.toFixed(1)}</div>
        <div className="wg-comfort-meta">
          <span className="wg-comfort-label">{comfort.label}</span>
          <span className="wg-comfort-sub">
            {comfort.excellentDays}/{dest.days.length} good days
          </span>
        </div>
      </div>
    </div>
  );
}

function DayStrip({ dest }: { dest: WeeklyDestinationForecast }) {
  return (
    <div className="wg-day-strip">
      {dest.days.map((day) => (
        <DayTile
          key={day.date}
          date={day.date}
          rating={day.rating}
          tempMin={day.tempMin}
          tempMax={day.tempMax}
          precipMm={day.precipMm}
          weatherCode={day.weatherCode}
        />
      ))}
    </div>
  );
}

function FeaturedDestPanel({ dest, index }: { dest: WeeklyDestinationForecast; index: number }) {
  const [rbg] = REG_COLORS_HEX[dest.region] ?? ['#E8F5EE', '#1a5c38'];

  return (
    <article
      className="wg-dest-card wg-dest-card--featured"
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      <div className="wg-dest-card-accent" style={{ background: rbg }} />
      <DestHeader dest={dest} />
      <DayStrip dest={dest} />
    </article>
  );
}

function CompactDestCard({
  dest,
  index,
  selected,
  onSelect,
}: {
  dest: WeeklyDestinationForecast;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const [rbg, rfg] = REG_COLORS_HEX[dest.region] ?? ['#E8F5EE', '#1a5c38'];
  const comfort = weekComfort(dest.days);
  const today = dest.days.find((d) => formatDayParts(d.date).isToday) ?? dest.days[0];
  const wr = today ? wrStyle(today.rating) : wrStyle('G');
  const glyph = today ? weatherGlyph(today.weatherCode) : 'cloud';

  return (
    <button
      type="button"
      className={`wg-compact-card${selected ? ' wg-compact-card--selected' : ''}`}
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
      aria-pressed={selected}
      onClick={() => onSelect(dest.id)}
    >
      <div className="wg-compact-card-accent" style={{ background: rbg }} />
      <div className="wg-compact-card-main">
        <div className="wg-compact-card-hd">
          <h3 className="wg-compact-card-name">{dest.name}</h3>
          <span className="wg-dest-region" style={{ background: rbg, color: rfg }}>
            {dest.region}
          </span>
        </div>
        <div className="wg-compact-comfort">
          <span className="wg-compact-score">{comfort.avg.toFixed(1)}</span>
          <span className="wg-compact-label">{comfort.label}</span>
        </div>
      </div>
      {today ? (
        <div
          className="wg-compact-today"
          style={{ ['--day-fg' as string]: wr.fg, ['--day-bg' as string]: wr.bg }}
        >
          <div className={`wg-glyph wg-glyph--${glyph}`} aria-hidden />
          <div className="wg-compact-today-meta">
            <span className="wg-compact-today-rating">{wr.label}</span>
            <span className="wg-compact-today-temps">
              {Math.round(today.tempMax)}° / {Math.round(today.tempMin)}°
            </span>
          </div>
        </div>
      ) : null}
    </button>
  );
}

function SelectedDestPanel({
  dest,
  onClose,
}: {
  dest: WeeklyDestinationForecast;
  onClose: () => void;
}) {
  const [rbg] = REG_COLORS_HEX[dest.region] ?? ['#E8F5EE', '#1a5c38'];

  return (
    <article className="wg-dest-card wg-dest-card--selected-detail">
      <div className="wg-dest-card-accent" style={{ background: rbg }} />
      <div className="wg-selected-detail-hd">
        <DestHeader dest={dest} />
        <button type="button" className="btn btn-s btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      <DayStrip dest={dest} />
    </article>
  );
}

export default function WeatherWeeklyGrid({ region, query = '' }: Props) {
  // Always start empty so SSR HTML matches the client's first paint (no sessionStorage).
  const [data, setData] = useState<WeeklyWeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const softRefreshStarted = useRef(false);
  const hasDataRef = useRef(false);

  const applyPayload = useCallback((payload: WeeklyWeatherResponse) => {
    hasDataRef.current = payload.destinations.length > 0;
    setData(payload);
    writeWeeklySessionCache(payload);
  }, []);

  const load = useCallback(
    async (opts?: { showSkeleton?: boolean }) => {
      const cached = readWeeklySessionCache();
      if (cached?.destinations?.length && !hasDataRef.current) {
        applyPayload(cached);
        setLoading(false);
      } else if (opts?.showSkeleton && !hasDataRef.current) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch('/api/weather/weekly');
        const json = (await res.json()) as WeeklyWeatherResponse & { error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        applyPayload(json);

        if (json.needsBackgroundRefresh && !softRefreshStarted.current) {
          softRefreshStarted.current = true;
          void (async () => {
            try {
              await fetch('/api/weather/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force: false }),
              });
              const again = await fetch('/api/weather/weekly');
              if (again.ok) {
                const fresh = (await again.json()) as WeeklyWeatherResponse;
                applyPayload(fresh);
              }
            } catch {
              /* keep stale */
            }
          })();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load forecast');
        if (!hasDataRef.current) setData(null);
      } finally {
        setLoading(false);
      }
    },
    [applyPayload]
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load({ showSkeleton: true });
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    setFlash(null);
    setError(null);
    try {
      const res = await fetch('/api/weather/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? json.reason ?? 'Refresh failed');
      }
      setFlash(json.skipped ? json.reason ?? 'Already up to date' : 'Forecast updated');
      softRefreshStarted.current = false;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
      setTimeout(() => setFlash(null), 3000);
    }
  }

  const destinations = useMemo(() => {
    const all = data?.destinations ?? [];
    return all.filter((d) => {
      if (region !== 'all' && d.region !== region) return false;
      if (!query.trim()) return true;
      return matchesFoldedQuery(`${d.name} ${d.id} ${d.region}`, query);
    });
  }, [data, region, query]);

  const featured = useMemo(() => {
    const byId = new Map(destinations.map((d) => [d.id, d]));
    return FEATURED_WEEKLY_IDS.map((id) => byId.get(id)).filter(
      (d): d is WeeklyDestinationForecast => Boolean(d)
    );
  }, [destinations]);

  const others = useMemo(
    () => sortByComfort(destinations.filter((d) => !FEATURED_SET.has(d.id))),
    [destinations]
  );

  const selectedDest = useMemo(() => {
    if (!selectedId) return null;
    return others.find((d) => d.id === selectedId) ?? null;
  }, [others, selectedId]);

  // Drop stale selection when filters remove the destination (adjust while rendering).
  if (selectedId && !selectedDest) {
    setSelectedId(null);
  }

  function handleSelectCompact(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  if (loading && !data?.destinations?.length) {
    return <WeatherWeeklySkeleton />;
  }

  if (error && !data?.destinations?.length) {
    return (
      <EmptyState
        className="crm-empty-state--flush"
        variant="weather"
        title={error}
        description="Ensure Supabase weather tables exist and SUPABASE_SERVICE_ROLE_KEY is set."
        action={
          <button className="btn btn-p btn-sm" type="button" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh forecast'}
          </button>
        }
      />
    );
  }

  return (
    <div className="wg-week">
      <div className="wg-toolbar">
        <div className="wg-meta">
          <span className="wg-updated">
            Updated <b>{formatTimestamp(data?.fetchedAt ?? null)}</b>
          </span>
          {data?.stale && <span className="wg-stale">Updating…</span>}
          {flash && <span className="wg-flash">{flash}</span>}
          {error && data?.destinations?.length ? <span className="wg-error-inline">{error}</span> : null}
        </div>
        <button className="btn btn-s btn-sm" type="button" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      {featured.length > 0 && (
        <div className="wg-featured-row">
          {featured.map((dest, i) => (
            <FeaturedDestPanel key={dest.id} dest={dest} index={i} />
          ))}
        </div>
      )}

      {selectedDest && (
        <SelectedDestPanel dest={selectedDest} onClose={() => setSelectedId(null)} />
      )}

      {others.length > 0 && (
        <div className="wg-compact-grid">
          {others.map((dest, i) => (
            <CompactDestCard
              key={dest.id}
              dest={dest}
              index={i}
              selected={selectedId === dest.id}
              onSelect={handleSelectCompact}
            />
          ))}
        </div>
      )}

      {!destinations.length && (
        <EmptyState
          className="crm-empty-state--flush"
          size="compact"
          variant="weather"
          title={
            query.trim()
              ? `No destinations match “${query.trim()}”`
              : 'No destinations in this region'
          }
          description={
            query.trim()
              ? 'Clear the search or pick another region.'
              : 'Try another region chip to browse weekly forecasts.'
          }
        />
      )}

      <p className="wg-foot">Hanoi &amp; Saigon featured · click a card for 7-day detail · Open-Meteo · cron 06:00 ICT</p>
    </div>
  );
}
