import {
  RiArticleLine,
  RiCalendarEventLine,
  RiImageLine,
  RiMailLine,
  RiTeamLine,
} from "react-icons/ri";
import { SPAIN_PROVINCES } from "../../../utils/spainProvinces";

export const ADMIN_MENU = [
  {
    id: "usuarios",
    label: "Usuarios",
    icon: RiTeamLine,
    description: "Gestiona altas, roles, estados y acceso de usuarios.",
  },
  {
    id: "eventos",
    label: "Eventos",
    icon: RiCalendarEventLine,
    description: "Crea, edita y supervisa eventos del calendario.",
  },
  {
    id: "emails",
    label: "Emails",
    icon: RiMailLine,
    description: "Controla notificaciones, verificacion y plantillas.",
  },
  {
    id: "banners",
    label: "Banners",
    icon: RiImageLine,
    description: "Administra la parte visual promocional de la web.",
  },
  {
    id: "articulos",
    label: "Articulos",
    icon: RiArticleLine,
    description: "Modera publicaciones y contenidos editoriales.",
  },
];

export const ROLE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "user", label: "Usuario" },
  { value: "moderator", label: "Moderador" },
  { value: "admin", label: "Administrador" },
  { value: "owner", label: "Owner" },
];

export const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "blocked", label: "Bloqueado" },
];

export const LAST_LOGIN_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "older", label: "Más de 30 días" },
];

export const PROVINCE_OPTIONS = [
  { value: "", label: "Todas" },
  ...SPAIN_PROVINCES.map((province) => ({
    value: province,
    label: province,
  })),
];

export const ROLE_LABELS = {
  user: "User",
  admin: "Admin",
  owner: "Owner",
  moderator: "Mod",
};

export function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("es-ES");
}

export function getLocation(user) {
  return user?.province || user?.country || "-";
}

export function getRoleClass(role) {
  if (role === "admin") return "role-admin";
  if (role === "owner") return "role-owner";
  if (role === "moderator") return "role-moderator";
  return "role-user";
}

export function getActiveAdminSection(activeSection) {
  return ADMIN_MENU.find((item) => item.id === activeSection) || ADMIN_MENU[0];
}
