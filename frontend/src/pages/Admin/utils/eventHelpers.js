import { SPAIN_PROVINCES } from "../../../utils/spainProvinces";

export const EVENT_TYPE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "charla", label: "Conferencia" },
  { value: "firma", label: "Firma de libros" },
  { value: "webinar", label: "Webinar/Seminario" },
];

export const EVENT_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "finished", label: "Terminado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "scheduled", label: "Programado" },
  { value: "ongoing", label: "En curso" },
];

export const EVENT_PROVINCE_OPTIONS = [
  { value: "all", label: "Todas" },
  ...SPAIN_PROVINCES.map((province) => ({
    value: province,
    label: province,
  })),
];

export const EVENT_TYPE_LABELS = {
  charla: "Charla",
  firma: "Firma",
  webinar: "Webinar",
  sorteo: "Sorteo",
};

export const EVENT_STATUS_LABELS = {
  scheduled: "Programado",
  ongoing: "En curso",
  finished: "Terminado",
  cancelled: "Cancelado",
};

export function formatEventDate(value) {
  if (!value) return "-";
  let year;
  let month;
  let day;

  if (value instanceof Date) {
    year = value.getFullYear();
    month = value.getMonth() + 1;
    day = value.getDate();
  } else {
    const raw = String(value).trim();
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (isoMatch) {
      year = Number(isoMatch[1]);
      month = Number(isoMatch[2]);
      day = Number(isoMatch[3]);
    } else {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return "-";
      year = parsed.getFullYear();
      month = parsed.getMonth() + 1;
      day = parsed.getDate();
    }
  }

  if (!year || !month || !day) return "-";

  const monthNames = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];

  const monthLabel = monthNames[month - 1];
  if (!monthLabel) return `${day}/${String(month).padStart(2, "0")}/${year}`;

  return `${day} ${monthLabel} ${year}`;
}

export function formatEventTime(value) {
  if (!value) return "-";
  return String(value).slice(0, 5);
}

export function normalizeEventDateValue(value) {
  if (!value) return "";

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatEventDateTime(event) {
  const date = formatEventDate(event?.date);
  const time = formatEventTime(event?.time);

  if (date === "-" && time === "-") return "-";
  if (date === "-") return time;
  if (time === "-") return date;
  return `${date} · ${time}`;
}

export function getEventTypeLabel(value) {
  return EVENT_TYPE_LABELS[value] || value || "-";
}

export function getEventStatusLabel(value) {
  return EVENT_STATUS_LABELS[value] || value || "-";
}

export function getEventTypeClass(value) {
  return `event-type-${value || "unknown"}`;
}

export function getEventStatusClass(value) {
  return `event-status-${value || "unknown"}`;
}
