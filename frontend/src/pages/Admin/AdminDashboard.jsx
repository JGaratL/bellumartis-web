import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import api from "../../api";
import AdminSidebar from "./components/AdminSidebar";
import AdminHero from "./components/AdminHero";
import DeleteUserModal from "./components/DeleteUserModal";
import UsersSection from "./sections/UsersSection";
import EventsSection from "./sections/EventsSection";
import EmailsSection from "./sections/EmailsSection";
import BannersSection from "./sections/BannersSection";
import ArticlesSection from "./sections/ArticlesSection";
import AdminUserViewModal from "./components/users/AdminUserViewModal";
import AdminUserRoleModal from "./components/users/AdminUserRoleModal";
import AdminUserStatusModal from "./components/users/AdminUserStatusModal";
import {
  ADMIN_MENU,
  LAST_LOGIN_OPTIONS,
  PROVINCE_OPTIONS,
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  getActiveAdminSection,
  getAdminPathForSection,
  getAdminSectionFromPathname,
} from "./utils/adminHelpers";

import "./AdminDashboard.css";

const USERS_PAGE_SIZE = 20;

function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("usuarios");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoadingMore, setUsersLoadingMore] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [usersHasMore, setUsersHasMore] = useState(true);
  const [usersPage, setUsersPage] = useState(0);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [lastLoginFilter, setLastLoginFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [viewTarget, setViewTarget] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [roleTarget, setRoleTarget] = useState(null);
  const [roleValue, setRoleValue] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleFeedback, setRoleFeedback] = useState("");
  const [roleFeedbackType, setRoleFeedbackType] = useState("");
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState("");
  const [statusFeedbackType, setStatusFeedbackType] = useState("");
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [userStats, setUserStats] = useState({
    total_users: 0,
    active_users: 0,
    new_users: 0,
    inactive_users: 0,
  });
  const [eventStats, setEventStats] = useState({
    total_events: 0,
    upcoming_events: 0,
    past_events: 0,
    interested_users: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [eventStatsLoading, setEventStatsLoading] = useState(false);
  const [eventStatsError, setEventStatsError] = useState("");
  const loadMoreRef = useRef(null);
  const requestIdRef = useRef(0);
  const inFlightUsersRequestRef = useRef("");

  const activeMeta = useMemo(
    () => getActiveAdminSection(activeSection),
    [activeSection]
  );

  useEffect(() => {
    const nextSection = getAdminSectionFromPathname(location.pathname);
    setActiveSection((current) =>
      current === nextSection ? current : nextSection
    );
  }, [location.pathname]);

  const handleSectionChange = useCallback(
    (sectionId) => {
      setActiveSection(sectionId);
      navigate(getAdminPathForSection(sectionId));
    },
    [navigate]
  );

  const usersQueryKey = useMemo(
    () =>
      [
        searchQuery.trim(),
        roleFilter,
        provinceFilter,
        statusFilter,
        lastLoginFilter,
      ].join("|"),
    [lastLoginFilter, provinceFilter, roleFilter, searchQuery, statusFilter]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchDraft.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchDraft]);

  const loadUsers = useCallback(
    async ({ page = 0, append = false } = {}) => {
      if (activeSection !== "usuarios") return;

      const requestKey = [
        page,
        append ? "append" : "replace",
        searchQuery.trim(),
        roleFilter,
        provinceFilter,
        statusFilter,
        lastLoginFilter,
      ].join("|");

      if (inFlightUsersRequestRef.current === requestKey) {
        return;
      }

      inFlightUsersRequestRef.current = requestKey;
      const requestId = ++requestIdRef.current;

      try {
        if (append) {
          setUsersLoadingMore(true);
        } else {
          setUsersLoading(true);
          setUsersError("");
        }

        const res = await api.get("/admin/users", {
          params: {
            q: searchQuery.trim() || undefined,
            role: roleFilter || undefined,
            province: provinceFilter || undefined,
            status: statusFilter || undefined,
            lastLogin: lastLoginFilter || undefined,
            limit: USERS_PAGE_SIZE,
            offset: page * USERS_PAGE_SIZE,
          },
        });

        if (requestId !== requestIdRef.current) return;

        const nextUsers = Array.isArray(res.data?.users) ? res.data.users : [];
        setUsers((current) => (append ? [...current, ...nextUsers] : nextUsers));
        setUsersHasMore(Boolean(res.data?.hasMore));
        setUsersPage(page);
        setUsersError("");
      } catch (err) {
        if (requestId !== requestIdRef.current) return;

        console.error("ADMIN USERS ERROR:", err);
        setUsersError(
          err?.response?.data?.error || "No se pudo cargar la lista de usuarios"
        );
        setUsersHasMore(false);
      } finally {
        if (requestId === requestIdRef.current) {
          setUsersLoading(false);
          setUsersLoadingMore(false);
        }

        if (inFlightUsersRequestRef.current === requestKey) {
          inFlightUsersRequestRef.current = "";
        }
      }
    },
    [activeSection, lastLoginFilter, provinceFilter, roleFilter, searchQuery, statusFilter]
  );

  useEffect(() => {
    if (activeSection !== "usuarios") return;

    setUsersError("");
    setUsersHasMore(true);
    setUsersPage(0);
    loadUsers({ page: 0, append: false });
  }, [activeSection, loadUsers, usersQueryKey]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || activeSection !== "usuarios") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          entry?.isIntersecting &&
          users.length > 0 &&
          usersHasMore &&
          !usersLoading &&
          !usersLoadingMore
        ) {
          loadUsers({ page: usersPage + 1, append: true });
        }
      },
      {
        root: null,
        rootMargin: "240px",
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    activeSection,
    loadUsers,
    users.length,
    usersHasMore,
    usersLoading,
    usersLoadingMore,
    usersPage,
  ]);

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

  const refreshEventStats = useCallback(async () => {
    if (activeSection !== "eventos") return;

    try {
      setEventStatsLoading(true);
      setEventStatsError("");

      const res = await api.get("/admin/events/stats");
      setEventStats({
        total_events: Number(res.data?.total_events || 0),
        upcoming_events: Number(res.data?.upcoming_events || 0),
        past_events: Number(res.data?.past_events || 0),
        interested_users: Number(res.data?.interested_users || 0),
      });
    } catch (err) {
      console.error("ADMIN EVENTS STATS ERROR:", err);
      setEventStatsError(
        err?.response?.data?.error || "No se pudieron cargar las metricas de eventos"
      );
    } finally {
      setEventStatsLoading(false);
    }
  }, [activeSection]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    refreshEventStats();
  }, [refreshEventStats]);

  const openDeleteModal = (user) => {
    setDeleteTarget(user);
    setDeleteMessage("");
    setDeleteError("");
  };

  const clearUserFilters = useCallback(() => {
    setSearchDraft("");
    setSearchQuery("");
    setRoleFilter("");
    setProvinceFilter("");
    setStatusFilter("");
    setLastLoginFilter("");
    setUsersError("");
    setUsersPage(0);
  }, []);

  const openViewUser = useCallback(async (user) => {
    if (!user?.id) return;

    setViewTarget(null);
    setViewLoading(true);
    setViewError("");

    try {
      const res = await api.get(`/api/users/${user.id}`);
      setViewTarget(res.data || null);
    } catch (err) {
      console.error("ADMIN VIEW USER ERROR:", err);
      setViewError(
        err?.response?.data?.error || "No se pudo cargar el usuario"
      );
    } finally {
      setViewLoading(false);
    }
  }, []);

  const closeViewUser = useCallback(() => {
    setViewTarget(null);
    setViewLoading(false);
    setViewError("");
  }, []);

  const openEditUser = useCallback((user) => {
    if (!user?.id) return;
    setRoleTarget(user);
    setRoleValue(user.role || "user");
    setRoleFeedback("");
    setRoleFeedbackType("");
  }, []);

  const closeEditUser = useCallback(() => {
    setRoleTarget(null);
    setRoleValue("");
    setRoleSaving(false);
    setRoleFeedback("");
    setRoleFeedbackType("");
  }, []);

  const saveUserRole = useCallback(async () => {
    if (!roleTarget?.id || roleSaving) return;

    try {
      setRoleSaving(true);
      setRoleFeedback("");
      setRoleFeedbackType("");

      const res = await api.put(`/admin/users/${roleTarget.id}`, {
        role: roleValue,
      });

      const updatedUser = res.data?.user;
      if (updatedUser?.id) {
        setUsers((current) =>
          current.map((item) =>
            item.id === updatedUser.id
              ? { ...item, role: updatedUser.role }
              : item
          )
        );
      } else {
        setUsers((current) =>
          current.map((item) =>
            item.id === roleTarget.id ? { ...item, role: roleValue } : item
          )
        );
      }

      if (viewTarget?.id === roleTarget.id && updatedUser?.id) {
        setViewTarget((current) =>
          current && current.id === updatedUser.id
            ? { ...current, role: updatedUser.role }
            : current
        );
      }

      setRoleFeedback("Rol actualizado correctamente");
      setRoleFeedbackType("success");
      setTimeout(() => {
        closeEditUser();
      }, 800);
    } catch (err) {
      console.error("ADMIN UPDATE ROLE ERROR:", err);
      setRoleFeedbackType("error");
      setRoleFeedback(
        err?.response?.data?.error || "No se pudo actualizar el rol"
      );
    } finally {
      setRoleSaving(false);
    }
  }, [closeEditUser, roleSaving, roleTarget?.id, roleValue, viewTarget?.id]);

  const openBlockUser = useCallback((user) => {
    if (!user?.id) return;
    setStatusTarget(user);
    setStatusFeedback("");
    setStatusFeedbackType("");
  }, []);

  const closeBlockUser = useCallback(() => {
    setStatusTarget(null);
    setStatusSaving(false);
    setStatusFeedback("");
    setStatusFeedbackType("");
  }, []);

  const confirmBlockUser = useCallback(async () => {
    if (!statusTarget?.id || statusSaving) return;

    const nextStatus = statusTarget.status === "active" ? "inactive" : "active";

    try {
      setStatusSaving(true);
      setStatusFeedback("");
      setStatusFeedbackType("");

      const res = await api.put(`/admin/users/${statusTarget.id}`, {
        status: nextStatus,
      });

      const updatedUser = res.data?.user;
      setUsers((current) =>
        current.map((item) =>
          item.id === statusTarget.id
            ? { ...item, status: updatedUser?.status || nextStatus }
            : item
        )
      );

      if (viewTarget?.id === statusTarget.id && updatedUser?.id) {
        setViewTarget((current) =>
          current && current.id === updatedUser.id
            ? { ...current, status: updatedUser.status }
            : current
        );
      }

      setStatusFeedback(res.data?.message || "Estado actualizado correctamente");
      setStatusFeedbackType("success");
      setTimeout(() => {
        closeBlockUser();
      }, 800);
    } catch (err) {
      console.error("ADMIN UPDATE STATUS ERROR:", err);
      setStatusFeedbackType("error");
      setStatusFeedback(
        err?.response?.data?.error || "No se pudo actualizar el estado"
      );
    } finally {
      setStatusSaving(false);
    }
  }, [closeBlockUser, statusSaving, statusTarget?.id, statusTarget?.status, viewTarget?.id]);

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

      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id));
      await refreshStats();
    } catch (err) {
      console.error("DELETE ADMIN USER ERROR:", err);
      setDeleteError(
        err?.response?.data?.error || "No se pudo eliminar el usuario"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "usuarios":
        return (
          <UsersSection
            users={users}
            usersLoading={usersLoading}
            usersLoadingMore={usersLoadingMore}
            usersError={usersError}
            deleteMessage={deleteMessage}
            deleteError={deleteError}
            hasMore={usersHasMore}
            loadMoreRef={loadMoreRef}
            searchValue={searchDraft}
            onSearchChange={setSearchDraft}
            roleValue={roleFilter}
            onRoleChange={setRoleFilter}
            provinceValue={provinceFilter}
            onProvinceChange={setProvinceFilter}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          lastLoginValue={lastLoginFilter}
          onLastLoginChange={setLastLoginFilter}
          roleOptions={ROLE_OPTIONS}
          provinceOptions={PROVINCE_OPTIONS}
          statusOptions={STATUS_OPTIONS}
          lastLoginOptions={LAST_LOGIN_OPTIONS}
          onClearFilters={clearUserFilters}
          onOpenViewUser={openViewUser}
          onOpenEditUser={openEditUser}
          onOpenBlockUser={openBlockUser}
          onOpenDeleteUser={openDeleteModal}
        />
        );
      case "eventos":
        return (
          <EventsSection
            createOpen={createEventOpen}
            onCloseCreate={() => setCreateEventOpen(false)}
          />
        );
      case "emails":
        return <EmailsSection title={activeMeta.label} />;
      case "banners":
        return <BannersSection />;
      case "articulos":
        return <ArticlesSection title={activeMeta.label} />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar
        activeSection={activeSection}
        menuItems={ADMIN_MENU}
        onSectionChange={handleSectionChange}
        onBack={() => navigate("/")}
      />

      <main className="admin-main">
        <AdminHero
          title={activeMeta.label}
          description={activeMeta.description}
          icon={activeMeta.icon}
          actionNode={
            activeSection === "eventos" ? (
              <button
                type="button"
                className="admin-events-create-btn"
                onClick={() => setCreateEventOpen(true)}
              >
                + Crear Evento
              </button>
            ) : null
          }
          showIcon={activeSection !== "eventos"}
          showMetrics={activeSection === "usuarios" || activeSection === "eventos"}
          metricsVariant={activeSection === "eventos" ? "events" : "users"}
          stats={activeSection === "eventos" ? eventStats : userStats}
          statsLoading={activeSection === "eventos" ? eventStatsLoading : statsLoading}
          statsError={activeSection === "eventos" ? eventStatsError : statsError}
        />

        {renderContent()}

        <DeleteUserModal
          user={deleteTarget}
          loading={deleteLoading}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteUser}
        />

        <AdminUserViewModal
          user={viewTarget}
          loading={viewLoading}
          error={viewError}
          onClose={closeViewUser}
        />

        <AdminUserRoleModal
          user={roleTarget}
          value={roleValue}
          saving={roleSaving}
          feedback={roleFeedback}
          feedbackType={roleFeedbackType}
          onChange={setRoleValue}
          onClose={closeEditUser}
          onSave={saveUserRole}
        />

        <AdminUserStatusModal
          user={statusTarget}
          saving={statusSaving}
          feedback={statusFeedback}
          feedbackType={statusFeedbackType}
          onClose={closeBlockUser}
          onConfirm={confirmBlockUser}
        />
      </main>
    </div>
  );
}

export default AdminDashboard;
