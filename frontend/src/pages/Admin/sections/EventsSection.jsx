import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../../../api";
import EventFilters from "../components/events/EventFilters";
import EventsTable from "../components/events/EventsTable";
import EventConfirmModal from "../components/events/EventConfirmModal";
import EventCreateModal from "../components/events/EventCreateModal";
import EventEditModal from "../components/events/EventEditModal";
import EventViewModal from "../components/events/EventViewModal";
import {
  EVENT_PROVINCE_OPTIONS,
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  normalizeEventDateValue,
} from "../utils/eventHelpers";

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getEventSortTimestamp(event) {
  const date = normalizeEventDateValue(event?.date);
  if (!date) return null;

  const time = String(event?.time || "00:00:00").trim().slice(0, 8) || "00:00:00";
  const timestamp = new Date(`${date}T${time}`).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

export default function EventsSection({ createOpen, onCloseCreate }) {
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("recent");

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmMode, setConfirmMode] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      setEventsLoading(true);
      setEventsError("");

      const res = await api.get("/admin/events");
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("ADMIN EVENTS LIST ERROR:", err);
      setEventsError(
        err?.response?.data?.error || "No se pudo cargar la lista de eventos"
      );
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      if (typeFilter && typeFilter !== "all" && event.event_type !== typeFilter) {
        return false;
      }

      if (statusFilter && statusFilter !== "all" && event.status !== statusFilter) {
        return false;
      }

      if (dateFilter && normalizeEventDateValue(event.date) !== dateFilter) {
        return false;
      }

      if (provinceFilter && provinceFilter !== "all") {
        if (normalizeText(event.province || "") !== normalizeText(provinceFilter)) {
          return false;
        }
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const aTime = getEventSortTimestamp(a);
      const bTime = getEventSortTimestamp(b);

      if (aTime === null && bTime === null) return 0;
      if (aTime === null) return 1;
      if (bTime === null) return -1;

      return sortOrder === "oldest" ? aTime - bTime : bTime - aTime;
    });
  }, [dateFilter, events, provinceFilter, sortOrder, statusFilter, typeFilter]);

  const clearFilters = useCallback(() => {
    setTypeFilter("");
    setStatusFilter("");
    setDateFilter("");
    setProvinceFilter("");
  }, []);

  const closeConfirm = useCallback(() => {
    if (confirmLoading) return;
    setConfirmTarget(null);
    setConfirmMode("");
  }, [confirmLoading]);

  const openCancelEvent = (event) => {
    setConfirmTarget(event);
    setConfirmMode("cancel");
  };

  const openDeleteEvent = (event) => {
    setConfirmTarget(event);
    setConfirmMode("delete");
  };

  const openViewEvent = (event) => {
    setViewTarget(event);
  };

  const openEditEvent = (event) => {
    setEditTarget(event);
  };

  const closeViewEvent = useCallback(() => {
    setViewTarget(null);
  }, []);

  const closeEditEvent = useCallback(() => {
    setEditTarget(null);
  }, []);

  const refreshData = useCallback(async () => {
    await loadEvents();
  }, [loadEvents]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmTarget || confirmLoading) return;

    try {
      setConfirmLoading(true);

      if (confirmMode === "cancel") {
        await api.patch(`/admin/events/${confirmTarget.id}/status`, {
          status: "cancelled",
        });
      } else if (confirmMode === "delete") {
        await api.delete(`/admin/events/${confirmTarget.id}`);
      }

      setConfirmTarget(null);
      setConfirmMode("");
      await refreshData();
    } catch (err) {
      console.error("ADMIN EVENT ACTION ERROR:", err);
      setEventsError(
        err?.response?.data?.error || "No se pudo completar la acción sobre el evento"
      );
    } finally {
      setConfirmLoading(false);
    }
  }, [confirmLoading, confirmMode, confirmTarget, refreshData]);

  const confirmTitle =
    confirmMode === "cancel"
      ? "¿Seguro que quieres cancelar este evento?"
      : "¿Seguro que quieres eliminar este evento?";

  const confirmCopy =
    confirmMode === "cancel"
      ? "El evento pasará a estado Cancelado. Podrás volver a activarlo más adelante desde la edición."
      : "El evento se eliminará junto con sus inscripciones. Esta acción no se puede deshacer.";

  const confirmLabel = confirmMode === "cancel" ? "Sí, cancelar" : "Sí, eliminar";

  return (
    <section className="admin-card admin-events-card">
      <EventFilters
        typeValue={typeFilter}
        onTypeChange={setTypeFilter}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        dateValue={dateFilter}
        onDateChange={setDateFilter}
        provinceValue={provinceFilter}
        onProvinceChange={setProvinceFilter}
        typeOptions={EVENT_TYPE_OPTIONS}
        statusOptions={EVENT_STATUS_OPTIONS}
        provinceOptions={EVENT_PROVINCE_OPTIONS}
        onClearFilters={clearFilters}
      />

      <div className="admin-events-list-toolbar">
        <p className="admin-events-list-count">
          {filteredEvents.length} evento{filteredEvents.length === 1 ? "" : "s"}
        </p>

        <div className="admin-events-sort-wrap">
          <label className="admin-events-sort-label" htmlFor="events-sort-order">
            Ordenar por
          </label>
          <select
            id="events-sort-order"
            className="admin-events-sort-select"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          >
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
          </select>
        </div>
      </div>

      <div className="admin-table-wrap">
        {eventsError && <p className="admin-table-error">{eventsError}</p>}

        <EventsTable
          events={filteredEvents}
          loading={eventsLoading}
          onOpenViewEvent={openViewEvent}
          onOpenEditEvent={openEditEvent}
          onOpenCancelEvent={openCancelEvent}
          onOpenDeleteEvent={openDeleteEvent}
        />
      </div>

      <EventViewModal event={viewTarget} onClose={closeViewEvent} />
      <EventEditModal
        event={editTarget}
        onClose={closeEditEvent}
        onUpdated={refreshData}
      />

      <EventConfirmModal
        event={confirmTarget}
        loading={confirmLoading}
        title={confirmTitle}
        copy={confirmCopy}
        confirmLabel={confirmLabel}
        danger={confirmMode === "delete"}
        onClose={closeConfirm}
        onConfirm={handleConfirmAction}
      />

      <EventCreateModal
        open={createOpen}
        onClose={onCloseCreate}
        onCreated={refreshData}
      />
    </section>
  );
}
