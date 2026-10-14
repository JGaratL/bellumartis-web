const crypto = require("crypto");
const express = require("express");
const pool = require("../db");
const verifyToken = require("../middleware/auth");
const checkRole = require("../middleware/role");

const router = express.Router();
const optionalAuth = verifyToken.optional;

const REASONS = new Set([
  "informe_tecnico",
  "error_plataforma",
  "sugerencia",
  "reporte_contenido",
  "colaboracion",
  "otro",
]);
const LEGACY_REASONS = {
  informe: "informe_tecnico",
  error: "error_plataforma",
  reporte: "reporte_contenido",
};
const PRIORITIES = new Set(["baja", "media", "alta", "critica"]);
const STATUSES = new Set(["pending", "in_review", "resolved", "archived"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const positiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const MAX_REPORTS_PER_WINDOW = positiveInteger(process.env.CONTACT_REPORTS_PER_15_MIN, 5);
const MAX_REPORTS_PER_DAY = positiveInteger(process.env.CONTACT_REPORTS_PER_DAY, 15);
const MIN_SECONDS_BETWEEN_REPORTS = positiveInteger(process.env.CONTACT_REPORT_MIN_INTERVAL_SECONDS, 30);
const WINDOW_MINUTES = positiveInteger(process.env.CONTACT_REPORT_WINDOW_MINUTES, 15);

const cleanText = (value) => typeof value === "string" ? value.trim() : "";
const badRequest = (res, message) => res.status(400).json({ message });

const getRateLimitHash = (req) => {
  const rawIp = req.socket?.remoteAddress || "unknown";
  const normalizedIp = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(normalizedIp)
    .digest("hex");
};

const reserveReportSlot = async (req) => {
  const ipHash = getRateLimitHash(req);
  const connection = await pool.getConnection();
  const now = new Date();
  const nowUtc = now.toISOString().slice(0, 19).replace("T", " ");
  const todayUtc = now.toISOString().slice(0, 10);

  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT IGNORE INTO contact_report_rate_limits
       (ip_hash, window_started_at, window_count, day_started_at, day_count, last_report_at)
       VALUES (?, ?, 0, ?, 0, NULL)`,
      [ipHash, nowUtc, todayUtc]
    );
    const [rows] = await connection.query(
      `SELECT ip_hash,
              DATE_FORMAT(window_started_at, '%Y-%m-%d %H:%i:%s') AS window_started_utc,
              window_count, day_started_at, day_count,
              last_report_at,
              TIMESTAMPDIFF(SECOND, window_started_at, UTC_TIMESTAMP()) AS window_age_seconds,
              TIMESTAMPDIFF(SECOND, last_report_at, UTC_TIMESTAMP()) AS seconds_since_last_report,
              day_started_at <> UTC_DATE() AS day_expired,
              TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), DATE_ADD(UTC_DATE(), INTERVAL 1 DAY)) AS seconds_to_day_reset
       FROM contact_report_rate_limits
       WHERE ip_hash = ?
       FOR UPDATE`,
      [ipHash]
    );
    const row = rows[0];
    const windowAgeSeconds = Number(row.window_age_seconds);
    const windowExpired = windowAgeSeconds >= WINDOW_MINUTES * 60;
    const dayExpired = Boolean(row.day_expired);
    const windowCount = windowExpired ? 0 : Number(row.window_count);
    const dayCount = dayExpired ? 0 : Number(row.day_count);
    const secondsSinceLastReport = row.seconds_since_last_report === null ? null : Number(row.seconds_since_last_report);
    const tooSoon = secondsSinceLastReport !== null && secondsSinceLastReport < MIN_SECONDS_BETWEEN_REPORTS;
    const windowFull = windowCount >= MAX_REPORTS_PER_WINDOW;
    const dayFull = dayCount >= MAX_REPORTS_PER_DAY;

    if (tooSoon || windowFull || dayFull) {
      const retrySeconds = dayFull
        ? Math.max(1, Number(row.seconds_to_day_reset))
        : tooSoon
          ? Math.max(1, MIN_SECONDS_BETWEEN_REPORTS - secondsSinceLastReport)
          : Math.max(1, WINDOW_MINUTES * 60 - windowAgeSeconds);
      await connection.rollback();
      return { allowed: false, retrySeconds };
    }

    await connection.query(
      `UPDATE contact_report_rate_limits
       SET window_started_at = ?, window_count = ?, day_started_at = ?, day_count = ?, last_report_at = ?
       WHERE ip_hash = ?`,
      [windowExpired ? nowUtc : row.window_started_utc, windowCount + 1, todayUtc, dayCount + 1, nowUtc, ipHash]
    );
    await connection.query(
      "DELETE FROM contact_report_rate_limits WHERE last_report_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)"
    );
    await connection.commit();
    return { allowed: true };
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
};

router.post("/reports", optionalAuth, async (req, res) => {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  // Quietly accept honeypot submissions without storing a report.
  if (cleanText(body.website)) {
    return res.status(201).json({ message: "Informe enviado correctamente." });
  }

  const name = cleanText(body.name || body.identifier);
  const email = cleanText(body.email);
  const reasonInput = cleanText(body.reason);
  const reason = LEGACY_REASONS[reasonInput] || reasonInput;
  const subject = cleanText(body.subject);
  const message = cleanText(body.message);
  const priority = cleanText(body.priority || "media");

  if (!name || !email || !reason || !subject || !message) {
    return badRequest(res, "Completa nombre, email, motivo, asunto y mensaje.");
  }
  if (name.length > 100 || email.length > 254 || subject.length > 200 || message.length > 10000) {
    return badRequest(res, "Alguno de los campos supera la longitud máxima permitida.");
  }
  if (!EMAIL_PATTERN.test(email)) return badRequest(res, "Introduce un email válido.");
  if (!REASONS.has(reason)) return badRequest(res, "El motivo seleccionado no es válido.");
  if (!PRIORITIES.has(priority)) return badRequest(res, "La prioridad seleccionada no es válida.");
  if (message.length < 20) return badRequest(res, "El mensaje debe tener al menos 20 caracteres.");

  try {
    const userId = req.user?.id ? Number(req.user.id) : null;
    if (userId !== null && (!Number.isInteger(userId) || userId < 1)) {
      return res.status(401).json({ message: "La sesión no es válida. Vuelve a iniciar sesión o envía el reporte sin esa sesión." });
    }

    const limit = await reserveReportSlot(req);
    if (!limit.allowed) {
      res.set("Retry-After", String(limit.retrySeconds));
      return res.status(429).json({ message: "Has enviado varios reportes recientemente. Espera un poco antes de volver a intentarlo." });
    }

    const [result] = await pool.query(
      `INSERT INTO contact_reports (user_id, name, email, reason, subject, message, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, email, reason, subject, message, priority]
    );
    return res.status(201).json({ message: "Informe enviado correctamente.", id: result.insertId });
  } catch (error) {
    console.error("Error guardando reporte de contacto:", error.message);
    return res.status(500).json({ message: "No se pudo guardar el informe. Inténtalo de nuevo más tarde." });
  }
});

