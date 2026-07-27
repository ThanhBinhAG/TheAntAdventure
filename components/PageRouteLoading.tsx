/** Lightweight skeleton shown while a CRM page chunk loads. */
export default function PageRouteLoading() {
  return (
    <div className="page-route-loading" aria-busy="true" aria-label="Loading page">
      <div className="page-route-loading-bar" />
      <div className="page-route-loading-toolbar">
        <span className="page-route-skel page-route-skel-title" />
        <span className="page-route-skel page-route-skel-btn" />
        <span className="page-route-skel page-route-skel-btn" />
      </div>
      <div className="card page-route-loading-card">
        <div className="card-hd">
          <span className="page-route-skel page-route-skel-hd" />
        </div>
        <div className="card-body page-route-loading-body">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="page-route-skel page-route-skel-row" style={{ width: `${88 - (i % 3) * 12}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
