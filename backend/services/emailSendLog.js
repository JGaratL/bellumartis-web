const pool = require("../db");

let initialized;

const ensureEmailSendLog = () => {
  if (!initialized) {
    initialized = (async () => {
      await pool.query(`
      CREATE TABLE IF NOT EXISTS email_send_log (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        provider ENUM('brevo', 'foundermail') NOT NULL,
        sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        outcome ENUM('accepted', 'failed') NOT NULL,
        operation_id VARCHAR(255) NULL,
        email_type VARCHAR(40) NOT NULL DEFAULT 'administrative',
        recipient_count INT UNSIGNED NOT NULL DEFAULT 1,
        UNIQUE KEY uq_email_send_provider_operation (provider, operation_id),
        KEY idx_email_send_provider_date (provider, outcome, sent_at)
      )
      `);
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_send_log'
          AND COLUMN_NAME = 'recipient_count'
      `);
      if (!columns.length) {
        await pool.query("ALTER TABLE email_send_log ADD COLUMN recipient_count INT UNSIGNED NOT NULL DEFAULT 1 AFTER email_type");
      }
    })().catch((error) => {
      initialized = null;
      throw error;
    });
  }
  return initialized;
};

const recordEmailSend = async ({ provider, outcome, operationId = null, type = "administrative", recipientCount = 1 }) => {
  try {
    await ensureEmailSendLog();
    await pool.query(
      `INSERT INTO email_send_log (provider, sent_at, outcome, operation_id, email_type, recipient_count)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         sent_at = IF(VALUES(outcome) = 'accepted', VALUES(sent_at), sent_at),
         outcome = IF(VALUES(outcome) = 'accepted', 'accepted', outcome),
         recipient_count = IF(VALUES(outcome) = 'accepted', VALUES(recipient_count), recipient_count)`,
      [provider, new Date().toISOString().slice(0, 19).replace("T", " "), outcome, operationId ? String(operationId).slice(0, 255) : null, type, Math.max(1, Number(recipientCount) || 1)]
    );
  } catch (error) {
    // Logging failure must not misreport an email accepted by the provider as failed.
    console.error("No se pudo registrar el resultado del envío de email:", error.message);
  }
};

const madridBounds = (startWallTime, endWallTime) => {
  const asUtc = (wallTime) => {
    let guess = wallTime;
    for (let i = 0; i < 2; i += 1) {
      const formatted = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
      }).formatToParts(new Date(guess)).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
      const represented = Date.UTC(+formatted.year, +formatted.month - 1, +formatted.day, +formatted.hour, +formatted.minute, +formatted.second);
      guess += wallTime - represented;
    }
    return new Date(guess);
  };
  const formatUtc = (date) => date.toISOString().slice(0, 19).replace("T", " ");
  return { start: formatUtc(asUtc(startWallTime)), end: formatUtc(asUtc(endWallTime)) };
};

const madridCalendarParts = (now) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

const madridDateString = (now = new Date()) => {
  const parts = madridCalendarParts(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const madridDayBounds = (now = new Date()) => {
  const parts = madridCalendarParts(now);
  const localMidnight = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  return madridBounds(localMidnight, localMidnight + 86400000);
};

const madridMonthBounds = (now = new Date()) => {
  const parts = madridCalendarParts(now);
  const localMonthStart = Date.UTC(Number(parts.year), Number(parts.month) - 1, 1);
  const nextMonthStart = Date.UTC(Number(parts.year), Number(parts.month), 1);
  return madridBounds(localMonthStart, nextMonthStart);
};

module.exports = { ensureEmailSendLog, recordEmailSend, madridDayBounds, madridMonthBounds, madridDateString };
