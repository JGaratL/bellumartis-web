import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { FaEye, FaEyeSlash } from "react-icons/fa";

import "./Auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function validatePassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("El enlace no es valido");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (!validatePassword(password)) {
      setError("La contraseña debe tener minimo 8 caracteres, mayuscula, minuscula, numero y simbolo");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo cambiar la contraseña");
        return;
      }

      setSuccess(data.message || "Contraseña actualizada correctamente");
      setPassword("");
      setConfirmPassword("");
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
        <p className="auth-eyebrow">Seguridad</p>
        <h1 className="auth-title">Nueva contraseña</h1>
        <p className="auth-copy">
          Escribe una nueva contraseña segura para terminar el cambio.
        </p>

        {error && <p className="auth-error">{error}</p>}
        {success && <p className="auth-success">{success}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
            >
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>

          <div className="password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={
                showConfirmPassword ? "Ocultar contrasena" : "Mostrar contrasena"
              }
            >
              {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
            </button>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Guardando..." : "Cambiar contraseña"}
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

export default ResetPasswordPage;
