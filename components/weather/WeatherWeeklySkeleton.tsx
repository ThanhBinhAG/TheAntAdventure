'use client';

type Props = {
  compactCards?: number;
};

export default function WeatherWeeklySkeleton({ compactCards = 6 }: Props) {
  return (
    <div className="wg-week" aria-hidden>
      <div className="wg-featured-row">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="wg-dest-card wg-dest-card--featured wg-dest-card--skel">
            <div className="wg-dest-card-hd">
              <span className="wg-skel wg-skel-title" />
              <span className="wg-skel wg-skel-badge" />
            </div>
            <div className="wg-day-strip">
              {Array.from({ length: 7 }, (_, d) => (
                <span key={d} className="wg-skel wg-skel-daycard" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="wg-compact-grid">
        {Array.from({ length: compactCards }, (_, i) => (
          <div key={i} className="wg-compact-card wg-compact-card--skel">
            <span className="wg-skel wg-skel-title" />
            <span className="wg-skel wg-skel-compact-today" />
          </div>
        ))}
      </div>
    </div>
  );
}
