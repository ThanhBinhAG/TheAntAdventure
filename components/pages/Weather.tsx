'use client';

import { useMemo, useState } from 'react';
import { BEST_BY, DEFAULT_WEATHER, DESTINATIONS, MONTHS, TEMP_RANGES, WR } from '@/lib/seeds/weather';
import { REG_COLORS_HEX } from '@/lib/page-helpers';

type WeatherData = Record<string, string[]>;
type WeatherCode = keyof typeof WR;

function getWR(code: string) {
  return WR[code as WeatherCode] || WR.G;
}

export default function Weather() {
  const [tab, setTab] = useState<'grid' | 'region' | 'month'>('grid');
  const [regionF, setRegionF] = useState('all');
  const [weatherData, setWeatherData] = useState<WeatherData>(() => ({ ...DEFAULT_WEATHER } as WeatherData));
  const [editCell, setEditCell] = useState<{ destId: string; monthIdx: number } | null>(null);
  const [pendingCode, setPendingCode] = useState<string>('G');
  const [savedFlash, setSavedFlash] = useState(false);

  const dests = useMemo(
    () => DESTINATIONS.filter((d) => regionF === 'all' || d.region === regionF),
    [regionF]
  );

  function setCell(destId: string, monthIdx: number, code: string) {
    setWeatherData((prev) => {
      const row = [...(prev[destId] || DEFAULT_WEATHER[destId as keyof typeof DEFAULT_WEATHER] || Array(12).fill('G'))];
      row[monthIdx] = code;
      return { ...prev, [destId]: row };
    });
    setEditCell(null);
  }

  function saveAll() {
    try {
      localStorage.setItem('ant_weather_v3', JSON.stringify(weatherData));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {(
            [
              ['grid', '📊 Grid View'],
              ['region', '🗺 By Region'],
              ['month', '📅 By Month'],
            ] as const
          ).map(([id, label]) => (
            <div key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} role="button" tabIndex={0}>
              {label}
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {tab === 'grid' && (
          <select
            value={regionF}
            onChange={(e) => setRegionF(e.target.value)}
            style={{ width: 180, fontSize: 12, padding: '5px 9px', border: '1px solid var(--b)', borderRadius: 7 }}
          >
            <option value="all">All Destinations</option>
            <option value="north">Northern Vietnam</option>
            <option value="central">Central Vietnam</option>
            <option value="south">Southern Vietnam</option>
          </select>
        )}
        <button className="btn btn-p btn-sm" type="button" onClick={saveAll}>
          💾 {savedFlash ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="weather-legend">
        <span style={{ fontSize: 11.5, color: 'var(--m)', marginRight: 4, fontWeight: 500 }}>Legend:</span>
        {Object.entries(WR).map(([code, wr]) => (
          <span key={code} className="weather-legend-pill" style={{ background: wr.bg, color: wr.fg }}>
            {wr.icon} {wr.label}
          </span>
        ))}
        <span className="weather-best-pill">⭐ Best By Month</span>
        <span style={{ fontSize: 11, color: 'var(--m)', marginLeft: 4 }}>Click any cell to edit. Changes are saved locally.</span>
      </div>

      {tab === 'grid' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="weather-grid-tbl">
              <thead>
                <tr>
                  <th className="weather-sticky-col">Destination</th>
                  {MONTHS.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dests.map((d) => {
                  const row = weatherData[d.id] || DEFAULT_WEATHER[d.id as keyof typeof DEFAULT_WEATHER] || Array(12).fill('G');
                  const temps = TEMP_RANGES[d.id as keyof typeof TEMP_RANGES] || [];
                  const [rbg, rfg] = REG_COLORS_HEX[d.region as keyof typeof REG_COLORS_HEX] || ['#f0f0ee', '#666'];
                  const bb = BEST_BY[d.id as keyof typeof BEST_BY];

                  return (
                    <tr key={d.id}>
                      <td className="weather-sticky-col">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span>{d.emoji}</span>
                          <div>
                            <div style={{ fontSize: 12.5 }}>{d.name}</div>
                            <span style={{ background: rbg, color: rfg, padding: '1px 6px', borderRadius: 4, fontSize: 9.5, fontWeight: 600 }}>
                              {d.region.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>
                      {row.map((code, mi) => {
                        const wr = getWR(code);
                        const t = temps[mi] || [];
                        const tempStr = t.length ? `${t[0]}–${t[1]}°C` : '';
                        const isBest = bb && (bb as { months: number[] }).months.includes(mi);
                        const bbTooltip = isBest && (bb as { tooltips?: Record<number, string> }).tooltips?.[mi];

                        return (
                          <td key={mi} style={{ padding: '5px 4px', textAlign: 'center', cursor: 'pointer' }} onClick={() => { setEditCell({ destId: d.id, monthIdx: mi }); setPendingCode(code); }} title={isBest ? `⭐ Best By Month: ${bbTooltip || (bb as { activity?: string }).activity}` : `Click to edit: ${d.name} ${MONTHS[mi]}`}>
                            <div className={`weather-cell${isBest ? ' weather-cell-best' : ''}`} style={{ background: wr.bg, color: wr.fg }}>
                              <div style={{ fontSize: 16 }}>{wr.icon}</div>
                              <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>{wr.label}</div>
                              {tempStr && <div style={{ fontSize: 9.5, opacity: 0.75, marginTop: 1 }}>{tempStr}</div>}
                              {isBest && <div style={{ fontSize: 9, color: '#92711d', fontWeight: 700, marginTop: 3 }}>⭐ Best By</div>}
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
      )}

      {tab === 'region' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {(['north', 'central', 'south'] as const).map((reg) => {
            const [rbg, rfg] = REG_COLORS_HEX[reg];
            const regDests = DESTINATIONS.filter((d) => d.region === reg);
            return (
              <div key={reg} className="card">
                <div className="card-hd" style={{ background: rbg }}>
                  <span className="card-title" style={{ color: rfg, textTransform: 'capitalize' }}>
                    {reg} Vietnam
                  </span>
                </div>
                <div className="card-body" style={{ padding: 12 }}>
                  {regDests.map((d) => {
                    const row = weatherData[d.id] || DEFAULT_WEATHER[d.id as keyof typeof DEFAULT_WEATHER];
                    const excellent = row.filter((c) => c === 'E').length;
                    const good = row.filter((c) => c === 'G').length;
                    return (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--b)', fontSize: 12.5 }}>
                        <span>
                          {d.emoji} {d.name}
                        </span>
                        <span style={{ color: 'var(--m)' }}>
                          {excellent}E · {good}G months
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {MONTHS.map((m, mi) => {
            const bestDests = DESTINATIONS.filter((d) => {
              const bb = BEST_BY[d.id as keyof typeof BEST_BY];
              return bb && (bb as { months: number[] }).months.includes(mi);
            });
            return (
              <div key={m} className="card">
                <div className="card-hd">
                  <span className="card-title">{m} 2026</span>
                </div>
                <div className="card-body" style={{ padding: 12, fontSize: 12 }}>
                  {bestDests.length ? (
                    bestDests.map((d) => (
                      <div key={d.id} style={{ marginBottom: 8 }}>
                        <b>
                          {d.emoji} {d.name}
                        </b>
                        <div style={{ color: 'var(--m)', fontSize: 11.5, marginTop: 2 }}>
                          {(BEST_BY[d.id as keyof typeof BEST_BY] as { activity?: string }).activity}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--m)' }}>Shoulder season — check grid for details.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editCell && (
        <div className="modal-overlay open" onClick={() => setEditCell(null)}>
          <div className="modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            {(() => {
              const d = DESTINATIONS.find((x) => x.id === editCell.destId);
              return (
                <>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                    {d?.emoji} {d?.name} — {MONTHS[editCell.monthIdx]}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--m)', marginBottom: 16 }}>Select weather rating for this month</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                    {(['E', 'G', 'F', 'P'] as WeatherCode[]).map((code) => {
                      const wr = getWR(code);
                      return (
                        <div
                          key={code}
                          role="button"
                          tabIndex={0}
                          onClick={() => setPendingCode(code)}
                          style={{
                            border: pendingCode === code ? '2px solid var(--g)' : '2px solid transparent',
                            background: wr.bg,
                            color: wr.fg,
                            borderRadius: 8,
                            padding: '10px 14px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            minWidth: 90,
                          }}
                        >
                          <div style={{ fontSize: 22 }}>{wr.icon}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{wr.label}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-s" type="button" onClick={() => setEditCell(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-p" type="button" onClick={() => setCell(editCell.destId, editCell.monthIdx, pendingCode)}>
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
