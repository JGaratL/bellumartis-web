import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IoTicketOutline, IoLocationOutline } from "react-icons/io5";
import { RiPencilLine } from "react-icons/ri";
import { LuNotebookPen } from "react-icons/lu";
import { FaRegCalendarAlt } from "react-icons/fa";
import { FaRegClock, FaLink } from "react-icons/fa6";

import api from "../../../../api";
import AdminImageField from "../AdminImageField";
import { EVENT_PROVINCE_OPTIONS } from "../../utils/eventHelpers";

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

export default function EventCreateModal({ open, onClose, onCreated }) {
  const initialForm = useMemo(
    () => ({
      event_type: "",
      title: "",
      description: "",
      date: "",
      time: "",
      province: "",
      link: "",
      showAsBanner: true,
      sendEmail: false,
      hasPoster: false,
    }),
    []
  );

  const [form, setForm] = useState(initialForm);
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState("");
  const [posterFileName, setPosterFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setPosterFile(null);
      setPosterPreviewUrl("");
      setPosterFileName("");
      setError("");
      setSaving(false);
    }
  }, [initialForm, open]);

  useEffect(() => {
    return () => {
      if (posterPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(posterPreviewUrl);
      }
    };
  }, [posterPreviewUrl]);

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const clearPoster = () => {
    if (posterPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(posterPreviewUrl);
    }

    setPosterFile(null);
    setPosterPreviewUrl("");
    setPosterFileName("");
  };

  const handlePosterFile = (file) => {
    if (posterPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(posterPreviewUrl);
    }

    if (!file) {
      setPosterFile(null);
      setPosterPreviewUrl("");
      setPosterFileName("");
      return;
    }

    setPosterFile(file);
    setPosterFileName(file.name);
    setPosterPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (!form.event_type || !form.title) {
      setError("Completa el tipo de evento y el titulo");
      return;
    }

    if (form.hasPoster && !posterFile) {
      setError("Selecciona una imagen para el poster o desactiva la opcion");
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
      payload.append("send_email", form.province && form.sendEmail ? "1" : "0");

      if (form.hasPoster && posterFile) {
        payload.append("image", posterFile);
      }

      const { data } = await api.post("/admin/events", payload);

      await onCreated?.();
      onClose?.();
      if (form.province && form.sendEmail) {
        const notification = data?.emailNotification;
        if (notification?.error) {
          window.alert(`El evento se creó, pero no se pudo preparar el aviso por email: ${notification.error}`);
        } else if (notification?.pending > 0) {
          window.alert(`Evento creado. Aviso enviado a ${notification.sent} usuarios; ${notification.pending} quedan en la cola y se enviarán cuando haya cuota.`);
        } else {
          window.alert(`Evento creado y aviso enviado a ${notification?.sent || 0} usuarios de ${form.province}.`);
        }
      }
    } catch (err) {
      console.error("ADMIN CREATE EVENT ERROR:", err);
      setError(err?.response?.data?.error || "No se pudo crear el evento");
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
        alignItems: "flex-start",   // 👈 CLAVE
        justifyContent: "center",
        padding: "40px 20px",       // 👈 espacio arriba
        background: "rgba(0, 0, 0, 0.72)",
        boxSizing: "border-box",
        overflowY: "auto",          // 👈 mejor que auto genérico
      }}
    >
      <div
        className="admin-modal admin-event-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-create-event-title"
        onClick={(event) => event.stopPropagation()}
        style={{ margin: "0 auto" }}
      >
        <h3 id="admin-create-event-title">Crear Evento</h3>

        <form className="admin-event-create-form" onSubmit={handleSubmit}>
          <div className="admin-event-field">
            <FieldHeader icon={IoTicketOutline} label="Tipo de Evento" />
            <select
              className="admin-event-input"
              value={form.event_type}
              onChange={(event) => updateField("event_type", event.target.value)}
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
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Escribe el título"
            />
          </div>

          <div className="admin-event-field">
            <FieldHeader icon={LuNotebookPen} label="Descripción" />
            <textarea
              className="admin-event-textarea"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
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
                onChange={(event) => updateField("date", event.target.value)}
              />
            </div>

            <div className="admin-event-field">
              <FieldHeader icon={FaRegClock} label="Hora" />
              <select
                className="admin-event-input"
                value={form.time}
                onChange={(event) => updateField("time", event.target.value)}
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
                onChange={(event) => {
                  const province = event.target.value;
                  updateField("province", province);
                  if (!province) updateField("sendEmail", false);
                }}
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
              onChange={(event) => updateField("link", event.target.value)}
              placeholder="Escribe o pega el enlace"
            />
            </div>
          </div>

          <label className="admin-event-check">
            <input
              type="checkbox"
              checked={form.showAsBanner}
              onChange={(event) =>
                updateField("showAsBanner", event.target.checked)
              }
            />
            <span>Mostrar como banner</span>
          </label>

          {form.province && (
            <label className="admin-event-check">
              <input
                type="checkbox"
                checked={form.sendEmail}
                onChange={(event) => updateField("sendEmail", event.target.checked)}
              />
              <span>Enviar un email a todos los usuarios de la provincia</span>
            </label>
          )}

          <div className="admin-event-poster-row">
            <label className="admin-event-check">
              <input
                type="checkbox"
                checked={form.hasPoster}
                onChange={(event) => {
                  const nextValue = event.target.checked;
                  updateField("hasPoster", nextValue);
                  if (!nextValue) {
                    clearPoster();
                  }
                }}
              />
              <span>Agregar Poster para Webinar o Conferencia/Charla</span>
            </label>
          </div>

          {form.hasPoster && (
            <AdminImageField
              id="event-poster-image"
              label="Imagen del poster"
              description="Selecciona una imagen desde tu equipo. Podras cambiarla o quitarla antes de guardar."
              previewUrl={posterPreviewUrl}
              fileName={posterFileName}
              onFileChange={handlePosterFile}
              onClear={clearPoster}
              disabled={saving}
              buttonLabel="Seleccionar imagen"
              clearLabel="Cancelar seleccion"
            />
          )}

          {error && <p className="admin-modal-copy admin-modal-error">{error}</p>}

          <div className="admin-event-actions">
            <button type="submit" className="admin-modal-btn" disabled={saving}>
              {saving ? "Creando..." : "Crear"}
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
