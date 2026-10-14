import { createPortal } from "react-dom";

export default function EventConfirmModal({
  event,
  loading,
  title,
  copy,
  confirmLabel,
  onClose,
  onConfirm,
  danger = false,
}) {
  if (!event) return null;

  return createPortal(
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="admin-modal-kicker">Gestión de evento</p>

        <h3 id="event-confirm-title">{title}</h3>

        <p className="admin-modal-copy">{copy}</p>

        <p className="admin-modal-copy admin-modal-strong">
          Evento: {event.title}
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
            className={`admin-modal-btn ${danger ? "danger" : ""}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}