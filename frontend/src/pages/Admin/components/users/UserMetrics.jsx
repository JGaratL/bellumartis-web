export default function UserMetrics({ stats, loading, error }) {
  return (
    <>
      {error && <p className="admin-stats-error">{error}</p>}

      <div className="admin-metrics">
        <div className="admin-metric admin-metric-total">
          <span className="admin-metric-label">Total</span>
          <span className={`admin-metric-value ${loading ? "loading" : ""}`}>
            {loading ? "..." : stats.total_users}
          </span>
        </div>

        <div className="admin-metric admin-metric-active">
          <span className="admin-metric-label">Activos</span>
          <span className={`admin-metric-value ${loading ? "loading" : ""}`}>
            {loading ? "..." : stats.active_users}
          </span>
          <span className="admin-metric-note">Ultimos 30 dias</span>
        </div>

        <div className="admin-metric admin-metric-new">
          <span className="admin-metric-label">Nuevos</span>
          <span className={`admin-metric-value ${loading ? "loading" : ""}`}>
            {loading ? "..." : stats.new_users}
          </span>
          <span className="admin-metric-note">Ultimos 7 dias</span>
        </div>

        <div className="admin-metric admin-metric-inactive">
          <span className="admin-metric-label">Inactivos</span>
          <span className={`admin-metric-value ${loading ? "loading" : ""}`}>
            {loading ? "..." : stats.inactive_users}
          </span>
          <span className="admin-metric-note">+30 dias sin login</span>
        </div>
      </div>
    </>
  );
}
