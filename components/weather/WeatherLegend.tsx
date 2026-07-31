'use client';

import { WR } from '@/lib/seeds/weather';

type Props = {
  hint?: string;
  showBestBy?: boolean;
  compact?: boolean;
};

export default function WeatherLegend({ hint, showBestBy = false, compact = false }: Props) {
  return (
    <div className={`wg-legend${compact ? ' wg-legend--compact' : ''}`}>
      {(Object.keys(WR) as Array<keyof typeof WR>).map((code) => {
        const wr = WR[code];
        return (
          <span
            key={code}
            className="wg-legend-pill"
            style={{ background: wr.bg, color: wr.fg }}
            title={wr.label}
          >
            <span className="wg-legend-dot" style={{ background: wr.fg }} />
            {compact ? code : wr.label}
          </span>
        );
      })}
      {showBestBy && <span className="wg-best-pill">Peak</span>}
      {hint && <span className="wg-legend-hint">{hint}</span>}
    </div>
  );
}
