'use client';

/** Explore-grid placeholders while the destination catalog loads. */
export default function ProvinceGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="wg-province-grid" aria-busy="true" aria-label="Đang tải danh sách điểm đến">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="wg-province-card wg-province-card--skel">
          <div className="wg-province-card-bg" aria-hidden />
          <div className="wg-province-card-overlay" aria-hidden />
          <div className="wg-province-card-content">
            <div className="wg-skel wg-skel-line wg-skel-line--sm" />
            <div className="wg-skel wg-skel-line wg-skel-line--md" />
          </div>
        </div>
      ))}
    </div>
  );
}
