import { ROLE_OPTIONS } from "../../utils/adminHelpers";

const editableRoleOptions = ROLE_OPTIONS.filter((option) => option.value !== "all");

export default function AdminUserRoleModal({
  user,
  value,
  saving,
  feedback,
  feedbackType,
  onChange,
  onClose,
  onSave,
}) {
  if (!user) return null;

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-role-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="admin-modal-kicker">Editar rol</p>
        <h3 id="admin-user-role-title">
          Cambiar rol de {user.nickname}
        </h3>
        <p className="admin-modal-copy">
          Selecciona el nuevo rol para este usuario.
        </p>

        <div className="admin-user-role-field">
          <label className="admin-user-role-label" htmlFor="admin-user-role-select">
            Rol
          </label>
          <select
            id="admin-user-role-select"
            className="admin-user-role-select"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={saving}
          >
            {editableRoleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

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
            className="admin-modal-btn"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
