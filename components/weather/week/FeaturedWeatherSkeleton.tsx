'use client';

/** Two featured-card placeholders while the destination catalog loads. */
export default function FeaturedWeatherSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="wg-featured-row" aria-busy="true" aria-label="Đang tải điểm nổi bật">
      {Array.from({ length: count }, (_, i) => (
        <article key={i} className="wg-main-card wg-main-card--skel is-loading">
          <div className="wg-main-card-bg wg-main-card-bg--ph" aria-hidden />
          <div className="wg-main-card-scrim" aria-hidden />
          <div className="wg-main-card-body">
            <header className="wg-main-card-hd">
              <div className="wg-skel-stack">
                <div className="wg-skel wg-skel-line wg-skel-line--sm" />
                <div className="wg-skel wg-skel-line wg-skel-line--lg" />
              </div>
              <div className="wg-skel wg-skel-icon" aria-hidden />
            </header>
            <div className="wg-skel wg-skel-temp" aria-hidden />
            <div className="wg-skel wg-skel-forecast" aria-hidden />
          </div>
        </article>
      ))}
    </div>
  );
}
