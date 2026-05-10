import { useEffect, useState } from "react";
import { getEvents } from "../services/api";

function EventsList() {

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    async function loadEvents() {

      try {

        const data = await getEvents();

        setEvents(data);

      } catch (err) {

        console.error(err);

      } finally {

        setLoading(false);
      }
    }

    loadEvents();

  }, []);

  if (loading) {
    return <p>Cargando eventos...</p>;
  }

  return (
    <div>
      <h2>Eventos</h2>

      {events.map((event) => (
        <div
          key={event.id}
          style={{
            border: "1px solid gray",
            padding: "10px",
            marginBottom: "10px"
          }}
        >
          <h3>{event.title}</h3>

          <p>{event.description}</p>

          <p>
            Provincia: {event.province}
          </p>

          <p>
            Asistentes: {event.attendees}
          </p>
        </div>
      ))}
    </div>
  );
}

export default EventsList;