import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RiAdminLine,
  RiTeamLine,
  RiCalendarEventLine,
  RiMailLine,
  RiImageLine,
  RiArticleLine,
  RiArrowRightSLine,
  RiEyeLine,
  RiPencilLine,
  RiProhibitedLine,
  RiDeleteBinLine,
} from "react-icons/ri";

import api from "../../api";

import "./AdminDashboard.css";

const ADMIN_MENU = [
  {
    id: "usuarios",
    label: "Usuarios",
    icon: RiTeamLine,
    description: "Gestiona altas, roles, estados y acceso de usuarios.",
  },
  {
    id: "eventos",
    label: "Eventos",
    icon: RiCalendarEventLine,
    description: "Crea, edita y supervisa eventos del calendario.",
  },
  {
    id: "emails",
    label: "Emails",
    icon: RiMailLine,
    description: "Controla notificaciones, verificacion y plantillas.",
  },
  {
    id: "banners",
    label: "Banners",
    icon: RiImageLine,
    description: "Administra la parte visual promocional de la web.",
  },
  {
    id: "articulos",
    label: "Articulos",
    icon: RiArticleLine,
    description: "Modera publicaciones y contenidos editoriales.",
  },
];

const ROLE_LABELS = {
  user: "User",
  admin: "Admin",
  owner: "Owner",
  moderator: "Mod",
};

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("es-ES");
}

function getLocation(user) {
  return user?.province || user?.country || "-";
}

