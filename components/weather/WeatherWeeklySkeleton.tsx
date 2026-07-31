'use client';

type Props = {
  cards?: number;
};

export default function WeatherWeeklySkeleton({ cards = 5 }: Props) {
  return (
    <div className="wg-dest-list" aria-hidden>
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="wg-dest-card wg-dest-card--skel">
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
  );
}
