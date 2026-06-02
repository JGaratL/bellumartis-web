import UserMetrics from "./users/UserMetrics";

export default function AdminHero({
  title,
  description,
  icon: Icon,
  stats,
  statsLoading,
  statsError,
  showMetrics = false,
}) {
  return (
    <section className="admin-hero">
      <div className="admin-hero-head">
        <div>
          <h2 className="admin-hero-title">{title}</h2>
          <p className="admin-hero-copy">{description}</p>
        </div>

        <div className="admin-hero-icon">{Icon ? <Icon /> : null}</div>
      </div>

      {showMetrics && (
        <div className="admin-hero-metrics">
          <UserMetrics stats={stats} loading={statsLoading} error={statsError} />
        </div>
      )}
    </section>
  );
}
