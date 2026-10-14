import UserMetrics from "./users/UserMetrics";
import EventMetrics from "./events/EventMetrics";

export default function AdminHero({
  title,
  description,
  icon: Icon,
  stats,
  statsLoading,
  statsError,
  showMetrics = false,
  metricsVariant = "users",
  actionNode = null,
  showIcon = true,
}) {
  const MetricsComponent =
    metricsVariant === "events" ? EventMetrics : UserMetrics;

  return (
    <section className="admin-hero">
      <div className="admin-hero-head">
        <div>
          <h2 className="admin-hero-title">{title}</h2>
          <p className="admin-hero-copy">{description}</p>
        </div>

        <div className="admin-hero-head-right">
          {actionNode}
          {showIcon && (
            <div className="admin-hero-icon">{Icon ? <Icon /> : null}</div>
          )}
        </div>
      </div>

      {showMetrics && (
        <div className="admin-hero-metrics">
          <MetricsComponent
            stats={stats}
            loading={statsLoading}
            error={statsError}
          />
        </div>
      )}
    </section>
  );
}
