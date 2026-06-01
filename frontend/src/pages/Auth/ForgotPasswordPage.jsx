import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo enviar el enlace");
        return;
      }

      setSuccess(
        data.message ||
          "Si el email existe, recibirás un enlace para cambiar la contraseña."
      );
      setEmail("");
    } catch (err) {
      console.error(err);
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--standalone">
      <div className="auth-card auth-card--wide">
        <p className="auth-eyebrow">Recuperacion</p>
        <h1 className="auth-title">Olvidé mi contraseña</h1>
        <p className="auth-copy">
          Escribe tu email y te enviaremos un enlace para elegir una nueva contraseña.
        </p>

        {error && <p className="auth-error">{error}</p>}
        {success && <p className="auth-success">{success}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Tu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>

          <button
            type="button"
            className="auth-link"
            onClick={() => navigate("/login")}
          >
            Volver al inicio de sesión
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
