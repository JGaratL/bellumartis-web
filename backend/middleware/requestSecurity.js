const crypto = require("crypto");
const { CSRF_COOKIE, SESSION_COOKIE, parseCookies } = require("./sessionCookies");

function allowedOrigins() {
  const configured = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",").map((value) => value.trim()).filter(Boolean);
  if (process.env.NODE_ENV !== "production") configured.push("http://localhost:5173", "http://127.0.0.1:5173");
  return new Set(configured);
}

function originAllowed(origin) {
  return !origin || allowedOrigins().has(origin);
}

function requestSecurity(req, res, next) {
  const origin = req.get("Origin");
  if (!originAllowed(origin)) return res.status(403).json({ error: "Origen no permitido" });
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const loginOrRegistration = req.path === "/login" || req.path === "/register" || req.path.startsWith("/auth/");
  const cookies = parseCookies(req.headers.cookie || "");
  if (unsafe && !loginOrRegistration && cookies[SESSION_COOKIE]) {
    const cookieToken = cookies[CSRF_COOKIE];
    const headerToken = req.get("X-CSRF-Token");
    const sameToken = headerToken && cookieToken && Buffer.byteLength(headerToken) === Buffer.byteLength(cookieToken) && crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken));
    if (!origin || !sameToken) {
      return res.status(403).json({ error: "Token CSRF inválido" });
    }
  }
  next();
}

module.exports = { allowedOrigins, originAllowed, requestSecurity };
