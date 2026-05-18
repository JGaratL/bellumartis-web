import { useState } from "react";
import { FaInstagram, FaYoutube, FaSpotify } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import "./About.css";

function About() {
  const [form, setForm] = useState({
    identifier: "",
    reason: "sugerencia",
    subject: "",
    message: "",
    priority: "media",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const validate = () => {
    const newErrors = {};

    if (!form.subject.trim()) {
      newErrors.subject = "El asunto es obligatorio";
    }

    if (!form.message.trim()) {
      newErrors.message = "El mensaje no puede estar vacío";
    } else if (form.message.trim().length < 20) {
      newErrors.message = "El mensaje debe tener al menos 20 caracteres";
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      console.log("Informe enviado:", form);
      alert("Informe transmitido correctamente");
      // aquí conectas backend
    }
  };

  return (
    <div className="about-page-wrap">

      {/* TITULO */}
      <h1 className="about-page-title">
        Centro de comunicaciones
      </h1>

      {/* SUBTÍTULO */}
      <p className="about-subtitle">
        Envía un informe, consulta o reporte a la administración
      </p>

      {/* CARD */}
      <section className="about-card">

        {/* FORM */}
        <form className="about-form" onSubmit={handleSubmit}>

          <label>Identificador</label>
          <input
            name="identifier"
            placeholder="Analista / Visitante / Nickname"
            value={form.identifier}
            onChange={handleChange}
          />

          <label>Motivo</label>
          <select name="reason" value={form.reason} onChange={handleChange}>
            <option value="informe">Informe técnico</option>
            <option value="error">Error en la plataforma</option>
            <option value="sugerencia">Sugerencia</option>
            <option value="reporte">Reporte de contenido</option>
            <option value="colaboracion">Colaboración</option>
            <option value="otro">Otro</option>
          </select>

          <label>Asunto</label>
          <input
            name="subject"
            placeholder="Ej: Error en publicación"
            value={form.subject}
            onChange={handleChange}
          />
          {errors.subject && (
            <p className="form-error">{errors.subject}</p>
          )}

          <label>Mensaje</label>
          <textarea
            name="message"
            rows="5"
            placeholder="Describe tu informe..."
            value={form.message}
            onChange={handleChange}
          />
          {errors.message && (
            <p className="form-error">{errors.message}</p>
          )}

          <label>Prioridad</label>
          <select
            name="priority"
            value={form.priority}
            onChange={handleChange}
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>

          <button type="submit">
            Transmitir informe
          </button>
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