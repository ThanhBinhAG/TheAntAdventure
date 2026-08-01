'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REG_COLORS_HEX } from '@/lib/core/page-helpers';
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

function DestCard({ dest, index }: { dest: WeeklyDestinationForecast; index: number }) {
  const [rbg, rfg] = REG_COLORS_HEX[dest.region] ?? ['#E8F5EE', '#1a5c38'];
  const comfort = weekComfort(dest.days);

  return (
    <article
      className="wg-dest-card"
      style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      <div className="wg-dest-card-accent" style={{ background: rbg }} />
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
        // #region agent log
        fetch('http://127.0.0.1:7795/ingest/2b1fefad-0968-4921-af80-38a8434fa394', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '731769' },
          body: JSON.stringify({
            sessionId: '731769',
            runId: 'hydration-fix',
            hypothesisId: 'H1',
            location: 'WeatherWeeklyGrid.tsx:load-cache',
            message: 'applied session cache after mount (post-hydration)',
            data: { destCount: cached.destinations.length },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7795/ingest/2b1fefad-0968-4921-af80-38a8434fa394', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '731769' },
      body: JSON.stringify({
        sessionId: '731769',
        runId: 'hydration-fix',
        hypothesisId: 'H1',
        location: 'WeatherWeeklyGrid.tsx:mount',
        message: 'mount: queueMicrotask load (empty SSR/client start)',
        data: { hasDataRef: hasDataRef.current },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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
    const filtered = all.filter((d) => {
      if (region !== 'all' && d.region !== region) return false;
      if (!query.trim()) return true;
      return matchesFoldedQuery(`${d.name} ${d.id} ${d.region}`, query);
    });
    return sortByComfort(filtered);
  }, [data, region, query]);

  const highlights = useMemo(() => destinations.slice(0, 3), [destinations]);

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
          {highlights.length > 0 && (
            <div className="wg-highlights-inline">
              {highlights.map((d, i) => (
                <span key={d.id} className="wg-highlight-chip">
                  <b>#{i + 1}</b> {d.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <button className="btn btn-s btn-sm" type="button" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      <div className="wg-dest-list">
        {destinations.map((dest, i) => (
          <DestCard key={dest.id} dest={dest} index={i} />
        ))}
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
      </div>

      <p className="wg-foot">Sorted by comfort · Open-Meteo · cron 06:00 ICT</p>
    </div>
  );
}
