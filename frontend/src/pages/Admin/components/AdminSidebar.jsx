import { RiAdminLine, RiArrowRightSLine } from "react-icons/ri";

export default function AdminSidebar({
  activeSection,
  menuItems,
  onSectionChange,
  onBack,
}) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand-badge">
          <RiAdminLine />
        </div>

        <div>
          <p className="admin-brand-kicker">Dashboard</p>
          <h1 className="admin-brand-title">BellumArtis Admin</h1>
        </div>
      </div>

      <nav className="admin-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`admin-menu-item ${isActive ? "active" : ""}`}
              onClick={() => onSectionChange(item.id)}
            >
              <span className="admin-menu-icon">
                <Icon />
              </span>

              <span className="admin-menu-label">{item.label}</span>

              <RiArrowRightSLine className="admin-menu-chevron" />
            </button>
          );
        })}
      </nav>

      <button type="button" className="admin-back" onClick={onBack}>
        Volver a la web
      </button>
    </aside>
  );
}
