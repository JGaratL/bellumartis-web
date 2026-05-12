import { useState, useContext, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { AuthContext } from "../../context/AuthContext";

import "./Auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const COUNTRIES = [
  "Alemania",
  "Argentina",
  "Australia",
  "Belgica",
  "Brasil",
  "Canada",
  "Chile",
  "China",
  "Colombia",
  "Corea del Sur",
  "Cuba",
  "Dinamarca",
  "Ecuador",
  "Espana",
  "Estados Unidos",
  "Finlandia",
  "Francia",
  "Grecia",
  "Irlanda",
  "Italia",
  "Japon",
  "Mexico",
  "Noruega",
  "Paises Bajos",
  "Peru",
  "Polonia",
  "Portugal",
  "Reino Unido",
  "Republica Checa",
  "Rumania",
  "Suecia",
  "Suiza",
  "Uruguay",
  "Venezuela",
];

const SPAIN_PROVINCES = [
  "A Coruna",
  "Alava",
  "Albacete",
  "Alicante",
  "Almeria",
  "Asturias",
  "Avila",
  "Badajoz",
  "Baleares",
  "Barcelona",
  "Burgos",
  "Caceres",
  "Cadiz",
  "Cantabria",
  "Castellon",
  "Ceuta",
  "Ciudad Real",
  "Cordoba",
  "Cuenca",
  "Girona",
  "Granada",
  "Guadalajara",
  "Gipuzkoa",
  "Huelva",
  "Huesca",
  "Jaen",
  "La Rioja",
  "Las Palmas",
  "Leon",
  "Lleida",
  "Lugo",
  "Madrid",
  "Malaga",
  "Melilla",
  "Murcia",
  "Navarra",
  "Ourense",
  "Palencia",
  "Pontevedra",
  "Salamanca",
  "Santa Cruz de Tenerife",
  "Segovia",
  "Sevilla",
  "Soria",
  "Tarragona",
  "Teruel",
  "Toledo",
  "Valencia",
  "Valladolid",
  "Bizkaia",
  "Zamora",
  "Zaragoza",
];

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, googleLogin } = useContext(AuthContext);

  const isLogin = location.pathname === "/login";

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    nickname: "",
    email: "",
    password: "",
    province: "",
    country: "",
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const googleInitializedRef = useRef(false);

  const sortedCountries = useMemo(() => [...COUNTRIES].sort(), []);
  const sortedProvinces = useMemo(() => [...SPAIN_PROVINCES].sort(), []);

  useEffect(() => {
    setError("");
    setFieldErrors({});
    if (isLogin) {
      setLoginData((prev) => ({ ...prev, password: "" }));
      return;
    }

    setRegisterData((prev) => ({ ...prev, password: "" }));
  }, [isLogin]);

  const handleLoginChange = (e) => {
    setLoginData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;

    setRegisterData((prev) => {
      const next = {
        ...prev,
        [name]: value,
      };

      if (name === "country" && value !== "Espana") {
        next.province = "";
      }

      return next;
    });

    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const email = loginData.email.trim().toLowerCase();
    if (!validateEmail(email)) {
      setError("Introduce un email valido");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: loginData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) return setError(data.error || "Error al iniciar sesion");

      login(data);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Error de conexion");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    const email = registerData.email.trim().toLowerCase();
    const nickname = registerData.nickname.trim();
    const password = registerData.password;

    const nextErrors = {};

    if (!nickname || nickname.length < 3) {
      nextErrors.nickname = "El nickname debe tener al menos 3 caracteres";
    }

    if (!validateEmail(email)) {
      nextErrors.email = "Introduce un email valido";
    }

    if (!validatePassword(password)) {
      nextErrors.password =
        "Minimo 8 caracteres, mayuscula, minuscula, numero y simbolo";
    }

    if (!registerData.country) {
      nextErrors.country = "Selecciona un pais";
    }

    if (registerData.country === "Espana" && !registerData.province) {
      nextErrors.province = "Selecciona una provincia";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registerData,
          nickname,
          email,
          province: registerData.country === "Espana" ? registerData.province : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.field) {
          setFieldErrors((prev) => ({ ...prev, [data.field]: data.error }));
        }
        return setError(data.error || "Error al registrarse");
      }

      if (data?.token && data?.user) {
        login(data);
        navigate("/");
        return;
      }

      // Fallback: autologin con credenciales recien registradas
      const loginResponse = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      const loginDataResponse = await loginResponse.json();

      if (!loginResponse.ok) {
        return setError(loginDataResponse.error || "Cuenta creada, pero no se pudo iniciar sesion");
      }

      login(loginDataResponse);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Error de conexion");
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google Sign-In no configurado");
      return;
    }

    if (window.google?.accounts?.id) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError("Google Sign-In no configurado");
      return;
    }

    if (!window.google?.accounts?.id) {
      setError("Google no esta listo todavia");
      return;
    }

    if (!googleInitializedRef.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const data = await googleLogin(response);
            if (data?.token) navigate("/");
          } catch (err) {
            console.error(err);
            setError("Error con Google");
          }
        },
      });

      const mountNode = document.getElementById("googleBtnMount");
      if (mountNode) {
        mountNode.innerHTML = "";
        window.google.accounts.id.renderButton(mountNode, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: 280,
        });
      }

      googleInitializedRef.current = true;
    }

    setError("");
    const hiddenBtn = document
      .getElementById("googleBtnMount")
      ?.querySelector("div[role='button']");

    if (hiddenBtn) {
      hiddenBtn.click();
      return;
    }

    setError("Google no esta disponible ahora. Recarga la pagina.");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div
          id="googleBtnMount"
          style={{ position: "absolute", left: "-9999px", top: "0" }}
        />
        <div className="auth-tabs">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => navigate("/login")}
          >
            Iniciar sesion
          </button>

          <button
            className={!isLogin ? "active" : ""}
            onClick={() => navigate("/register")}
          >
            Registrarse
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}

        {isLogin ? (
          <form className="auth-form" onSubmit={handleLogin} autoComplete="on">
            <input
              type="email"
              id="login-email"
              name="email"
              placeholder="Email"
              value={loginData.email}
              onChange={handleLoginChange}
              autoComplete="username"
              required
            />

            <div className="password-field">
              <input
                type={showLoginPassword ? "text" : "password"}
                id="login-password"
                name="password"
                placeholder="Contrasena"
                value={loginData.password}
                onChange={handleLoginChange}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                aria-label={
                  showLoginPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                }
              >
                {showLoginPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>

            <button type="submit" className="btn-primary">
              Iniciar sesion
            </button>

            <button
              type="button"
              className="btn-google"
              onClick={handleGoogleLogin}
            >
              <FcGoogle size={20} />
              Continuar con Google
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister} autoComplete="on">
            <input
              type="text"
              name="nickname"
              placeholder="Nickname"
              value={registerData.nickname}
              onChange={handleRegisterChange}
              autoComplete="nickname"
              required
            />
            {fieldErrors.nickname && <p className="field-error">{fieldErrors.nickname}</p>}

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={registerData.email}
              onChange={handleRegisterChange}
              autoComplete="email"
              required
            />
            {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}

            <div className="password-field">
              <input
                type={showRegisterPassword ? "text" : "password"}
                name="password"
                placeholder="Contrasena"
                value={registerData.password}
                onChange={handleRegisterChange}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowRegisterPassword((prev) => !prev)}
                aria-label={
                  showRegisterPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                }
              >
                {showRegisterPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
            {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}

            <select
              name="country"
              value={registerData.country}
              onChange={handleRegisterChange}
              required
            >
              <option value="" disabled>
                Selecciona pais
              </option>
              {sortedCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {fieldErrors.country && <p className="field-error">{fieldErrors.country}</p>}

            <select
              name="province"
              value={registerData.province}
              onChange={handleRegisterChange}
              disabled={registerData.country !== "Espana"}
              required={registerData.country === "Espana"}
            >
              <option value="" disabled>
                Selecciona provincia
              </option>
              {sortedProvinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
            {fieldErrors.province && <p className="field-error">{fieldErrors.province}</p>}

            <button type="submit" className="btn-primary">
              Crear cuenta
            </button>

            <button
              type="button"
              className="btn-google"
              onClick={handleGoogleLogin}
            >
              <FcGoogle size={20} />
              Registrarse con Google
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthPage;
