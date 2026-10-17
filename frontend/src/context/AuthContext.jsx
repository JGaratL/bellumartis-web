import { createContext, useContext, useEffect, useState } from "react";
import { API_URL, apiFetch, setCsrfToken } from "../api";

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch(`${API_URL}/users/me`)
      .then(async (response) => {
        if (!response.ok) throw new Error("No hay sesión activa");
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setCsrfToken(data.csrfToken);
        const sessionUser = { ...data };
        delete sessionUser.csrfToken;
        setUser(sessionUser);
      })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    // Remove credentials left behind by the previous localStorage-based auth.
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return () => { active = false; };
  }, []);

  const login = (data) => {
    setCsrfToken(data.csrfToken);
    setUser(data.user);
  };

  const googleLogin = async (credentialResponse) => {
    if (!credentialResponse?.credential) throw new Error("Respuesta de Google inválida");
    const res = await apiFetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: credentialResponse.credential }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error Google Login");
    login(data);
    return data;
  };

  const logout = async () => {
    try { await apiFetch(`${API_URL}/logout`, { method: "POST" }); }
    finally { setUser(null); setCsrfToken(null); }
  };

  const updateUser = (partialUser) => setUser((previous) => ({ ...(previous || {}), ...(partialUser || {}) }));
  const hasRole = (roles) => {
    if (!user) return false;
    if (!Array.isArray(roles)) roles = [roles];
    return roles.includes(user.role);
  };

  return <AuthContext.Provider value={{ user, loading, login, googleLogin, logout, updateUser, hasRole,
    isAdmin: () => hasRole("admin"), isOwner: () => hasRole("owner"), isModerator: () => hasRole("moderator") }}>
    {children}
  </AuthContext.Provider>;
}
