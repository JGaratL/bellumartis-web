import { apiFetch } from "../api";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaInstagram, FaYoutube, FaSpotify } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { LuRadioTower } from "react-icons/lu";
import { useAuth } from "../context/AuthContext";
import { SPAIN_PROVINCES } from "../utils/spainProvinces";

import "./About.css";

const REASON_LABELS = {
  informe_tecnico: "Informe técnico",
  error_plataforma: "Error de la plataforma",
  sugerencia: "Sugerencia",
  reporte_contenido: "Reporte de contenido",
  colaboracion: "Colaboración",
};

function About() {
  const location = useLocation();
  const eventRequestFromLink = new URLSearchParams(location.search).get("asunto") === "solicitar-evento";
  const [form, setForm] = useState({
    name: "",
    email: "",
    reason: "sugerencia",
    message: "",
    priority: "media",
    province: "",
    customSubject: "",
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [website, setWebsite] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (!eventRequestFromLink) return;
    setForm((current) => ({ ...current, reason: "solicitar_evento" }));
    requestAnimationFrame(() => {
      document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [eventRequestFromLink, location.key]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "El nombre es obligatorio";
    else if (form.name.trim().length > 100) newErrors.name = "El nombre no puede superar 100 caracteres";

    if (!form.email.trim()) newErrors.email = "El email es obligatorio";
    else if (form.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Introduce un email válido";
    }

    if (form.reason === "otro") {
      if (!form.customSubject.trim()) newErrors.customSubject = "Especifica el motivo";
      else if (form.customSubject.trim().length > 200) {
        newErrors.customSubject = "El motivo no puede superar 200 caracteres";
      }
    }
    if (form.reason === "solicitar_evento" && !form.province) {
      newErrors.province = "Selecciona la provincia del evento";
    }

    if (!form.message.trim()) {
      newErrors.message = "El mensaje no puede estar vacío";
    } else if (form.message.trim().length < 20) {
      newErrors.message = "El mensaje debe tener al menos 20 caracteres";
    } else if (form.message.trim().length > 10000) {
      newErrors.message = "El mensaje no puede superar 10.000 caracteres";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const isEventRequest = form.reason === "solicitar_evento";
        const subject = isEventRequest
          ? "Solicitar evento"
          : form.reason === "otro"
            ? form.customSubject.trim()
            : REASON_LABELS[form.reason];
        const apiReason = isEventRequest ? "otro" : form.reason;
        const storedSubject = isEventRequest ? `${subject} - ${form.province}` : subject;
        const { province, customSubject, ...reportFields } = form;
        const response = await apiFetch(`${apiUrl}/api/communications/reports`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",

          },
          body: JSON.stringify({ ...reportFields, reason: apiReason, subject: storedSubject, website }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "No se pudo enviar el informe");
        setStatus({ type: "success", message: "Informe enviado correctamente." });
        setForm({ name: "", email: "", reason: "sugerencia", message: "", priority: "media", province: "", customSubject: "" });
        setWebsite("");
      } catch (error) {
        setStatus({ type: "error", message: error.message || "No se pudo enviar el informe." });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="about-page-wrap">

      {/* TITULO */}
      <h1 className="about-page-title page-title">
        <LuRadioTower className="title-icon" />
        Centro de comunicaciones
      </h1>
      {/* SUBTÍTULO */}
      <p className="about-subtitle">
        Envía un informe, consulta o reporte a la administración
      </p>

      {/* CARD */}
      <section id="contact-form" className="about-card">

        {/* FORM */}
        <form className="about-form" onSubmit={handleSubmit}>

          <label htmlFor="contact-name">Nombre</label>
          <input
            id="contact-name"
            name="name"
            placeholder="Tu nombre"
            maxLength={100}
            required
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && <p className="form-error">{errors.name}</p>}

          <label htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            type="email"
            name="email"
            placeholder="nombre@ejemplo.com"
            maxLength={254}
            required
            value={form.email}
            onChange={handleChange}
          />
          {errors.email && <p className="form-error">{errors.email}</p>}

          <label htmlFor="contact-reason">Motivo</label>
          <select id="contact-reason" name="reason" value={form.reason} onChange={handleChange} required>
            <option value="" disabled>Selecciona un motivo</option>
            <option value="informe_tecnico">Informe técnico</option>
            <option value="error_plataforma">Error de la plataforma</option>
            <option value="sugerencia">Sugerencia</option>
            <option value="reporte_contenido">Reporte de contenido</option>
            <option value="colaboracion">Colaboración</option>
            <option value="solicitar_evento">Solicitar Evento</option>
            <option value="otro">Otro</option>
          </select>

          {form.reason === "otro" && (
            <input
              id="contact-custom-reason"
              name="customSubject"
              placeholder="Especifica el motivo"
              maxLength={200}
              required
              value={form.customSubject}
              onChange={handleChange}
            />
          )}
          {errors.customSubject && (
            <p className="form-error">{errors.customSubject}</p>
          )}

          {form.reason === "solicitar_evento" && (
            <>
              <label htmlFor="contact-province">Provincia del evento</label>
              <select
                id="contact-province"
                name="province"
                required
                value={form.province}
                onChange={handleChange}
              >
                <option value="" disabled>Selecciona una provincia</option>
                {SPAIN_PROVINCES.map((province) => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
              {errors.province && <p className="form-error">{errors.province}</p>}
            </>
          )}

          <label htmlFor="contact-message">Mensaje</label>
          <textarea
            id="contact-message"
            name="message"
            rows="5"
            minLength={20}
            maxLength={10000}
            required
            placeholder="Describe tu informe..."
            value={form.message}
            onChange={handleChange}
          />
          {errors.message && (
            <p className="form-error">{errors.message}</p>
          )}

          <label htmlFor="contact-priority">Prioridad solicitada</label>
          <select
            id="contact-priority"
            name="priority"
            value={form.priority}
            onChange={handleChange}
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>

          <div className="contact-honeypot" aria-hidden="true">
            <label htmlFor="contact-website">Deja este campo vacío</label>
            <input
              id="contact-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enviando…" : "Transmitir informe"}
          </button>
          {status.message && <p className={`form-status ${status.type}`}>{status.message}</p>}
        </form>

        {/* FOOTER ORIGINAL */}
        <div className="about-card-bottom">

          <div className="about-col about-col-photo">
            <img
              src="/campa2.webp"
              alt="Francisco Garcia Campa"
              className="about-director-photo"
            />
          </div>

          <div className="about-col about-col-center">
            <p className="about-director-name">
              Francisco García Campa
            </p>

            <p className="about-director-role">
              Director de Bellumartis
            </p>

            <div className="about-social-row">
              <a href="#" aria-label="Instagram">
                <FaInstagram />
              </a>
              <a href="#" aria-label="YouTube">
                <FaYoutube />
              </a>
              <a href="#" aria-label="X">
                <FaXTwitter />
              </a>
              <a href="#" aria-label="Spotify">
                <FaSpotify />
              </a>
            </div>
          </div>

          <div className="about-col about-col-logo">
            <img
              src="/bellumartisLogo.png"
              alt="Logo Bellumartis"
              className="about-brand-logo"
            />
          </div>

        </div>
      </section>
    </div>
  );
}

export default About;
