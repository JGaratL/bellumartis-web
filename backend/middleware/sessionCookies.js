const crypto = require("crypto");

const SESSION_COOKIE = "auth_token";
const CSRF_COOKIE = "csrf_token";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(maxAge = SESSION_MAX_AGE) {
  const sameSite = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    path: "/",
    maxAge,
  };
}

function appendSetCookie(res, value) {
  const current = res.getHeader("Set-Cookie");
  res.setHeader("Set-Cookie", current ? [...(Array.isArray(current) ? current : [current]), value] : value);
}

function serializeCookie(name, value, options) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`);
  return parts.join("; ");
}

function setSessionCookies(res, token) {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  appendSetCookie(res, serializeCookie(SESSION_COOKIE, token, cookieOptions()));
  appendSetCookie(res, serializeCookie(CSRF_COOKIE, csrfToken, cookieOptions()));
  return csrfToken;
}

function setCsrfCookie(res) {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  appendSetCookie(res, serializeCookie(CSRF_COOKIE, csrfToken, cookieOptions()));
  return csrfToken;
}

function clearSessionCookies(res) {
  appendSetCookie(res, serializeCookie(SESSION_COOKIE, "", cookieOptions(0)));
  appendSetCookie(res, serializeCookie(CSRF_COOKIE, "", cookieOptions(0)));
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => {
    const index = part.indexOf("=");
    if (index < 0) return ["", ""];
    const value = part.slice(index + 1).trim();
    try { return [part.slice(0, index).trim(), decodeURIComponent(value)]; }
    catch { return [part.slice(0, index).trim(), value]; }
  }).filter(([key]) => key));
}

module.exports = { SESSION_COOKIE, CSRF_COOKIE, SESSION_MAX_AGE, cookieOptions, parseCookies, setSessionCookies, setCsrfCookie, clearSessionCookies };
