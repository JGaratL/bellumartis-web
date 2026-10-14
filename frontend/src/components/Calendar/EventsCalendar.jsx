import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FaRegCalendarAlt } from "react-icons/fa";

import api from "../../api";
import { resolveAssetUrl } from "../../utils/assetHelpers";
import "./Events.css";

const getSafeEventLink = (value) => {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

function Events() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);

  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const [selectedType, setSelectedType] = useState("Todos");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // =========================
  // MODAL STATE
  // =========================
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventJoined, setSelectedEventJoined] = useState(false);
  const [selectedEventLoading, setSelectedEventLoading] = useState(false);
  const [selectedEventActionLoading, setSelectedEventActionLoading] = useState(false);
  const [selectedEventError, setSelectedEventError] = useState("");
  const [selectedEventNotice, setSelectedEventNotice] = useState("");
  const bannerOpenHandledRef = useRef(null);

  const parseDateOnly = (value) => {
    if (!value) return null;

    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      return new Date(year, month, day);
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatLocalDate = (value) => {
    const date = parseDateOnly(value);
    if (!date) return "-";

    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // =========================
  // FETCH EVENTS
  // =========================
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/events");
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const handleFocus = () => {
      fetchEvents();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [fetchEvents]);

  useEffect(() => {
    let cancelled = false;

    const loadSelectedEventState = async () => {
      if (!selectedEvent) {
        setSelectedEventJoined(false);
        setSelectedEventError("");
        setSelectedEventNotice("");
        setSelectedEventLoading(false);
        return;
      }

      if (!user) {
        setSelectedEventJoined(false);
        setSelectedEventError("");
        setSelectedEventNotice("");
        setSelectedEventLoading(false);
        return;
      }

      try {
        setSelectedEventLoading(true);
        setSelectedEventError("");

        const res = await api.get(`/events/${selectedEvent.id}/status`);

        if (cancelled) return;

        setSelectedEventJoined(Boolean(res.data?.joined));
      } catch (err) {
        if (cancelled) return;
        console.error("Error cargando estado del evento:", err);
        setSelectedEventError("No se pudo comprobar tu estado en el evento.");
      } finally {
        if (!cancelled) {
          setSelectedEventLoading(false);
        }
      }
    };

    loadSelectedEventState();

    return () => {
      cancelled = true;
    };
  }, [selectedEvent, user]);

  useEffect(() => {
    const openEventId = location.state?.openEventId;
    if (!openEventId || events.length === 0) return;
    if (bannerOpenHandledRef.current === openEventId) return;

    const targetEvent = events.find(
      (event) => Number(event.id) === Number(openEventId)
    );

    if (!targetEvent) return;

    const eventDate = parseDateOnly(targetEvent.date);
    if (eventDate) {
      setCurrentMonth(eventDate.getMonth());
      setCurrentYear(eventDate.getFullYear());
    }

    setSelectedEvent(targetEvent);
    bannerOpenHandledRef.current = openEventId;

    navigate("/events", { replace: true, state: null });
  }, [events, location.state, navigate]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        filterRef.current &&
        !filterRef.current.contains(e.target)
      ) {
        setFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);
  // =========================
  // MONTH DATA
  // =========================
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const weekDays = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

  const firstDay = new Date(currentYear, currentMonth, 1);

  const daysInMonth = new Date(
    currentYear,
    currentMonth + 1,
    0
  ).getDate();

  const startDay = (firstDay.getDay() + 6) % 7;

  // =========================
  // FILTER EVENTS
  // =========================
  const filteredEvents = useMemo(() => {
    if (selectedType === "Todos") return events;

    const map = {
      "Firma de libros": "firma",
      "Charla/Conferencia": "charla",
      "Webinar/Seminario": "webinar",
    };

    return events.filter(
      (event) => event.event_type === map[selectedType]
    );
  }, [events, selectedType]);

  // =========================
  // CALENDAR CELLS
  // =========================
  const cells = useMemo(() => {
    const arr = [];

    for (let i = 0; i < startDay; i++) {
      arr.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      arr.push(day);
    }

    return arr;
  }, [startDay, daysInMonth]);

  // =========================
  // HELPERS
  // =========================
  function getEventForDay(day) {
    const dayEvents = filteredEvents
      .filter((event) => {
      const eventDate = parseDateOnly(event.date);

      if (!eventDate) return false;

      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentMonth &&
        eventDate.getFullYear() === currentYear
      );
      })
      .sort((a, b) => {
        const aCreated = new Date(a.created_at || 0).getTime();
        const bCreated = new Date(b.created_at || 0).getTime();
        return bCreated - aCreated;
      });

    return dayEvents[0] || null;
  }

  function isPastDay(day) {
    const date = new Date(currentYear, currentMonth, day);

    return date < new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
  }

  function getBadgeClass(type) {
    if (type === "firma") return "badge-firma";
    if (type === "charla") return "badge-charla";
    return "badge-webinar";
  }

  function getBadgeText(type) {
    if (type === "firma") return "Firma";
    if (type === "charla") return "Charla";
    return "Webinar";
  }

  const formattedToday = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function isEventEnded(event) {
    if (!event?.date) return false;

    const eventDate = parseDateOnly(event.date);
    if (!eventDate) return false;

    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    return eventDate < startOfToday;
  }

  const handleEventAction = async () => {
    if (!selectedEvent || selectedEventLoading || selectedEventActionLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    try {
      setSelectedEventActionLoading(true);
      setSelectedEventError("");
      setSelectedEventNotice("");

      if (selectedEventJoined) {
        const res = await api.delete(`/events/${selectedEvent.id}/join`);
        setSelectedEventJoined(false);
        setSelectedEventNotice(res.data?.message || "Te has desapuntado correctamente.");
      } else {
        const res = await api.post(`/events/${selectedEvent.id}/join`);
        setSelectedEventJoined(true);
        setSelectedEventNotice(res.data?.message || "Te has apuntado correctamente.");
      }
    } catch (err) {
      console.error("Error cambiando asistencia:", err);
      setSelectedEventError(
        err?.response?.data?.error || "No se pudo actualizar tu asistencia."
      );
    } finally {
      setSelectedEventActionLoading(false);
    }
  };

  return (
    <section className="events-page">

      <div className="events-header">
        <h1 className="events-title">
          <FaRegCalendarAlt className="title-icon" />
          Calendario de eventos
        </h1>        <p className="events-subtitle">
          Pincha en el evento para más información.
        </p>
      </div>

      <div className="calendar-wrapper">

        <div className="calendar-top">

          <div className="calendar-filter"
            ref={filterRef}
          >

            <button
              className="filter-button"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <span>{selectedType}</span>

              <span
                className={`filter-caret ${filterOpen ? "open" : ""
                  }`}
              >
                ▼
              </span>
            </button>

            {filterOpen && (
              <div className="filter-dropdown">

                {[
                  "Todos",
                  "Firma de libros",
                  "Charla/Conferencia",
                  "Webinar/Seminario",
                ].map((type) => (
                  <div
                    key={type}
                    className="filter-option"
                    onClick={() => {
                      setSelectedType(type);
                      setFilterOpen(false);
                    }}
                  >
                    {type}
                  </div>
                ))}

              </div>
            )}

          </div>

          <div className="calendar-month-controls">

            <button onClick={() => {
              setCurrentMonth(prev => {
                if (prev === 0) {
                  setCurrentYear(y => y - 1);
                  return 11;
                }
                return prev - 1;
              });
            }}>◀</button>

            <span className="calendar-date">
              {monthNames[currentMonth]} de {currentYear}
            </span>

            <button onClick={() => {
              setCurrentMonth(prev => {
                if (prev === 11) {
                  setCurrentYear(y => y + 1);
                  return 0;
                }
                return prev + 1;
              });
            }}>▶</button>

          </div>

          <div className="calendar-cta">
            <button onClick={() => navigate("/about?asunto=solicitar-evento#contact-form")}>
              Solicitar evento
            </button>
          </div>

        </div>

        <div className="calendar-today">
          <div className="calendar-note"><p className="filter-comment">Selecciona el tipo de evento</p></div>
          <div className="calendar-ctoday">Hoy, {formattedToday}</div>
          <div className="calendar-note"><p>Solicita visita de Bellumartis a tu ciudad</p></div>


        </div>

        <div className="calendar-weekdays">
          {weekDays.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="calendar-grid">

          {cells.map((day, index) => {

            if (!day) {
              return (
                <div
                  key={`empty-${currentYear}-${currentMonth}-${index}`}
                  className="calendar-cell empty"
                />
              );
            }

            const event = getEventForDay(day);

            return (
              <div
                key={`${currentYear}-${currentMonth}-${day}`}
                className={`calendar-cell ${isPastDay(day) ? "past-day" : "future-day"
                  } ${event && isEventEnded(event) ? "event-ended" : ""}`}
              >

                <div className="day-number">{day}</div>

                {event && (
                  <div
                    className="event-preview"
                    onClick={() => setSelectedEvent(event)}
                  >

                    <div className={`event-badge ${getBadgeClass(event.event_type)}`}>
                      {getBadgeText(event.event_type)}
                    </div>

                    <div className="event-time">
                      {event.time?.slice(0, 5)}
                    </div>

                    <div className={`event-city ${event.event_type === "webinar" ? "hidden" : ""
                      }`}>
                      {event.province}
                    </div>

                  </div>
                )}

              </div>
            );
          })}

        </div>

        <div className="calendar-footer">
          <p className="calendar-footer-subtitle">
            Los eventos se muestran en la zona horaria:
            (GMT+02:00) Hora de Europa central - Madrid
          </p>
        </div>

      </div>

      {/* =========================
          MODAL
      ========================= */}
      {selectedEvent && (
        <div
          className="event-modal-overlay"
          onClick={() => setSelectedEvent(null)}
        >

          <div
            className="event-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <h2>{selectedEvent.title}</h2>

            {selectedEvent.image_url && (
              <img
                className="event-modal-poster"
                src={resolveAssetUrl(selectedEvent.image_url)}
                alt={`Poster de ${selectedEvent.title}`}
              />
            )}

            <p><strong>Tipo:</strong> {getBadgeText(selectedEvent.event_type)}</p>

            <p><strong>Fecha:</strong> {formatLocalDate(selectedEvent.date)}</p>

            <p><strong>Hora:</strong> {selectedEvent.time?.slice(0, 5)}</p>

            {selectedEvent.event_type !== "webinar" && (
              <p><strong>Provincia:</strong> {selectedEvent.province}</p>
            )}

            <p className="modal-description">
              {selectedEvent.description}
            </p>

            {getSafeEventLink(selectedEvent.link) && (
              <p className="event-modal-link">
                <strong>Enlace:</strong>{" "}
                <a href={getSafeEventLink(selectedEvent.link)} target="_blank" rel="noopener noreferrer">
                  {selectedEvent.link}
                </a>
              </p>
            )}

            {selectedEventNotice && (
              <p className="modal-success">{selectedEventNotice}</p>
            )}

            {selectedEventError && (
              <p className="modal-error">{selectedEventError}</p>
            )}

            {/* BOTONES ORDENADOS */}
            <div className="modal-buttons">

              <button
                className="modal-join-btn"
                onClick={handleEventAction}
                disabled={
                  selectedEventLoading ||
                  selectedEventActionLoading ||
                  isEventEnded(selectedEvent) ||
                  !user
                }
              >
                {selectedEventLoading
                  ? "Comprobando..."
                  : isEventEnded(selectedEvent)
                    ? "Evento finalizado"
                    : !user
                      ? "Inicia sesión para apuntarte"
                      : selectedEventJoined
                        ? "Desapuntarme"
                        : "Apuntarme"}
              </button>

              <button
                className="modal-close-btn"
                onClick={() => setSelectedEvent(null)}
              >
                Cerrar
              </button>

            </div>

          </div>

        </div>
      )}

    </section>
  );
}

export default Events;
