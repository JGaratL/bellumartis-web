import {
  getEventStatusClass,
  getEventStatusLabel,
  getEventTypeClass,
  getEventTypeLabel,
} from "../../utils/eventHelpers";

export function EventTypeBadge({ value }) {
  return (
    <span className={`admin-event-badge ${getEventTypeClass(value)}`}>
      {getEventTypeLabel(value)}
    </span>
  );
}

export function EventStatusBadge({ value }) {
  return (
    <span className={`admin-event-badge ${getEventStatusClass(value)}`}>
      {getEventStatusLabel(value)}
    </span>
  );
}
