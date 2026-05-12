import { useEffect, useMemo, useState } from "react";
import "./Events.css";

function Events() {
  const [events, setEvents] = useState([]);

  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const [selectedType, setSelectedType] = useState("Todos");

  // =========================
  // MODAL STATE
  // =========================
  const [selectedEvent, setSelectedEvent] = useState(null);

  // =========================
  // FETCH EVENTS
  // =========================
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("http://localhost:5000/events");
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error(err);
      }
    }

    fetchEvents();
  }, []);

  // =========================
  // MONTH DATA
  // =========================
  const monthNames = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  const weekDays = ["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"];

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
    return filteredEvents.find((event) => {
      const eventDate = new Date(event.date);

      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentMonth &&
        eventDate.getFullYear() === currentYear
      );
    });
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

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <section className="events-page">

      <div className="events-header">
        <h1 className="events-title">Calendario de eventos</h1>
        <p className="events-subtitle">
          Pincha en el evento para más información.
        </p>
      </div>

      <div className="calendar-wrapper">

        <div className="calendar-top">

          <div className="calendar-filter">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option>Todos</option>
              <option>Firma de libros</option>
              <option>Charla/Conferencia</option>
              <option>Webinar/Seminario</option>
            </select>
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

            <span>
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
            <button>Solicitar evento</button>
          </div>

        </div>

        <div className="calendar-today">
          <div className="calendar-note"><p>Selecciona el tipo de evento</p></div>
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
                className={`calendar-cell ${
                  isPastDay(day) ? "past-day" : "future-day"
                }`}
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

                    <div className={`event-city ${
                      event.event_type === "webinar" ? "hidden" : ""
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
          <p className="calendar-footer-title">Calendario de eventos</p>
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

            <p><strong>Tipo:</strong> {getBadgeText(selectedEvent.event_type)}</p>

            <p><strong>Fecha:</strong> {formatDate(selectedEvent.date)}</p>

            <p><strong>Hora:</strong> {selectedEvent.time?.slice(0, 5)}</p>

            {selectedEvent.event_type !== "webinar" && (
              <p><strong>Provincia:</strong> {selectedEvent.province}</p>
            )}

            <p className="modal-description">
              {selectedEvent.description}
            </p>

            {/* BOTONES ORDENADOS */}
            <div className="modal-buttons">

              <button
                className="modal-join-btn"
                disabled
              >
                Apuntarme
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