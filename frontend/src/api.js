import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
let csrfToken = null;

export function setCsrfToken(value) { csrfToken = value || null; }

export function apiFetch(input, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  const target = typeof input === "string" && input.startsWith("http://localhost:5000")
    ? `${API_URL}${input.slice("http://localhost:5000".length)}`
    : input;
  if (! ["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  return fetch(target, { ...options, headers, credentials: "include" });
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) config.headers["X-CSRF-Token"] = csrfToken;
  return config;
});

export default api;
