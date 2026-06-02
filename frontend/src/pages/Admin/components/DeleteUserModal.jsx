export default function DeleteUserModal({
  user,
  loading,
  onClose,
  onConfirm,
}) {
  if (!user) return null;

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onClick={onClose}
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
          ¿Seguro que quieres eliminar a {user.nickname}?
        </h3>
        <p className="admin-modal-copy">
          Esta accion borrara su cuenta y sus datos asociados. No se puede deshacer.
        </p>

        <div className="admin-modal-actions">
          <button
            type="button"
            className="admin-modal-btn secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="admin-modal-btn danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Eliminando..." : "Si, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