function getRoleClass(role) {
  if (role === "admin") return "role-admin";
  if (role === "owner") return "role-owner";
  if (role === "moderator") return "role-moderator";
  return "role-user";
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("usuarios");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [userStats, setUserStats] = useState({
    total_users: 0,
    active_users: 0,
    new_users: 0,
    inactive_users: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  const activeMeta = useMemo(
    () => ADMIN_MENU.find((item) => item.id === activeSection) || ADMIN_MENU[0],
    [activeSection]
  );

  const ActiveIcon = activeMeta.icon;

  const refreshUsers = useCallback(async () => {
    if (activeSection !== "usuarios") return;

    try {
      setUsersLoading(true);
      setUsersError("");

      const res = await api.get("/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("ADMIN USERS ERROR:", err);
      setUsersError(
        err?.response?.data?.error || "No se pudo cargar la lista de usuarios"
      );
    } finally {
      setUsersLoading(false);
    }
  }, [activeSection]);

  const refreshStats = useCallback(async () => {
    if (activeSection !== "usuarios") return;

    try {
      setStatsLoading(true);
      setStatsError("");

      const res = await api.get("/admin/users/stats");
      setUserStats({
        total_users: Number(res.data?.total_users || 0),
        active_users: Number(res.data?.active_users || 0),
        new_users: Number(res.data?.new_users || 0),
        inactive_users: Number(res.data?.inactive_users || 0),
      });
    } catch (err) {
      console.error("ADMIN USERS STATS ERROR:", err);
      setStatsError(
        err?.response?.data?.error || "No se pudieron cargar las metricas"
      );
    } finally {
      setStatsLoading(false);
    }
  }, [activeSection]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const openDeleteModal = (user) => {
    setDeleteTarget(user);
    setDeleteMessage("");
    setDeleteError("");
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setDeleteTarget(null);
    setDeleteMessage("");
    setDeleteError("");
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget || deleteLoading) return;

    try {
      setDeleteLoading(true);
      setDeleteMessage("");
      setDeleteError("");

      const res = await api.delete(`/admin/users/${deleteTarget.id}`);
      setDeleteMessage(res.data?.message || "Usuario eliminado correctamente");
      setDeleteTarget(null);
      await Promise.all([refreshUsers(), refreshStats()]);
    } catch (err) {
      console.error("DELETE ADMIN USER ERROR:", err);
      setDeleteError(
        err?.response?.data?.error || "No se pudo eliminar el usuario"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="admin-shell">
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
          {ADMIN_MENU.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`admin-menu-item ${isActive ? "active" : ""}`}
                onClick={() => setActiveSection(item.id)}
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

        <button
          type="button"
          className="admin-back"
          onClick={() => navigate("/")}
        >
          Volver a la web
        </button>
      </aside>

      <main className="admin-main">
        <section className="admin-hero">
          <div className="admin-hero-head">
            <div>
              <h2 className="admin-hero-title">{activeMeta.label}</h2>
              <p className="admin-hero-copy">{activeMeta.description}</p>
            </div>

            <div className="admin-hero-icon">
              <ActiveIcon />
            </div>
          </div>

          {activeSection === "usuarios" && (
            <>
              {statsError && <p className="admin-stats-error">{statsError}</p>}

              <div className="admin-metrics">
                <div className="admin-metric admin-metric-total">
                  <span className="admin-metric-label">Total</span>
                  <span className={`admin-metric-value ${statsLoading ? "loading" : ""}`}>
                    {statsLoading ? "..." : userStats.total_users}
                  </span>
                </div>

                <div className="admin-metric admin-metric-active">
                  <span className="admin-metric-label">Activos</span>
                  <span className={`admin-metric-value ${statsLoading ? "loading" : ""}`}>
                    {statsLoading ? "..." : userStats.active_users}
                  </span>
                  <span className="admin-metric-note">Ultimos 30 dias</span>
                </div>

                <div className="admin-metric admin-metric-new">
                  <span className="admin-metric-label">Nuevos</span>
                  <span className={`admin-metric-value ${statsLoading ? "loading" : ""}`}>
                    {statsLoading ? "..." : userStats.new_users}
                  </span>
                  <span className="admin-metric-note">Ultimos 7 dias</span>
                </div>

                <div className="admin-metric admin-metric-inactive">
                  <span className="admin-metric-label">Inactivos</span>
                  <span className={`admin-metric-value ${statsLoading ? "loading" : ""}`}>
                    {statsLoading ? "..." : userStats.inactive_users}
                  </span>
                  <span className="admin-metric-note">+30 dias sin login</span>
                </div>
              </div>
            </>
          )}
        </section>

        {activeSection === "usuarios" ? (
          <section className="admin-card admin-users-card">
            <div className="admin-table-wrap">
              {usersError && <p className="admin-table-error">{usersError}</p>}
              {deleteMessage && <p className="admin-table-success">{deleteMessage}</p>}
              {deleteError && <p className="admin-table-error">{deleteError}</p>}

              {usersLoading ? (
                <p className="admin-table-loading">Cargando usuarios...</p>
              ) : (
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>Nickname</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Ubicacion</th>
                      <th>Registro</th>
                      <th>Ultimo Login</th>
                      <th>Posts</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <span className="admin-strong-cell">{user.nickname}</span>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`admin-role-badge ${getRoleClass(user.role)}`}>
                            {ROLE_LABELS[user.role] || "User"}
                          </span>
                        </td>
                        <td>{getLocation(user)}</td>
                        <td>{formatDate(user.created_at)}</td>
                        <td>{formatDate(user.last_login)}</td>
                        <td className="admin-posts-cell">{user.posts_count ?? ""}</td>
                        <td>
                          <div className="admin-actions">
                            <button
                              type="button"
                              className="admin-action-btn"
                              aria-label="Ver usuario"
                            >
                              <RiEyeLine />
                            </button>
                            <button
                              type="button"
                              className="admin-action-btn"
                              aria-label="Editar usuario"
                            >
                              <RiPencilLine />
                            </button>
                            <button
                              type="button"
                              className="admin-action-btn"
                              aria-label="Bloquear usuario"
                            >
                              <RiProhibitedLine />
                            </button>
                            <button
                              type="button"
                              className="admin-action-btn danger"
                              aria-label="Eliminar usuario"
                              onClick={() => openDeleteModal(user)}
                            >
                              <RiDeleteBinLine />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        ) : (
          <section className="admin-content">
            <div className="admin-card">
              <h3>{activeMeta.label}</h3>
              <p>
                Este espacio queda preparado para tus herramientas de gestion de{" "}
                {activeMeta.label.toLowerCase()}. Podemos conectar aqui tablas,
                filtros, edicion y acciones masivas cuando quieras.
              </p>
            </div>

            <div className="admin-card admin-card-soft">
              <p className="admin-stat-label">Estado actual</p>
              <p className="admin-stat-value">Seccion activa: {activeMeta.label}</p>
            </div>
          </section>
        )}

        {deleteTarget && (
          <div
            className="admin-modal-backdrop"
            role="presentation"
            onClick={closeDeleteModal}
          >
            <div
              className="admin-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-user-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="admin-modal-kicker">Eliminar usuario</p>
              <h3 id="delete-user-title">
                ¿Seguro que quieres eliminar a {deleteTarget.nickname}?
              </h3>
              <p className="admin-modal-copy">
                Esta accion borrara su cuenta y sus datos asociados. No se puede deshacer.
              </p>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-modal-btn secondary"
                  onClick={closeDeleteModal}
                  disabled={deleteLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="admin-modal-btn danger"
                  onClick={handleDeleteUser}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Eliminando..." : "Si, eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
