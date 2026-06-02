import UsersTable from "../components/users/UsersTable";
import AdminUsersFilters from "../components/users/AdminUsersFilters";

export default function UsersSection({
  users,
  usersLoading,
  usersLoadingMore,
  usersError,
  deleteMessage,
  deleteError,
  hasMore,
  loadMoreRef,
  searchValue,
  onSearchChange,
  roleValue,
  onRoleChange,
  provinceValue,
  onProvinceChange,
  statusValue,
  onStatusChange,
  lastLoginValue,
  onLastLoginChange,
  roleOptions,
  provinceOptions,
  statusOptions,
  lastLoginOptions,
  onClearFilters,
  onOpenDeleteUser,
}) {
  return (
    <section className="admin-card admin-users-card">
      <AdminUsersFilters
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        roleValue={roleValue}
        onRoleChange={onRoleChange}
        provinceValue={provinceValue}
        onProvinceChange={onProvinceChange}
        statusValue={statusValue}
        onStatusChange={onStatusChange}
        lastLoginValue={lastLoginValue}
        onLastLoginChange={onLastLoginChange}
        roleOptions={roleOptions}
        provinceOptions={provinceOptions}
        statusOptions={statusOptions}
        lastLoginOptions={lastLoginOptions}
        onClearFilters={onClearFilters}
      />

      <div className="admin-table-wrap">
        {usersError && <p className="admin-table-error">{usersError}</p>}
        {deleteMessage && <p className="admin-table-success">{deleteMessage}</p>}
        {deleteError && <p className="admin-table-error">{deleteError}</p>}

        <UsersTable
          users={users}
          loading={usersLoading}
          onOpenDeleteUser={onOpenDeleteUser}
        />

        <div ref={loadMoreRef} className="admin-users-sentinel">
          {usersLoadingMore && (
            <p className="admin-table-loading">Cargando más usuarios...</p>
          )}
          {!usersLoadingMore && !hasMore && users.length > 0 && (
            <p className="admin-table-loading">No hay más resultados.</p>
          )}
        </div>
      </div>
    </section>
  );
}
