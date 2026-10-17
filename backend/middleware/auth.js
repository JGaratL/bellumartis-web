const jwt = require("jsonwebtoken");
const pool = require("../db");
const credentialVersion = require("../services/credentialVersion");
const { SESSION_COOKIE, parseCookies } = require("./sessionCookies");

function sessionToken(req) {
  return parseCookies(req.headers.cookie || "")[SESSION_COOKIE];
}

async function resolveSession(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const [rows] = await pool.query("SELECT id, role, password FROM users WHERE id = ? LIMIT 1", [decoded.id]);
  const user = rows[0];
  if (!user || !decoded.cv || decoded.cv !== credentialVersion(user.password)) return null;
  return { ...decoded, role: user.role || "user" };
}

async function verifyToken(req, res, next) {
  const token = sessionToken(req);
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    req.user = await resolveSession(token);
    if (!req.user) return res.status(401).json({ error: "Sesión inválida o revocada" });
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(503).json({ error: "No se pudo validar la sesión" });
  }
}

verifyToken.optional = async (req, res, next) => {
  const token = sessionToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = await resolveSession(token);
  } catch {
    // This endpoint is public; an expired or invalid optional session is anonymous.
    req.user = null;
  }
  return next();
};

module.exports = verifyToken;
