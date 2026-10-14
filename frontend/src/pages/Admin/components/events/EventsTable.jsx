import EventActions from "./EventActions";
import { EventStatusBadge, EventTypeBadge } from "./EventBadge";
import {
  formatEventDateTime,
} from "../../utils/eventHelpers";

export default function EventsTable({
  events,
  loading,
  onOpenViewEvent,
  onOpenEditEvent,
  onOpenCancelEvent,
  onOpenDeleteEvent,
}) {
  if (loading) {
    return <p className="admin-table-loading">Cargando eventos...</p>;
  }

  if (!events.length) {
    return <p className="admin-table-empty">No hay eventos para mostrar.</p>;
  }

  return (
    <table className="admin-users-table admin-events-table">
      <thead>
        <tr>
          <th>Título</th>
          <th>Tipo</th>
          <th>Fecha y hora</th>
          <th>Ubicación</th>
          <th>Interesados</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>

      <tbody>
        {events.map((event) => (
          <tr key={event.id}>
            <td>
              <span className="admin-strong-cell">{event.title}</span>
            </td>
            <td>
              <EventTypeBadge value={event.event_type} />
            </td>
            <td>{formatEventDateTime(event)}</td>
            <td>{event.province || "-"}</td>
            <td className="admin-posts-cell">{Number(event.attendees || 0)}</td>
            <td>
              <EventStatusBadge value={event.status} />
            </td>
            <td>
              <EventActions
                onView={() => onOpenViewEvent(event)}
                onEdit={() => onOpenEditEvent(event)}
                onCancel={() => onOpenCancelEvent(event)}
                onDelete={() => onOpenDeleteEvent(event)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
