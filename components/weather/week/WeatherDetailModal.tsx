'use client';

import WeatherIcon from '@/components/weather/icons/WeatherIcon';
import { useDestinationWeather } from '@/components/weather/hooks/useDestinationWeather';
import { useResolvedCover } from '@/components/weather/hooks/useResolvedCover';
import { weatherHeroCoverUrl } from '@/lib/weather/resolve-cover';
import {
  formatDayLabel,
  formatUpdatedAt,
  regionLabel,
  weatherLabelVi,
} from '@/components/weather/weatherLabels';
import { usePagePermission } from '@/hooks/usePagePermission';
import type { WeatherDestinationMeta } from '@/lib/weather/types';

type Props = {
  open: boolean;
  destinationId: string | null;
  meta: WeatherDestinationMeta | null;
  onClose: () => void;
};

export default function WeatherDetailModal({ open, destinationId, meta, onClose }: Props) {
  const { canWrite } = usePagePermission('weather');
  const { data, loading, error, refresh, reload } = useDestinationWeather(destinationId, {
    enabled: open && Boolean(destinationId),
  });
  const resolved = useResolvedCover(meta);

  if (!open || !destinationId) return null;

  const cover = weatherHeroCoverUrl(resolved);
  const current = data?.current;
  const days = data?.days ?? [];

  return (
    <div className="overlay open" onClick={onClose} role="presentation">
      <div
        className="modal wg-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wg-detail-title"
      >
        <div className="modal-hd modal-hd-green wg-detail-hd">
          <div>
            <p className="wg-detail-region">{meta ? regionLabel(meta.region) : ''}</p>
            <h2 id="wg-detail-title">{meta?.name || data?.name || 'Weather details'}</h2>
          </div>
          <button type="button" className="gallery-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {cover ? (
          <div className="wg-detail-hero" style={{ backgroundImage: `url(${cover})` }} aria-hidden />
        ) : (
          <div className="wg-detail-hero wg-detail-hero--ph" aria-hidden>
            <span className="wg-cover-ph-name">{meta?.name || data?.name || ''}</span>
            <span className="wg-cover-ph-hint">No image — edit to add</span>
          </div>
        )}

        <div className="wg-detail-body">
          {loading && !data ? (
            <div className="wg-detail-loading" aria-busy aria-label="Loading weather">
              <div className="wg-detail-current">
                <div className="wg-skel wg-skel-icon" aria-hidden />
                <div className="wg-skel-stack">
                  <div className="wg-skel wg-skel-temp" aria-hidden />
                  <div className="wg-skel wg-skel-line wg-skel-line--md" aria-hidden />
                  <div className="wg-skel wg-skel-line wg-skel-line--sm" aria-hidden />
                </div>
              </div>
              <dl className="wg-main-stats wg-main-stats--modal">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <dt className="wg-skel wg-skel-line wg-skel-line--sm" aria-hidden />
                    <dd className="wg-skel wg-skel-line wg-skel-line--md" aria-hidden />
                  </div>
                ))}
              </dl>
              <h3 className="wg-section-heading">7-day forecast</h3>
              <div className="wg-skel wg-skel-forecast" aria-hidden />
            </div>
          ) : null}
          {error ? (
            <div className="wg-main-card-error">
              <p>{error}</p>
              <button type="button" className="btn btn-s btn-sm" onClick={() => void reload()}>
                Try again
              </button>
            </div>
          ) : null}

          {current ? (
            <>
              <div className="wg-detail-current">
                <WeatherIcon
                  code={current.weatherCode}
                  size={64}
                  title={weatherLabelVi(current.weatherCode)}
                />
                <div>
                  <p className="wg-detail-temp">{Math.round(current.tempC)}°C</p>
                  <p className="wg-detail-condition">{weatherLabelVi(current.weatherCode)}</p>
                  <p className="wg-muted">Updated {formatUpdatedAt(data?.fetchedAt)}</p>
                </div>
              </div>

              <dl className="wg-main-stats wg-main-stats--modal">
                <div>
                  <dt>Humidity</dt>
                  <dd>{current.humidity != null ? `${Math.round(current.humidity)}%` : '—'}</dd>
                </div>
                <div>
                  <dt>Wind</dt>
                  <dd>{current.windKmh != null ? `${Math.round(current.windKmh)} km/h` : '—'}</dd>
                </div>
                <div>
                  <dt>Feels like</dt>
                  <dd>{current.feelsLikeC != null ? `${Math.round(current.feelsLikeC)}°` : '—'}</dd>
                </div>
                <div>
                  <dt>UV today</dt>
                  <dd>
                    {days[0]?.uvIndexMax != null ? Math.round(days[0].uvIndexMax) : '—'}
                  </dd>
                </div>
              </dl>

              <h3 className="wg-section-heading">7-day forecast</h3>
              <div className="wg-detail-forecast">
                {days.map((day) => (
                  <div key={day.date} className="wg-detail-day">
                    <span className="wg-mini-day-label">{formatDayLabel(day.date)}</span>
                    <WeatherIcon code={day.weatherCode} size={28} />
                    <span className="wg-mini-day-temps">
                      {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                    </span>
                    <span className="wg-detail-day-extra">
                      {day.precipMm > 0 ? `${day.precipMm.toFixed(1)} mm` : 'No rain'}
                      {day.uvIndexMax != null ? ` · UV ${Math.round(day.uvIndexMax)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="wg-detail-ft">
          <button type="button" className="btn btn-s" onClick={onClose}>
            Close
          </button>
          {canWrite ? (
            <button type="button" className="btn btn-p" onClick={() => void refresh()}>
              Refresh
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
