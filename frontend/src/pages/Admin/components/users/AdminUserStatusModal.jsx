export default function AdminUserStatusModal({
  user,
  saving,
  feedback,
  feedbackType,
  onClose,
  onConfirm,
}) {
  if (!user) return null;

  const isActive = user.status === "active";
  const title = isActive ? "Bloquear usuario" : "Desbloquear usuario";
  const nextBlockingState = isActive ? "Bloqueado" : "Habilitado";
  const actionText = isActive ? "bloqueado" : "desbloqueado";

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-status-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="admin-modal-kicker">Estado de usuario</p>
        <h3 id="admin-user-status-title">
          {title} a {user.nickname}
        </h3>
        <p className="admin-modal-copy">
          El estado del usuario será <strong>{nextBlockingState}</strong>.
        </p>
        <p className="admin-modal-copy admin-modal-strong">
          Al confirmar, el usuario será {actionText}.
        </p>

        {feedback && (
          <p
            className={`admin-modal-copy ${
              feedbackType === "error"
                ? "admin-modal-error"
                : "admin-modal-success"
            }`}
          >
            {feedback}
          </p>
        )}

        <div className="admin-modal-actions">
          <button
            type="button"
            className="admin-modal-btn secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="admin-modal-btn danger"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
