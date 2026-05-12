import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
  ============================
  INIT (cargar sesión)
  ============================
  */
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      const savedToken = localStorage.getItem("token");

      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
    } catch (err) {
      console.error("Error cargando sesión:", err);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }

    setLoading(false);
  }, []);

  /*
  ============================
  LOGIN (email/password)
  ============================
  */
  const login = (data) => {
    // backend devuelve: { token, user }
    const newUser = data.user;
    const newToken = data.token;

    setUser(newUser);
    setToken(newToken);

    localStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("token", newToken);
  };

  /*
  ============================
  GOOGLE LOGIN
  ============================
  */
  const googleLogin = async (credentialResponse) => {
    try {
      if (!credentialResponse?.credential) {
        throw new Error("Respuesta de Google inválida");
      }

      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error Google Login");
      }

      // reutilizamos mismo flujo
      login(data);

      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  /*
  ============================
  LOGOUT
  ============================
  */
  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  /*
  ============================
  ROLES HELPERS
  ============================
  */
  const hasRole = (roles) => {
    if (!user) return false;
    if (!Array.isArray(roles)) roles = [roles];

    return roles.includes(user.role);
  };

  const isAdmin = () => hasRole("admin");
  const isOwner = () => hasRole("owner");
  const isModerator = () => hasRole("moderator");

  /*
  ============================
  CONTEXT VALUE
  ============================
  */
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,

        login,
        googleLogin,
        logout,

        hasRole,
        isAdmin,
        isOwner,
        isModerator,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
