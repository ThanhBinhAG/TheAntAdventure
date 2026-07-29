'use client';

import { useCallback, useEffect, useState } from 'react';
import { WR } from '@/lib/seeds/weather';
import { REG_COLORS_HEX } from '@/lib/core/page-helpers';
import type { WeeklyWeatherResponse } from '@/lib/weather/types';

type Props = {
  region: string;
};

function formatDayLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

export default function WeatherWeeklyGrid({ region }: Props) {
  const [data, setData] = useState<WeeklyWeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = region === 'all' ? '' : `?region=${encodeURIComponent(region)}`;
      const res = await fetch(`/api/weather/weekly${q}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load forecast');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    const initialLoad = setTimeout(() => void load(), 0);
    return () => clearTimeout(initialLoad);
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
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
      setTimeout(() => setFlash(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 24, color: 'var(--m)', fontSize: 13 }}>
        Loading live forecast…
      </div>
    );
  }

  if (error && !data?.destinations?.length) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <p style={{ color: 'var(--red, #C0392B)', marginBottom: 12, fontSize: 13 }}>{error}</p>
        <p style={{ color: 'var(--m)', fontSize: 12, marginBottom: 14 }}>
          Ensure Supabase migration is applied and <code>SUPABASE_SERVICE_ROLE_KEY</code> is set on the server.
        </p>
        <button className="btn btn-p btn-sm" type="button" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh forecast'}
        </button>
      </div>
    );
  }

  const destinations = data?.destinations ?? [];
  const dayHeaders = destinations[0]?.days.map((d) => d.date) ?? [];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
          flexWrap: 'wrap',
          fontSize: 12,
        }}
      >
        <span className="weather-updated-at">
          Updated: <b>{formatTimestamp(data?.fetchedAt ?? null)}</b> (ICT)
        </span>
        {data?.stale && <span className="weather-stale-badge">Stale — refresh recommended</span>}
        {flash && <span style={{ color: 'var(--g)', fontWeight: 600 }}>{flash}</span>}
        <div style={{ flex: 1 }} />
        <button className="btn btn-s btn-sm" type="button" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh forecast'}
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="weather-weekly-tbl">
            <thead>
              <tr>
                <th className="weather-sticky-col">Destination</th>
                {dayHeaders.map((d) => (
                  <th key={d}>{formatDayLabel(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {destinations.map((dest) => {
                const [rbg, rfg] = REG_COLORS_HEX[dest.region] ?? ['#f0f0ee', '#666'];
                return (
                  <tr key={dest.id}>
                    <td className="weather-sticky-col">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span>{dest.emoji}</span>
                        <div>
                          <div style={{ fontSize: 12.5 }}>{dest.name}</div>
                          <span
                            style={{
                              background: rbg,
                              color: rfg,
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: 9.5,
                              fontWeight: 600,
                            }}
                          >
                            {dest.region.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </td>
                    {dest.days.map((day) => {
                      const wr = WR[day.rating];
                      const tempStr = `${Math.round(day.tempMin)}–${Math.round(day.tempMax)}°C`;
                      const rainStr = day.precipMm > 0 ? `${day.precipMm.toFixed(0)}mm` : '';
                      return (
                        <td key={day.date} style={{ padding: '5px 4px', textAlign: 'center' }}>
                          <div className="weather-cell" style={{ background: wr.bg, color: wr.fg }}>
                            <div style={{ fontSize: 16 }}>{wr.icon}</div>
                            <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>{wr.label}</div>
                            <div style={{ fontSize: 9.5, opacity: 0.85, marginTop: 1 }}>{tempStr}</div>
                            {rainStr && (
                              <div style={{ fontSize: 9, opacity: 0.75, marginTop: 1 }}>{rainStr}</div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 11, color: 'var(--m)', marginTop: 10 }}>
        Live 7-day forecast from Open-Meteo. Auto-refresh daily at 6:00 AM (server cron). Use Refresh for an immediate update.
      </p>
    </div>
  );
}
