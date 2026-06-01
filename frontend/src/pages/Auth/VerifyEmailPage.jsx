import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import "./Auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verificando tu email...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Falta el token de verificacion.");
      return;
    }

    let cancelled = false;

    const verifyEmail = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (cancelled) return;

        if (!response.ok) {
          setStatus("error");
          setMessage(data.error || "No se pudo verificar el email");
          return;
        }

        setStatus("success");
        setMessage(data.message || "Email verificado correctamente");
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStatus("error");
          setMessage("Error de conexion");
        }
      }
    };

    verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="auth-page auth-page--standalone">
      <div className="auth-card auth-card--wide">
        <p className="auth-eyebrow">Verificacion</p>
        <h1 className="auth-title">
          {status === "loading" ? "Comprobando cuenta" : "Estado del email"}
        </h1>
        <p className="auth-copy">{message}</p>

        {status === "success" ? (
          <button type="button" className="btn-primary" onClick={() => navigate("/login")}>
            Ir al inicio de sesión
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => navigate("/register")}>
            Volver al registro
          </button>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailPage;
