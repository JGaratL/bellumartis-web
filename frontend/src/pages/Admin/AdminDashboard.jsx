import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../api";
import AdminSidebar from "./components/AdminSidebar";
import AdminHero from "./components/AdminHero";
import DeleteUserModal from "./components/DeleteUserModal";
import UsersSection from "./sections/UsersSection";
import EventsSection from "./sections/EventsSection";
import EmailsSection from "./sections/EmailsSection";
import BannersSection from "./sections/BannersSection";
import ArticlesSection from "./sections/ArticlesSection";
import {
  ADMIN_MENU,
  LAST_LOGIN_OPTIONS,
  PROVINCE_OPTIONS,
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  getActiveAdminSection,
} from "./utils/adminHelpers";

import "./AdminDashboard.css";

const USERS_PAGE_SIZE = 20;

function AdminDashboard() {
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
  const [userStats, setUserStats] = useState({
    total_users: 0,
    active_users: 0,
    new_users: 0,
    inactive_users: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const loadMoreRef = useRef(null);
  const requestIdRef = useRef(0);
  const usersCacheRef = useRef(new Map());

  const activeMeta = useMemo(
    () => getActiveAdminSection(activeSection),
    [activeSection]
  );

  const usersFilters = useMemo(
    () => ({
      q: searchQuery.trim(),
      role: roleFilter,
      province: provinceFilter,
      status: statusFilter,
      lastLogin: lastLoginFilter,
    }),
    [lastLoginFilter, provinceFilter, roleFilter, searchQuery, statusFilter]
  );

  const usersCacheKey = useMemo(
    () => JSON.stringify(usersFilters),
    [usersFilters]
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

      const requestId = ++requestIdRef.current;
      const cacheKey = usersCacheKey;

      if (!append && page === 0) {
        const cachedEntry = usersCacheRef.current.get(cacheKey);
        if (cachedEntry) {
          setUsers(cachedEntry.users);
          setUsersHasMore(Boolean(cachedEntry.hasMore));
          setUsersPage(Number(cachedEntry.page || 0));
          setUsersError("");
          setUsersLoading(false);
          setUsersLoadingMore(false);
          return;
        }
      }

      try {
        if (append) {
          setUsersLoadingMore(true);
        } else {
          setUsersLoading(true);
          setUsersError("");
          setUsers([]);
        }

        const res = await api.get("/admin/users", {
          params: {
            q: usersFilters.q || undefined,
            role: usersFilters.role || undefined,
            province: usersFilters.province || undefined,
            status: usersFilters.status || undefined,
            lastLogin: usersFilters.lastLogin || undefined,
            limit: USERS_PAGE_SIZE,
            offset: page * USERS_PAGE_SIZE,
          },
        });

        if (requestId !== requestIdRef.current) return;

        const nextUsers = Array.isArray(res.data?.users) ? res.data.users : [];
        const previousUsers = append
          ? usersCacheRef.current.get(cacheKey)?.users || []
          : [];
        const mergedUsers = append
          ? [...previousUsers, ...nextUsers]
          : nextUsers;

        setUsers(mergedUsers);
        setUsersHasMore(Boolean(res.data?.hasMore));
        setUsersPage(page);
        setUsersError("");

        usersCacheRef.current.set(cacheKey, {
          users: mergedUsers,
          hasMore: Boolean(res.data?.hasMore),
          page,
        });
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
      }
    },
    [
      activeSection,
      usersFilters,
      usersCacheKey,
    ]
  );

  useEffect(() => {
    if (activeSection !== "usuarios") return;

    loadUsers({ page: 0, append: false });
  }, [loadUsers, activeSection]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || activeSection !== "usuarios") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          entry?.isIntersecting &&
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

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

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
  }, []);

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
      usersCacheRef.current.forEach((entry, key) => {
        usersCacheRef.current.set(key, {
          ...entry,
          users: entry.users.filter((user) => user.id !== deleteTarget.id),
        });
      });
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
            onOpenDeleteUser={openDeleteModal}
          />
        );
      case "eventos":
        return <EventsSection title={activeMeta.label} />;
      case "emails":
        return <EmailsSection title={activeMeta.label} />;
      case "banners":
        return <BannersSection title={activeMeta.label} />;
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
        onSectionChange={setActiveSection}
        onBack={() => navigate("/")}
      />

      <main className="admin-main">
        <AdminHero
          title={activeMeta.label}
          description={activeMeta.description}
          icon={activeMeta.icon}
          showMetrics={activeSection === "usuarios"}
          stats={userStats}
          statsLoading={statsLoading}
          statsError={statsError}
        />

        {renderContent()}

        <DeleteUserModal
          user={deleteTarget}
          loading={deleteLoading}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteUser}
        />
      </main>
    </div>
  );
}

export default AdminDashboard;
