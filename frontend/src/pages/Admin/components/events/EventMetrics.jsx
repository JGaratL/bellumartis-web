export default function EventMetrics({ stats, loading, error }) {
  return (
    <>
      {error && <p className="admin-stats-error">{error}</p>}

      <div className="admin-metrics admin-events-metrics">
        <div className="admin-metric admin-metric-total">
          <span className="admin-metric-label">Total Eventos</span>
          <span className={`admin-metric-value ${loading ? "loading" : ""}`}>
            {loading ? "..." : stats.total_events}
          </span>
        </div>

        <div className="admin-metric admin-metric-active">
          <span className="admin-metric-label">Próximos</span>
          <span className={`admin-metric-value ${loading ? "loading" : ""}`}>
            {loading ? "..." : stats.upcoming_events}
          </span>
          <span className="admin-metric-note">Fechas futuras o en curso</span>
        </div>

        <div className="admin-metric admin-metric-new">
          <span className="admin-metric-label">Pasados</span>
          <span className={`admin-metric-value ${loading ? "loading" : ""}`}>
            {loading ? "..." : stats.past_events}
          </span>
          <span className="admin-metric-note">Finalizados o ya celebrados</span>
        </div>

        <div className="admin-metric admin-metric-inactive">
          <span className="admin-metric-label">Usuarios interesados</span>
          <span className={`admin-metric-value ${loading ? "loading" : ""}`}>
            {loading ? "..." : stats.interested_users}
          </span>
          <span className="admin-metric-note">Total de inscripciones</span>
        </div>
      </div>
    </>
  );
}
