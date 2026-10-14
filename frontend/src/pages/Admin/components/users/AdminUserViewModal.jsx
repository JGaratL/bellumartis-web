import ProfileCard from "../../../../components/ProfileCard";

export default function AdminUserViewModal({
  user,
  loading,
  error,
  onClose,
}) {
  if (!user && !loading && !error) return null;

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-user-view-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {loading ? (
          <p className="admin-table-loading">Cargando usuario...</p>
        ) : error ? (
          <div>
            <p className="admin-modal-copy admin-modal-error">{error}</p>
            <div className="admin-modal-actions" style={{ marginTop: "18px" }}>
              <button
                type="button"
                className="admin-modal-btn secondary"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <ProfileCard
            user={user}
            editable={false}
            onClose={onClose}
            showAvatar={false}
          />
        )}
      </div>
    </div>
  );
}
