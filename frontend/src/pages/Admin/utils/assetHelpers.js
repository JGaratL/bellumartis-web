export function resolveAdminAssetUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  if (value.startsWith("/")) {
    return `${baseUrl}${value}`;
  }

  return `${baseUrl}/${value.replace(/^\/+/, "")}`;
}
