import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, hasRole } = useContext(AuthContext);

  /*
  ============================
  LOADING STATE
  ============================
  */
  if (loading) return null; // o un spinner si quieres

  /*
  ============================
  NO LOGUEADO
  ============================
  */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /*
  ============================
  CONTROL DE ROLES (OPCIONAL)
  ============================
  */
  if (roles && !hasRole(roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
}