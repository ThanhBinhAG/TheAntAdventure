'use client';

import WeatherIcon from '@/components/weather/icons/WeatherIcon';
import { useResolvedCover } from '@/components/weather/hooks/useResolvedCover';
import { weatherCardCoverUrl } from '@/lib/weather/resolve-cover';
import {
  formatDayLabel,
  formatUpdatedAt,
  regionLabel,
  weatherLabelVi,
} from '@/components/weather/weatherLabels';
import type { DestinationWeatherDetail } from '@/lib/weather/types';
import type { WeatherDestinationMeta } from '@/lib/weather/types';

type Props = {
  meta: WeatherDestinationMeta;
  detail: DestinationWeatherDetail | null;
  loading?: boolean;
  error?: string | null;
  onOpenDetail: () => void;
  onRetry?: () => void;
};

export default function MainWeatherCard({
  meta,
  detail,
  loading,
  error,
  onOpenDetail,
  onRetry,
}: Props) {
  const resolved = useResolvedCover(meta);
  const cover = weatherCardCoverUrl(resolved);
  const current = detail?.current;
  const days = detail?.days?.slice(0, 5) ?? [];

  return (
    <article
      className={`wg-main-card wg-main-card--${meta.region}${loading ? ' is-loading' : ''}${!cover ? ' wg-main-card--no-cover' : ''}`}
      aria-busy={loading || undefined}
    >
      {cover ? (
        <div
          className="wg-main-card-bg"
          style={{ backgroundImage: `url(${cover})` }}
          aria-hidden
        />
      ) : (
        <div className="wg-main-card-bg wg-main-card-bg--ph" aria-hidden>
          <span className="wg-cover-ph-name">{meta.name}</span>
          <span className="wg-cover-ph-hint">No image — edit to add</span>
        </div>
      )}
      <div className="wg-main-card-scrim" aria-hidden />

      <div className="wg-main-card-body">
        <header className="wg-main-card-hd">
          <div>
            <p className="wg-main-card-region">{regionLabel(meta.region)}</p>
            <h2 className="wg-main-card-name">
              {meta.emoji ? <span aria-hidden>{meta.emoji} </span> : null}
              {meta.name}
            </h2>
            {meta.description ? <p className="wg-main-card-desc">{meta.description}</p> : null}
          </div>
          {current ? (
            <WeatherIcon code={current.weatherCode} size={56} title={weatherLabelVi(current.weatherCode)} />
          ) : (
            <div className="wg-skel wg-skel-icon" aria-hidden />
          )}
        </header>

        {error ? (
          <div className="wg-main-card-error">
            <p>{error}</p>
            {onRetry ? (
              <button type="button" className="btn btn-s btn-sm" onClick={onRetry}>
                Try again
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="wg-main-card-temp-row">
          {current ? (
            <>
              <p className="wg-main-card-temp">
                {Math.round(current.tempC)}
                <span>°C</span>
              </p>
              <div className="wg-main-card-temp-meta">
                <p className="wg-main-card-condition">{weatherLabelVi(current.weatherCode)}</p>
                {detail?.fetchedAt ? (
                  <p className="wg-main-card-updated">Updated {formatUpdatedAt(detail.fetchedAt)}</p>
                ) : null}
              </div>
            </>
          ) : loading ? (
            <div className="wg-skel wg-skel-temp" aria-hidden />
          ) : (
            <p className="wg-muted">No weather data</p>
          )}
        </div>

        {current ? (
          <dl className="wg-main-stats">
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
              <dt>UV</dt>
              <dd>
                {days[0]?.uvIndexMax != null ? Math.round(days[0].uvIndexMax) : '—'}
              </dd>
            </div>
          </dl>
        ) : null}

        {days.length > 0 ? (
          <div className="wg-mini-forecast" aria-label="Short-term forecast">
            {days.map((day) => (
              <div key={day.date} className="wg-mini-day">
                <span className="wg-mini-day-label">{formatDayLabel(day.date)}</span>
                <WeatherIcon code={day.weatherCode} size={22} />
                <span className="wg-mini-day-temps">
                  {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                </span>
              </div>
            ))}
          </div>
        ) : loading ? (
          <div className="wg-skel wg-skel-forecast" aria-hidden />
        ) : null}

        <div className="wg-main-card-actions">
          <button type="button" className="btn btn-p" onClick={onOpenDetail} disabled={!detail && !loading}>
            View details
          </button>
        </div>
      </div>
    </article>
  );
}
