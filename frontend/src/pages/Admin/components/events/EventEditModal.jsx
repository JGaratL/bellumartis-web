import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IoTicketOutline, IoLocationOutline } from "react-icons/io5";
import { RiPencilLine } from "react-icons/ri";
import { LuNotebookPen } from "react-icons/lu";
import { FaRegCalendarAlt } from "react-icons/fa";
import { FaRegClock, FaLink } from "react-icons/fa6";

import api from "../../../../api";
import AdminImageField from "../AdminImageField";
import { resolveAdminAssetUrl } from "../../utils/assetHelpers";
import { EVENT_PROVINCE_OPTIONS, formatEventDate } from "../../utils/eventHelpers";

const EVENT_TYPES = [
  { value: "charla", label: "Charla/Conferencia" },
  { value: "firma", label: "Firma Libros" },
  { value: "sorteo", label: "Sorteo" },
  { value: "webinar", label: "Webinar/Seminario" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = index * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  const value = `${hours}:${minutes}`;
  return { value, label: value };
});

function FieldHeader({ icon: Icon, label }) {
  return (
    <div className="event-create-label">
      <Icon className="event-create-label-icon" />
      <span>{label}</span>
    </div>
  );
}

export default function EventEditModal({ event, onClose, onUpdated }) {
  const initialForm = useMemo(
    () => ({
      event_type: event?.event_type || "",
      title: event?.title || "",
      description: event?.description || "",
      date: event?.date || "",
      time: String(event?.time || "").slice(0, 5),
      province: event?.province || "",
      link: event?.link || "",
      showAsBanner: event?.show_as_banner ?? true,
    }),
    [event]
  );

  const [form, setForm] = useState(initialForm);
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState("");
  const [posterFileName, setPosterFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (event) {
      setForm({
        event_type: event.event_type || "",
        title: event.title || "",
        description: event.description || "",
        date: event.date || "",
        time: String(event.time || "").slice(0, 5),
        province: event.province || "",
        link: event.link || "",
        showAsBanner: event.show_as_banner ?? true,
      });
      setPosterFile(null);
      setPosterFileName("");
      setPosterPreviewUrl(resolveAdminAssetUrl(event.image_url));
      setError("");
      setSaving(false);
    }
  }, [event]);

  useEffect(() => {
    return () => {
      if (posterPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(posterPreviewUrl);
      }
    };
  }, [posterPreviewUrl]);

  if (!event) return null;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const clearPoster = () => {
    if (posterPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(posterPreviewUrl);
    }

    setPosterFile(null);
    setPosterFileName("");
    setPosterPreviewUrl(resolveAdminAssetUrl(event.image_url));
  };

  const handlePosterFile = (file) => {
    if (posterPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(posterPreviewUrl);
    }

    if (!file) {
      clearPoster();
      return;
    }

    setPosterFile(file);
    setPosterFileName(file.name);
    setPosterPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (saving) return;

    if (!form.event_type || !form.title) {
      setError("Completa el tipo de evento y el titulo");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = new FormData();
      payload.append("event_type", form.event_type);
      payload.append("title", form.title);
      payload.append("description", form.description);
      payload.append("date", form.date);
      payload.append("time", form.time);
      payload.append("province", form.province);
      payload.append("link", form.link);
      payload.append("show_as_banner", form.showAsBanner ? "1" : "0");

      if (posterFile) {
        payload.append("image", posterFile);
      }

      await api.put(`/admin/events/${event.id}`, payload);

      await onUpdated?.();
      onClose?.();
    } catch (err) {
      console.error("ADMIN UPDATE EVENT ERROR:", err);
      setError(err?.response?.data?.error || "No se pudo actualizar el evento");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="admin-event-modal-backdrop"
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 10000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 20px",
        background: "rgba(0, 0, 0, 0.72)",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <div
        className="admin-modal admin-event-create-modal admin-event-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-event-title"
        onClick={(e) => e.stopPropagation()}
        style={{ margin: "0 auto" }}
      >
        <p className="admin-modal-kicker">Editar evento</p>
        <h3 id="admin-edit-event-title">{event.title || "Evento"}</h3>

        <form className="admin-event-create-form" onSubmit={handleSubmit}>
          <div className="admin-event-field">
            <FieldHeader icon={IoTicketOutline} label="Tipo de Evento" />
            <select
              className="admin-event-input"
              value={form.event_type}
              onChange={(e) => updateField("event_type", e.target.value)}
            >
              <option value="" disabled>
                Seleccione Tipo de Evento
              </option>
              {EVENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-event-field">
            <FieldHeader icon={RiPencilLine} label="Título del Evento" />
            <input
              className="admin-event-input"
              type="text"
              maxLength={100}
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Escribe el título"
            />
          </div>

          <div className="admin-event-field">
            <FieldHeader icon={LuNotebookPen} label="Descripción" />
            <textarea
              className="admin-event-textarea"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Escribe la descripción del evento"
              rows={5}
            />
          </div>

          <div className="admin-event-row">
            <div className="admin-event-field">
              <FieldHeader icon={FaRegCalendarAlt} label="Fecha" />
              <input
                className="admin-event-input"
                type="date"
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
              />
            </div>

            <div className="admin-event-field">
              <FieldHeader icon={FaRegClock} label="Hora" />
              <select
                className="admin-event-input"
                value={form.time}
                onChange={(e) => updateField("time", e.target.value)}
              >
                <option value="" disabled>
                  Selecciona hora
                </option>
                {TIME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-event-row">
            <div className="admin-event-field">
              <FieldHeader icon={IoLocationOutline} label="Provincia" />
              <select
                className="admin-event-input"
                value={form.province}
                onChange={(e) => updateField("province", e.target.value)}
              >
                <option value="" disabled>
                  Selecciona una provincia
                </option>
                {EVENT_PROVINCE_OPTIONS.filter((option) => option.value !== "all").map(
                  (option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="admin-event-field">
              <FieldHeader icon={FaLink} label="Enlace (opcional)" />
              <input
                className="admin-event-input"
                type="url"
                maxLength={255}
                value={form.link}
                onChange={(e) => updateField("link", e.target.value)}
                placeholder="Escribe o pega el enlace"
              />
            </div>
          </div>

          <AdminImageField
            id="event-edit-poster-image"
            label="Agregar Poster para Webinar o Conferencia/Charla"
            description="Si cambias la imagen, el banner del evento se actualizará con la nueva selección."
            previewUrl={posterPreviewUrl}
            fileName={posterFileName}
            onFileChange={handlePosterFile}
            onClear={clearPoster}
            disabled={saving}
            buttonLabel="Seleccionar imagen"
            clearLabel="Cancelar seleccion"
          />

          <label className="admin-event-check">
            <input
              type="checkbox"
              checked={form.showAsBanner}
              onChange={(e) => updateField("showAsBanner", e.target.checked)}
            />
            <span>Mostrar como banner</span>
          </label>

          {error && <p className="admin-modal-copy admin-modal-error">{error}</p>}

          <div className="admin-event-actions">
            <button type="submit" className="admin-modal-btn" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="admin-modal-btn secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
