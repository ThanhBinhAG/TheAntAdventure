'use client';

import WeatherIcon from '@/components/weather/icons/WeatherIcon';
import { useDestinationWeather } from '@/components/weather/hooks/useDestinationWeather';
import { useResolvedCover } from '@/components/weather/hooks/useResolvedCover';
import { weatherHeroCoverUrl } from '@/lib/weather/resolve-cover';
import { toCrmPhotoAssetUrl } from '@/lib/gallery/storage-image-src';
import {
  formatDayLabel,
  formatUpdatedAt,
  regionLabel,
  weatherLabel,
} from '@/components/weather/weatherLabels';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useLanguage } from '@/hooks/useLanguage';
import type { WeatherDestinationMeta } from '@/lib/weather/types';

type Props = {
  open: boolean;
  destinationId: string | null;
  meta: WeatherDestinationMeta | null;
  onClose: () => void;
};

export default function WeatherDetailModal({ open, destinationId, meta, onClose }: Props) {
  const { tp, tc, language } = useLanguage();
  const { canWrite } = usePagePermission('weather');
  const { data, loading, error, refresh, reload } = useDestinationWeather(destinationId, {
    enabled: open && Boolean(destinationId),
  });
  const resolved = useResolvedCover(meta);

  if (!open || !destinationId) return null;

  const cover = weatherHeroCoverUrl(resolved);
  const coverStyle = cover ? toCrmPhotoAssetUrl(cover) : null;
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
            <p className="wg-detail-region">{meta ? regionLabel(meta.region, language) : ''}</p>
            <h2 id="wg-detail-title">{meta?.name || data?.name || tp('weather', 'weatherDetails')}</h2>
          </div>
          <button type="button" className="gallery-modal-close" onClick={onClose} aria-label={tc('close')}>
            ×
          </button>
        </div>

        {coverStyle ? (
          <div className="wg-detail-hero" style={{ backgroundImage: `url(${coverStyle})` }} aria-hidden />
        ) : (
          <div className="wg-detail-hero wg-detail-hero--ph" aria-hidden>
            <span className="wg-cover-ph-name">{meta?.name || data?.name || ''}</span>
            <span className="wg-cover-ph-hint">{tp('weather', 'noImageEditToAdd')}</span>
          </div>
        )}

        <div className="wg-detail-body">
          {loading && !data ? (
            <div className="wg-detail-loading" aria-busy aria-label={tp('weather', 'loadingWeatherAria')}>
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
              <h3 className="wg-section-heading">{tp('weather', 'sevenDayForecast')}</h3>
              <div className="wg-skel wg-skel-forecast" aria-hidden />
            </div>
          ) : null}
          {error ? (
            <div className="wg-main-card-error">
              <p>{error}</p>
              <button type="button" className="btn btn-s btn-sm" onClick={() => void reload()}>
                {tc('retry')}
              </button>
            </div>
          ) : null}

          {current ? (
            <>
              <div className="wg-detail-current">
                <WeatherIcon
                  code={current.weatherCode}
                  size={64}
                  title={weatherLabel(current.weatherCode, language)}
                />
                <div>
                  <p className="wg-detail-temp">{Math.round(current.tempC)}°C</p>
                  <p className="wg-detail-condition">{weatherLabel(current.weatherCode, language)}</p>
                  <p className="wg-muted">
                    {tp('weather', 'updatedPrefix')} {formatUpdatedAt(data?.fetchedAt, language)}
                  </p>
                </div>
              </div>

              <dl className="wg-main-stats wg-main-stats--modal">
                <div>
                  <dt>{tp('weather', 'humidity')}</dt>
                  <dd>{current.humidity != null ? `${Math.round(current.humidity)}%` : '—'}</dd>
                </div>
                <div>
                  <dt>{tp('weather', 'wind')}</dt>
                  <dd>{current.windKmh != null ? `${Math.round(current.windKmh)} km/h` : '—'}</dd>
                </div>
                <div>
                  <dt>{tp('weather', 'feelsLike')}</dt>
                  <dd>{current.feelsLikeC != null ? `${Math.round(current.feelsLikeC)}°` : '—'}</dd>
                </div>
                <div>
                  <dt>{tp('weather', 'uvToday')}</dt>
                  <dd>
                    {days[0]?.uvIndexMax != null ? Math.round(days[0].uvIndexMax) : '—'}
                  </dd>
                </div>
              </dl>

              <h3 className="wg-section-heading">{tp('weather', 'sevenDayForecast')}</h3>
              <div className="wg-detail-forecast">
                {days.map((day) => (
                  <div key={day.date} className="wg-detail-day">
                    <span className="wg-mini-day-label">{formatDayLabel(day.date, language)}</span>
                    <WeatherIcon code={day.weatherCode} size={28} />
                    <span className="wg-mini-day-temps">
                      {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
                    </span>
                    <span className="wg-detail-day-extra">
                      {day.precipMm > 0 ? `${day.precipMm.toFixed(1)} mm` : tp('weather', 'noRain')}
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
            {tc('close')}
          </button>
          {canWrite ? (
            <button type="button" className="btn btn-p" onClick={() => void refresh()}>
              {tp('weather', 'refreshBtn')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