router.get("/reports", verifyToken, checkRole(["admin", "owner"]), async (req, res) => {
  try {
    const search = cleanText(req.query.search).slice(0, 150);
    const reason = cleanText(req.query.reason);
    const priority = cleanText(req.query.priority);
    const status = cleanText(req.query.status);
    const sort = req.query.sort === "oldest" ? "ASC" : "DESC";
    if (reason && !REASONS.has(reason)) return badRequest(res, "Filtro de motivo no válido.");
    if (priority && !PRIORITIES.has(priority)) return badRequest(res, "Filtro de prioridad no válido.");
    if (status && !STATUSES.has(status)) return badRequest(res, "Filtro de estado no válido.");

    const where = [];
    const params = [];
    if (search) {
      where.push("(name LIKE ? OR email LIKE ? OR subject LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (reason) { where.push("reason = ?"); params.push(reason); }
    if (priority) { where.push("priority = ?"); params.push(priority); }
    if (status) { where.push("status = ?"); params.push(status); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [reports] = await pool.query(
      `SELECT id, name, email, reason, subject, message, priority, status, created_at, updated_at, resolved_at
       FROM contact_reports ${whereSql}
       ORDER BY created_at ${sort}, id ${sort}
       LIMIT 100`,
      params
    );
    const [[{ pendingCount }]] = await pool.query(
      "SELECT COUNT(*) AS pendingCount FROM contact_reports WHERE status = 'pending'"
    );
    return res.json({ reports, pendingCount: Number(pendingCount) });
  } catch (error) {
    console.error("Error consultando reportes de contacto:", error.message);
    return res.status(500).json({ message: "No se pudieron cargar los reportes." });
  }
});

router.patch("/reports/:id", verifyToken, checkRole(["admin", "owner"]), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return badRequest(res, "ID de reporte no válido.");

  const nextStatus = req.body?.status;
  const nextPriority = req.body?.priority;
  if (nextStatus === undefined && nextPriority === undefined) {
    return badRequest(res, "Indica un estado o una prioridad para actualizar.");
  }
  if (nextStatus !== undefined && !STATUSES.has(nextStatus)) return badRequest(res, "El estado seleccionado no es válido.");
  if (nextPriority !== undefined && !PRIORITIES.has(nextPriority)) return badRequest(res, "La prioridad seleccionada no es válida.");

  try {
    const [rows] = await pool.query("SELECT status, priority, resolved_at FROM contact_reports WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Reporte no encontrado." });
    const status = nextStatus === undefined ? rows[0].status : nextStatus;
    const priority = nextPriority === undefined ? rows[0].priority : nextPriority;
    await pool.query(
      `UPDATE contact_reports
       SET status = ?, priority = ?,
           resolved_at = CASE WHEN ? = 'resolved' THEN COALESCE(resolved_at, NOW()) ELSE NULL END
       WHERE id = ?`,
      [status, priority, status, id]
    );
    const [updated] = await pool.query(
      `SELECT id, name, email, reason, subject, message, priority, status, created_at, updated_at, resolved_at
       FROM contact_reports WHERE id = ?`,
      [id]
    );
    return res.json({ report: updated[0] });
  } catch (error) {
    console.error("Error actualizando reporte de contacto:", error.message);
    return res.status(500).json({ message: "No se pudo actualizar el reporte." });
  }
});

router.delete("/reports/:id", verifyToken, checkRole(["admin", "owner"]), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return badRequest(res, "ID de reporte no válido.");

  try {
    const [result] = await pool.query(
      "DELETE FROM contact_reports WHERE id = ? AND status = 'resolved'",
      [id]
    );
    if (!result.affectedRows) {
      const [rows] = await pool.query("SELECT status FROM contact_reports WHERE id = ?", [id]);
      if (!rows.length) return res.status(404).json({ message: "Reporte no encontrado." });
      return res.status(409).json({ message: "Solo se pueden eliminar reportes resueltos." });
    }
    return res.json({ message: "Reporte eliminado correctamente." });
  } catch (error) {
    console.error("Error eliminando reporte de contacto:", error.message);
    return res.status(500).json({ message: "No se pudo eliminar el reporte." });
  }
});

module.exports = router;
