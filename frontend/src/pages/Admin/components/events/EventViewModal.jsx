import { createPortal } from "react-dom";
import { getEventTypeLabel, formatEventDate } from "../../utils/eventHelpers";

export default function EventViewModal({ event, onClose }) {
  if (!event) return null;

  const isWebinar = event.event_type === "webinar";

  return createPortal(
    <div
      className="admin-modal-backdrop admin-event-view-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="admin-modal admin-event-view-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-event-view-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="admin-modal-kicker">Detalle del evento</p>

        <h3 id="admin-event-view-title">{event.title}</h3>

        <div className="admin-event-view-grid">
          <p>
            <strong>Tipo:</strong> {getEventTypeLabel(event.event_type)}
          </p>
          <p>
            <strong>Fecha:</strong> {formatEventDate(event.date)}
          </p>
          <p>
            <strong>Hora:</strong> {String(event.time || "").slice(0, 5) || "-"}
          </p>
          {!isWebinar && (
            <p>
              <strong>Provincia:</strong> {event.province || "-"}
            </p>
          )}
        </div>

        <p className="admin-event-view-description">
          {event.description || "Sin descripción."}
        </p>

        <div className="admin-modal-actions admin-event-view-actions">
          <button
            type="button"
            className="admin-modal-btn secondary"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
