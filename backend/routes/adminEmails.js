const express = require("express");
const fs = require("fs");
const crypto = require("crypto");

const pool = require("../db");

const verifyToken = require("../middleware/auth");

const checkRole = require("../middleware/role");

const {
  verifyFounderMailSmtp,
} = require("../services/founderMailSmtpService");

const {
  verifyFounderMailImap,
} = require("../services/founderMailImapService");

const {
  getFounderMailSentMessages,
  countFounderMailSentMessagesForRanges,
  getFounderMailInboxMessages,
  markFounderMailInboxMessageRead,
  deleteFounderMailMessages,
} = require("../services/founderMailImapService");

const {
  sendFounderMail,
  getFounderMailDrafts,
  saveFounderMailDraft,
  deleteFounderMailDraft,
} = require("../services/founderMailService");

const { sendEmail, getBrevoTransactionalUsage } = require("../services/brevoService");
const { ensureEmailSendLog, recordEmailSend, madridDayBounds, madridMonthBounds, madridDateString } = require("../services/emailSendLog");

const multer = require("multer");

const path = require("path");

const router = express.Router();

const createAsyncTtlCache = (ttlMs) => {
  const entries = new Map();
  const cached = (key, load) => {
    const current = entries.get(key);
    if (current && current.expiresAt > Date.now()) return Promise.resolve(current.value);

    const entry = { expiresAt: Number.POSITIVE_INFINITY, value: null };
    entries.set(key, entry);
    entry.value = Promise.resolve()
      .then(load)
      .then((value) => {
        entry.expiresAt = Date.now() + ttlMs;
        entry.value = value;
        return value;
      })
      .catch((error) => {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      });
    return entry.value;
  };
  cached.clear = (key) => entries.delete(key);
  return cached;
};

// Avoid reopening FounderMail IMAP sessions when admins briefly switch
// dashboard sections or when React remounts the Emails panel.
const getCachedFounderInbox = createAsyncTtlCache(30_000);
const getCachedFounderSent = createAsyncTtlCache(60_000);
const getCachedEmailUsage = createAsyncTtlCache(30_000);

router.get("/stats/today", verifyToken, checkRole(["admin", "owner"]), async (req, res) => {
  try {
    await ensureEmailSendLog();
    const { start, end } = madridDayBounds();
    const [rows] = await pool.query(
      `SELECT provider, SUM(recipient_count) AS total
       FROM email_send_log
       WHERE outcome = 'accepted' AND sent_at >= ? AND sent_at < ?
       GROUP BY provider`,
      [start, end]
    );
    const counts = { brevo: 0, founderMail: 0 };
    rows.forEach((row) => {
      if (row.provider === "brevo") counts.brevo = Number(row.total);
      if (row.provider === "foundermail") counts.founderMail = Number(row.total);
    });
    return res.json({ ...counts, total: counts.brevo + counts.founderMail, timezone: "Europe/Madrid" });
  } catch (error) {
    console.error("ERROR OBTENIENDO ESTADÍSTICAS DE EMAIL:", error.message);
    return res.status(500).json({ error: "No se pudieron obtener las estadísticas de email." });
  }
});

router.get("/stats/usage", verifyToken, checkRole(["admin", "owner"]), async (req, res) => {
  const now = new Date();
  const today = madridDayBounds(now);
  const month = madridMonthBounds(now);
  const nowUtc = now.toISOString().slice(0, 19).replace("T", " ");
  const usage = await getCachedEmailUsage("current", async () => Promise.allSettled([
    getBrevoQuotaUsage(),
    countFounderMailSentMessagesForRanges([
      { from: today.start, to: nowUtc },
      { from: month.start, to: nowUtc },
    ]),
  ]));
  const [brevoResult, founderResult] = usage;

  return res.json({
    timezone: "Europe/Madrid",
    brevo: brevoResult.status === "fulfilled"
      ? { today: brevoResult.value, dailyLimit: 300 }
      : { unavailable: true },
    founderMail: founderResult.status === "fulfilled"
      ? {
        today: founderResult.value[0],
        month: founderResult.value[1],
        dailyLimit: 100,
        monthlyLimit: 3000,
        dailyResetTimezone: "UTC",
      }
      : { unavailable: true },
  });
});

router.get(
  "/test-founder-smtp",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      await verifyFounderMailSmtp();

      return res.json({
        success: true,
        message: "Conexión SMTP con FounderMail correcta.",
      });
    } catch (error) {
      console.error(
        "ERROR PROBANDO SMTP FOUNDERMAIL:",
        error
      );

      return res.status(502).json({
        success: false,
        error:
          error.message ||
          "No se pudo conectar con el SMTP de FounderMail.",
      });
    }
  }
);

router.get(
  "/test-founder-imap",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const result =
        await verifyFounderMailImap();

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(
        "ERROR PROBANDO IMAP FOUNDERMAIL:",
        error
      );

      return res.status(502).json({
        success: false,
        error:
          error.message ||
          "No se pudo conectar con IMAP de FounderMail.",
      });
    }
  }
);

router.get(
  "/sent",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      await ensureScheduledEmailsTable();
      const messages = await getCachedFounderSent("latest-50", () =>
        getFounderMailSentMessages({ limit: 50 })
      );
      const [archiveRows] = await pool.query(`
        SELECT id, provider, provider_message_id, recipients_json, subject,
               html_content, text_content,
               DATE_FORMAT(sent_at, '%Y-%m-%dT%H:%i:%sZ') AS sent_at_utc
        FROM sent_email_archive
        ORDER BY sent_at DESC LIMIT 50
      `);

      return res.json({
        success: true,
        count: messages.length + archiveRows.length,
        messages,
        archiveMessages: archiveRows.map((email) => ({
          id: email.id,
          provider: email.provider,
          messageId: email.provider_message_id,
          recipients: parseJsonColumn(email.recipients_json, []),
          subject: email.subject,
          html: email.html_content,
          text: email.text_content,
          date: email.sent_at_utc,
        })),
      });
    } catch (error) {
      console.error(
        "ERROR OBTENIENDO SENT DE FOUNDERMAIL:",
        error
      );

      return res.status(502).json({
        success: false,
        error:
          error.message ||
          "No se pudieron obtener los enviados.",
      });
    }
  }
);

router.post(
  "/test-founder-smtp-send",
  verifyToken,
  checkRole(["admin", "owner"]),
  multer({ dest: "uploads/emails/" }).single("attachment"),
  async (req, res) => {
    try {
      const {
        to,
        subject = "Prueba SMTP con adjunto",
        text = "Prueba de envío SMTP desde Bellumartis.",
      } = req.body || {};

      if (!to) {
        return res.status(400).json({
          error: "Falta el destinatario.",
        });
      }

      const {
        sendFounderMailSmtp,
      } = require("../services/founderMailSmtpService");

      const result = await sendFounderMailSmtp({
        to,
        subject,
        text,
        html: `<p>${text}</p>`,
        attachments: req.file
          ? [
            {
              filename: req.file.originalname,
              path: req.file.path,
            },
          ]
          : [],
      });

      return res.json({
        success: true,
        message: "Correo SMTP enviado correctamente.",
        messageId: result.messageId,
      });
    } catch (error) {
      console.error(
        "ERROR ENVIANDO PRUEBA SMTP FOUNDERMAIL:",
        error
      );

      return res.status(502).json({
        success: false,
        error:
          error.message ||
          "No se pudo enviar el correo SMTP.",
      });
    }
  }
);

const emailAttachmentStorage = multer.diskStorage({

  destination: (req, file, cb) => {

    cb(null, "uploads/emails");

  },

  filename: (req, file, cb) => {

    const unique =

      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(

      null,

      unique + path.extname(file.originalname)

    );

  }

});

const founderMailUpload = multer({
  storage: emailAttachmentStorage,
});

const emailUpload = multer({

  storage: emailAttachmentStorage,

  fileFilter: (req, file, cb) => {

    const allowedExtensions = [

      ".jpg",

      ".jpeg",

      ".png",

      ".webp",

      ".gif",

      ".pdf",

      ".doc",

      ".docx",

      ".xls",

      ".xlsx",

      ".zip",

      ".txt",

    ];

    const extension = path

      .extname(file.originalname)

      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {

      return cb(

        new Error(

          `Archivo no válido: ${file.originalname}`

        )

      );

    }

    cb(null, true);

  },

});

const ALLOWED_RECIPIENT_TYPES = new Set([

  "users",

  "all_users",

  "spain_users",

  "province",

  "custom",

  "newsletter",

]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) =>

  String(email || "").trim().toLowerCase();

const isValidEmail = (email) =>

  EMAIL_REGEX.test(normalizeEmail(email));

const stripHtml = (html) =>

  String(html || "").replace(/<[^>]*>/g, "");

const uniqueValidEmails = (rows) => {

  const seen = new Set();

  return rows

    .map((row) => {

      if (typeof row === "string") {

        return row;

      }

      return row?.email;

    })

    .map(normalizeEmail)

    .filter((email) => {

      if (!email || !isValidEmail(email) || seen.has(email)) {

        return false;

      }

      seen.add(email);

      return true;

    });

};

const getTableColumns = async (tableName) => {

  const [rows] = await pool.query(

    `

    SELECT COLUMN_NAME

    FROM INFORMATION_SCHEMA.COLUMNS

    WHERE TABLE_SCHEMA = DATABASE()

      AND TABLE_NAME = ?

    `,

    [tableName]

  );

  return new Set(rows.map((row) => row.COLUMN_NAME));

};

const tableExists = async (tableName) => {

  const [rows] = await pool.query(

    `

    SELECT TABLE_NAME

    FROM INFORMATION_SCHEMA.TABLES

    WHERE TABLE_SCHEMA = DATABASE()

      AND TABLE_NAME = ?

    LIMIT 1

    `,

    [tableName]

  );

  return rows.length > 0;

};

const userActiveWhere = (columns) => {

  const where = [

    "email IS NOT NULL",

    "TRIM(email) <> ''",

  ];

  if (columns.has("status")) {

    where.push("status = 'active'");

  }

  if (columns.has("email_verified_at")) {

    where.push("email_verified_at IS NOT NULL");

  }

  return where;

};

const queryUserEmails = async ({ where = [], params = [] } = {}) => {

  const columns = await getTableColumns("users");

  const finalWhere = [

    ...userActiveWhere(columns),

    ...where,

  ];

  const [users] = await pool.query(

    `

    SELECT email

    FROM users

    WHERE ${finalWhere.join(" AND ")}

    ORDER BY id ASC

    `,

    params

  );

  return uniqueValidEmails(users);

};

const getManualRecipients = (recipients) => {

  if (!Array.isArray(recipients)) {

    return [];

  }

  return uniqueValidEmails(recipients);

};

const hasInvalidRecipientEmail = (recipients) => {

  if (!Array.isArray(recipients)) {

    return true;

  }

  return recipients.some((recipient) => {

    const email = typeof recipient === "string"

      ? recipient

      : recipient?.email;

    return !isValidEmail(email);

  });

};

const resolveRecipients = async ({ type, recipients }) => {

  switch (type) {

    case "users": {

      if (hasInvalidRecipientEmail(recipients)) {

        throw Object.assign(

          new Error("Hay usuarios seleccionados sin email valido."),

          { statusCode: 400 }

        );

      }

      const selectedEmails = getManualRecipients(recipients);

      if (selectedEmails.length === 0) {

        throw Object.assign(

          new Error("Selecciona al menos un usuario activo con email valido."),

          { statusCode: 400 }

        );

      }

      const emails = await queryUserEmails({

        where: ["email IN (?)"],

        params: [selectedEmails],

      });

      if (emails.length === 0) {

        throw Object.assign(

          new Error("Los usuarios seleccionados no estan activos o no tienen email valido."),

          { statusCode: 400 }

        );

      }

      return emails;

    }

    case "custom": {

      if (hasInvalidRecipientEmail(recipients)) {

        throw Object.assign(

          new Error("Hay direcciones de email no validas."),

          { statusCode: 400 }

        );

      }

      const emails = getManualRecipients(recipients);

      if (emails.length === 0) {

        throw Object.assign(

          new Error("Indica al menos una direccion de email valida."),

          { statusCode: 400 }

        );

      }

      return emails;

    }

    case "all_users": {

      const emails = await queryUserEmails();

      if (emails.length === 0) {

        throw Object.assign(

          new Error("No hay usuarios activos con email."),

          { statusCode: 400 }

        );

      }

      return emails;

    }

    case "spain_users": {

      const emails = await queryUserEmails({

        where: ["country IN (?, ?, ?)"],

        params: ["España", "Spain", "ES"],

      });

      if (emails.length === 0) {

        throw Object.assign(

          new Error("No hay usuarios activos de España con email."),

          { statusCode: 400 }

        );

      }

      return emails;

    }

    case "province": {

      const province = String(recipients?.[0] || "").trim();

      if (!province) {

        throw Object.assign(

          new Error("Selecciona una provincia."),

          { statusCode: 400 }

        );

      }

      const emails = await queryUserEmails({

        where: ["province = ?"],

        params: [province],

      });

      if (emails.length === 0) {

        throw Object.assign(

          new Error(`No hay usuarios activos con email en ${province}.`),

          { statusCode: 400 }

        );

      }

      return emails;

    }

    case "newsletter": {

      const exists = await tableExists("newsletter_subscribers");

      if (!exists) {

        throw Object.assign(

          new Error("La tabla newsletter_subscribers no existe todavia."),

          { statusCode: 501 }

        );

      }

      const columns = await getTableColumns("newsletter_subscribers");

      const where = [

        "email IS NOT NULL",

        "TRIM(email) <> ''",

      ];

      if (columns.has("status")) {

        where.push("status IN ('active', 'confirmed', 'subscribed')");

      }

      const [subscribers] = await pool.query(

        `

        SELECT email

        FROM newsletter_subscribers

        WHERE ${where.join(" AND ")}

        ORDER BY id ASC

        `

      );

      const emails = uniqueValidEmails(subscribers);

      if (emails.length === 0) {

        throw Object.assign(

          new Error("No hay suscriptores activos de newsletter con email."),

          { statusCode: 400 }

        );

      }

      return emails;

    }

    default:

      throw Object.assign(

        new Error("Tipo de destinatario no valido."),

        { statusCode: 400 }

      );

  }

};

const ensureScheduledEmailsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_emails (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      scheduled_at DATETIME NOT NULL,
      recipient_type VARCHAR(30) NOT NULL,
      recipients_json JSON NOT NULL,
      subject VARCHAR(998) NOT NULL,
      html_content LONGTEXT NOT NULL,
      text_content LONGTEXT NULL,
      attachments_json JSON NOT NULL,
      status ENUM('scheduled', 'queued', 'sending', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'scheduled',
      error_message TEXT NULL,
      idempotency_key VARCHAR(36) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      sent_at DATETIME NULL,
      KEY idx_scheduled_emails_due (status, scheduled_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [columns] = await pool.query(`
    SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scheduled_emails'
  `);
  const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
  const statusColumn = columns.find((column) => column.COLUMN_NAME === "status");
  if (statusColumn && !statusColumn.COLUMN_TYPE.includes("'queued'")) {
    await pool.query("ALTER TABLE scheduled_emails MODIFY status ENUM('scheduled', 'queued', 'sending', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'scheduled'");
  }
  if (!existingColumns.has("idempotency_key")) {
    await pool.query("ALTER TABLE scheduled_emails ADD COLUMN idempotency_key VARCHAR(36) NULL AFTER error_message");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sent_email_archive (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      source_job_id BIGINT UNSIGNED NULL,
      provider ENUM('brevo', 'foundermail') NOT NULL,
      provider_message_id VARCHAR(255) NULL,
      idempotency_key VARCHAR(36) NULL,
      recipients_json JSON NOT NULL,
      subject VARCHAR(998) NOT NULL,
      html_content LONGTEXT NOT NULL,
      text_content LONGTEXT NULL,
      sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_sent_email_archive_idempotency (idempotency_key),
      KEY idx_sent_email_archive_sent_at (sent_at),
      KEY idx_sent_email_archive_job (source_job_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await ensureEmailSendLog();
};

const getBrevoQuotaUsage = async () => {
  await ensureEmailSendLog();
  const today = madridDateString(new Date());
  const providerUsage = await getBrevoTransactionalUsage(today);
  const { start, end } = madridDayBounds();
  const [rows] = await pool.query(`
    SELECT COALESCE(SUM(recipient_count), 0) AS total
    FROM email_send_log
    WHERE provider = 'brevo' AND outcome = 'accepted'
      AND sent_at >= ? AND sent_at < ?
  `, [start, end]);
  // API statistics may lag; our accepted-recipient ledger protects sends made in this app.
  return Math.max(Number(providerUsage) || 0, Number(rows[0]?.total) || 0);
};

const isBrevoQuotaError = (error) => {
  const message = [error?.message, error?.body, error?.response?.data]
    .map((value) => typeof value === "string" ? value : JSON.stringify(value || ""))
    .join(" ")
    .toLowerCase();
  return Number(error?.statusCode || error?.status || error?.response?.status) === 429
    || /quota|daily.?limit|rate.?limit|too many requests|limit reached/.test(message);
};

const parseJsonColumn = (value, fallback) => {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const removeScheduledAttachments = async (attachments = []) => {
  await Promise.all(attachments.map(async (file) => {
    if (!file?.path) return;
    try {
      await fs.promises.unlink(file.path);
    } catch (error) {
      if (error.code !== "ENOENT") console.error("No se pudo borrar el adjunto programado:", error.message);
    }
  }));
};

const BREVO_DAILY_SEND_LIMIT = Math.max(1, Number(process.env.BREVO_DAILY_SEND_LIMIT) || 300);
const usesBrevo = (recipientType) => !["users", "custom"].includes(recipientType);
const isBrevoDuplicateRequest = (error) => /duplicate_parameter|idempotency.?key/i.test(String(error?.message || error));

let scheduledEmailWorkerRunning = false;
const processScheduledEmails = async () => {
  if (scheduledEmailWorkerRunning) return;
  scheduledEmailWorkerRunning = true;
  try {
    await ensureScheduledEmailsTable();
    // Recover claims left behind by a crashed backend process. Brevo idempotency
    // keys are retained so an ambiguous network timeout cannot duplicate mail.
    await pool.query(`
      UPDATE scheduled_emails
      SET status = IF(recipient_type IN ('users', 'custom'), 'scheduled', 'queued'),
          updated_at = UTC_TIMESTAMP()
      WHERE status = 'sending' AND updated_at < UTC_TIMESTAMP() - INTERVAL 10 MINUTE
    `);
    const [dueEmails] = await pool.query(`
      SELECT * FROM scheduled_emails
      WHERE status IN ('scheduled', 'queued') AND scheduled_at <= UTC_TIMESTAMP()
      ORDER BY scheduled_at ASC LIMIT 20
    `);

    let brevoRemaining;
    for (const email of dueEmails) {
      const brevoJob = usesBrevo(email.recipient_type);
      if (brevoJob) {
        if (brevoRemaining === undefined) {
          try {
            const used = await getBrevoQuotaUsage();
            brevoRemaining = Math.max(0, BREVO_DAILY_SEND_LIMIT - used);
          } catch (error) {
            console.error("No se pudo consultar la cuota de Brevo; el email queda en cola:", error.message);
            continue;
          }
        }
        if (brevoRemaining <= 0) {
          if (email.status === "scheduled") {
            await pool.query(
              "UPDATE scheduled_emails SET status = 'queued', updated_at = UTC_TIMESTAMP() WHERE id = ? AND status = 'scheduled'",
              [email.id]
            );
          }
          continue;
        }
      }

      const recipients = parseJsonColumn(email.recipients_json, []);
      const recipientsToSend = brevoJob ? recipients.slice(0, brevoRemaining) : recipients;
      if (!recipientsToSend.length) {
        await pool.query("DELETE FROM scheduled_emails WHERE id = ? AND status IN ('scheduled', 'queued')", [email.id]);
        await removeScheduledAttachments(parseJsonColumn(email.attachments_json, []));
        continue;
      }

      const idempotencyKey = email.idempotency_key || crypto.randomUUID();
      const [claim] = await pool.query(
        `UPDATE scheduled_emails
         SET status = 'sending', idempotency_key = ?, updated_at = UTC_TIMESTAMP()
         WHERE id = ? AND status IN ('scheduled', 'queued')`,
        [idempotencyKey, email.id]
      );
      if (!claim.affectedRows) continue;

      const attachments = parseJsonColumn(email.attachments_json, []);
      try {
        if (brevoJob) {
          let result;
          try {
            result = await sendEmail({
              to: recipientsToSend,
              subject: email.subject,
              html: email.html_content,
              text: email.text_content || stripHtml(email.html_content),
              attachments,
              idempotencyKey,
              logOperationId: idempotencyKey,
              deleteAttachmentsAfterSend: false,
            });
          } catch (error) {
            if (!isBrevoDuplicateRequest(error)) throw error;
            // The provider confirms this idempotency key was already processed.
            await recordEmailSend({ provider: "brevo", outcome: "accepted", operationId: idempotencyKey, recipientCount: recipientsToSend.length });
            result = {};
          }

          await pool.query(`
            INSERT INTO sent_email_archive
              (source_job_id, provider, provider_message_id, idempotency_key,
               recipients_json, subject, html_content, text_content, sent_at)
            VALUES (?, 'brevo', ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
            ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
          `, [email.id, result?.messageId || result?.messageIds?.[0] || null, idempotencyKey,
            JSON.stringify(recipientsToSend), email.subject, email.html_content, email.text_content || stripHtml(email.html_content)]);

          const remainingRecipients = recipients.slice(recipientsToSend.length);
          if (remainingRecipients.length) {
            await pool.query(`
              UPDATE scheduled_emails
              SET recipients_json = ?, status = 'queued', scheduled_at = UTC_TIMESTAMP(),
                  idempotency_key = NULL, error_message = NULL, updated_at = UTC_TIMESTAMP()
              WHERE id = ? AND status = 'sending'
            `, [JSON.stringify(remainingRecipients), email.id]);
          } else {
            await pool.query("DELETE FROM scheduled_emails WHERE id = ? AND status = 'sending'", [email.id]);
            await removeScheduledAttachments(attachments);
          }
          brevoRemaining = Math.max(0, brevoRemaining - recipientsToSend.length);
        } else {
          await sendFounderMail({
            to: recipients,
            subject: email.subject,
            text: email.text_content || stripHtml(email.html_content),
            html: email.html_content,
            attachments: attachments.map((file) => ({ filename: file.originalname, path: file.path })),
          });
          await pool.query("DELETE FROM scheduled_emails WHERE id = ? AND status = 'sending'", [email.id]);
          await removeScheduledAttachments(attachments);
        }
      } catch (error) {
        console.error(`ERROR ENVIANDO EMAIL ${email.id}:`, error);
        const statusCode = Number(error?.statusCode || error?.status || error?.response?.status);
        const retryableBrevoError = brevoJob && (isBrevoQuotaError(error) || !statusCode || statusCode >= 500);
        if (retryableBrevoError) {
          await pool.query(`
            UPDATE scheduled_emails
            SET status = 'queued', scheduled_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 MINUTE),
                idempotency_key = IF(?, NULL, idempotency_key), error_message = ?, updated_at = UTC_TIMESTAMP()
            WHERE id = ? AND status = 'sending'
          `, [isBrevoQuotaError(error) ? 1 : 0, String(error.message || "Error temporal de Brevo; se reintentará.").slice(0, 2000), email.id]);
          if (isBrevoQuotaError(error)) brevoRemaining = 0;
        } else {
          await pool.query(
            "UPDATE scheduled_emails SET status = 'failed', updated_at = UTC_TIMESTAMP(), error_message = ? WHERE id = ? AND status = 'sending'",
            [String(error.message || "No se pudo enviar el email.").slice(0, 2000), email.id]
          );
        }
      }
    }
  } catch (error) {
    console.error("ERROR PROCESANDO EMAILS PROGRAMADOS:", error);
  } finally {
    scheduledEmailWorkerRunning = false;
  }
};

router.enqueueAdminEmail = async ({ type, recipients = [], subject, html, text = "", attachments = [] }) => {
  const resolvedRecipients = await resolveRecipients({ type, recipients });
  await ensureScheduledEmailsTable();
  const [insert] = await pool.query(`
    INSERT INTO scheduled_emails
      (scheduled_at, recipient_type, recipients_json, subject, html_content,
       text_content, attachments_json, status)
    VALUES (UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?, 'queued')
  `, [type, JSON.stringify(resolvedRecipients), subject.trim(), html, text || stripHtml(html), JSON.stringify(attachments)]);
  await processScheduledEmails();
  const [[job]] = await pool.query("SELECT status, recipients_json, error_message FROM scheduled_emails WHERE id = ? LIMIT 1", [insert.insertId]);
  const [[sentSummary]] = await pool.query("SELECT COALESCE(SUM(JSON_LENGTH(recipients_json)), 0) AS sent FROM sent_email_archive WHERE source_job_id = ?", [insert.insertId]);
  return {
    queueId: insert.insertId,
    sent: Number(sentSummary.sent) || 0,
    pending: job ? parseJsonColumn(job.recipients_json, []).length : 0,
    queued: Boolean(job && ["queued", "scheduled", "sending"].includes(job.status)),
    failed: job?.status === "failed",
    error: job?.error_message || null,
    recipientCount: resolvedRecipients.length,
  };
};

router.get(
  "/scheduled",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      await ensureScheduledEmailsTable();
      const [rows] = await pool.query(`
        SELECT id, DATE_FORMAT(scheduled_at, '%Y-%m-%dT%H:%i:%sZ') AS scheduled_at_iso,
               recipient_type, recipients_json, subject,
               html_content, attachments_json, status
        FROM scheduled_emails
        WHERE status IN ('scheduled', 'queued', 'sending', 'failed')
        ORDER BY scheduled_at ASC
      `);
      return res.json({
        emails: rows.map((row) => ({
          id: row.id,
          scheduledAt: row.scheduled_at_iso,
          recipientType: row.recipient_type,
          recipients: parseJsonColumn(row.recipients_json, []),
          subject: row.subject,
          html: row.html_content,
          attachments: parseJsonColumn(row.attachments_json, []).map((file) => ({ filename: file.originalname })),
          status: row.status,
        })),
      });
    } catch (error) {
      console.error("ERROR OBTENIENDO EMAILS PROGRAMADOS:", error);
      return res.status(500).json({ error: "No se pudieron cargar los emails programados." });
    }
  }
);

router.post(
  "/schedule",
  verifyToken,
  checkRole(["admin", "owner"]),
  emailUpload.array("attachments"),
  async (req, res) => {
    const uploadedFiles = req.files || [];
    try {
      await ensureScheduledEmailsTable();
      const { type, subject, html, text, scheduledAt } = req.body || {};
      let recipients = req.body?.recipients;
      if (typeof recipients === "string") {
        try { recipients = JSON.parse(recipients); } catch { recipients = []; }
      }
      if (!Array.isArray(recipients)) recipients = [];
      if (!ALLOWED_RECIPIENT_TYPES.has(type)) {
        throw Object.assign(new Error("Tipo de destinatario no válido."), { statusCode: 400 });
      }
      if (!subject?.trim() || !html?.trim()) {
        throw Object.assign(new Error("Debes indicar un asunto y el contenido del email."), { statusCode: 400 });
      }
      const sendAt = new Date(scheduledAt);
      if (!scheduledAt || Number.isNaN(sendAt.getTime()) || sendAt.getTime() <= Date.now()) {
        throw Object.assign(new Error("La fecha y hora del envío deben ser futuras."), { statusCode: 400 });
      }
      const resolvedRecipients = await resolveRecipients({ type, recipients });
      const mysqlSendAt = sendAt.toISOString().slice(0, 19).replace("T", " ");
      const storedAttachments = uploadedFiles.map((file) => ({
        originalname: file.originalname,
        path: file.path,
      }));
      const [result] = await pool.query(`
        INSERT INTO scheduled_emails
          (scheduled_at, recipient_type, recipients_json, subject, html_content, text_content, attachments_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [mysqlSendAt, type, JSON.stringify(resolvedRecipients), subject.trim(), html, text || stripHtml(html), JSON.stringify(storedAttachments)]);

      return res.status(201).json({ success: true, id: result.insertId, scheduledAt: sendAt.toISOString() });
    } catch (error) {
      await removeScheduledAttachments(uploadedFiles.map((file) => ({ path: file.path })));
      console.error("ERROR PROGRAMANDO EMAIL:", error);
      return res.status(error.statusCode || 500).json({ error: error.message || "No se pudo programar el email." });
    }
  }
);

router.delete(
  "/scheduled/:id",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      await ensureScheduledEmailsTable();
      const [rows] = await pool.query(
        "SELECT attachments_json FROM scheduled_emails WHERE id = ? AND status IN ('scheduled', 'queued', 'failed') LIMIT 1",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "El email ya no está pendiente de envío." });

      const [result] = await pool.query(
        "UPDATE scheduled_emails SET status = 'cancelled' WHERE id = ? AND status IN ('scheduled', 'queued', 'failed')",
        [req.params.id]
      );
      if (!result.affectedRows) return res.status(409).json({ error: "El email ya se está enviando y no se puede cancelar." });
      await removeScheduledAttachments(parseJsonColumn(rows[0].attachments_json, []));
      return res.json({ success: true });
    } catch (error) {
      console.error("ERROR CANCELANDO EMAIL PROGRAMADO:", error);
      return res.status(500).json({ error: "No se pudo cancelar el email programado." });
    }
  }
);

/*

====================================

FOUNDERMAIL — RECIBIDOS

====================================

*/

router.get(

  "/inbox",

  verifyToken,

  checkRole(["admin", "owner"]),

  async (req, res) => {

    try {

      const skip = Math.max(

        parseInt(req.query.skip, 10) || 0,

        0

      );

      const take = Math.min(

        Math.max(

          parseInt(req.query.take, 10) || 10,

          1

        ),

        25

      );

      const data = await getCachedFounderInbox(`${skip}:${take}`, () =>
        getFounderMailInboxMessages({ skip, take })
      );

      return res.json(data);

    } catch (error) {

      console.error(

        "ERROR OBTENIENDO CORREOS DE FOUNDERMAIL:",

        error

      );

      return res.status(500).json({

        error: "No se pudieron obtener los correos.",

      });

    }

  }

);

router.post(
  "/inbox/:uid/read",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    const uid = Number(req.params.uid);

    if (!Number.isSafeInteger(uid) || uid < 1) {
      return res.status(400).json({ error: "UID de correo no válido." });
    }

    try {
      await markFounderMailInboxMessageRead(uid);
      return res.json({ success: true, unread: false });
    } catch (error) {
      console.error("ERROR MARCANDO CORREO COMO LEÍDO EN FOUNDERMAIL:", error);
      return res.status(502).json({
        error: error.message || "No se pudo marcar el correo como leído.",
      });
    }
  }
);

router.delete(
  "/messages",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const { folder, ids } = req.body || {};
      if (!Array.isArray(ids) || !ids.length || ids.length > 500) {
        return res.status(400).json({ error: "Selecciona entre 1 y 500 emails." });
      }
      let deleted = 0;
      let deletedIds = [];
      if (folder === "received") {
        deleted = await deleteFounderMailMessages("INBOX", ids);
        deletedIds = ids.filter((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0).map(String);
      } else if (folder === "sent") {
        const founderUids = ids.filter((id) => String(id).startsWith("founder-sent-")).map((id) => String(id).slice("founder-sent-".length));
        if (founderUids.length) {
          deleted += await deleteFounderMailMessages("Sent", founderUids);
          deletedIds.push(...ids.filter((id) => String(id).startsWith("founder-sent-")).map(String));
        }
        const archiveIds = ids.filter((id) => String(id).startsWith("brevo-archive-")).map((id) => Number(String(id).slice("brevo-archive-".length))).filter(Number.isSafeInteger);
        if (archiveIds.length) {
          const [result] = await pool.query("DELETE FROM sent_email_archive WHERE id IN (?)", [archiveIds]);
          deleted += result.affectedRows;
          if (result.affectedRows) {
            const [remaining] = await pool.query("SELECT id FROM sent_email_archive WHERE id IN (?)", [archiveIds]);
            const existing = new Set(remaining.map((row) => Number(row.id)));
            deletedIds.push(...ids.filter((id) => String(id).startsWith("brevo-archive-") && !existing.has(Number(String(id).slice("brevo-archive-".length)))).map(String));
          }
        }
        getCachedFounderSent.clear("latest-50");
      } else if (folder === "drafts") {
        for (const id of ids) {
          await deleteFounderMailDraft(String(id));
          deleted += 1;
          deletedIds.push(String(id));
        }
      } else if (folder === "scheduled") {
        await ensureScheduledEmailsTable();
        const scheduledIds = ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
        if (!scheduledIds.length) return res.status(400).json({ error: "Los emails programados seleccionados no son válidos." });
        const [rows] = await pool.query(
          "SELECT id, attachments_json FROM scheduled_emails WHERE id IN (?) AND status IN ('scheduled', 'queued', 'failed')",
          [scheduledIds]
        );
        if (rows.length) {
          const [result] = await pool.query(
            "UPDATE scheduled_emails SET status = 'cancelled', updated_at = UTC_TIMESTAMP() WHERE id IN (?) AND status IN ('scheduled', 'queued', 'failed')",
            [rows.map((row) => row.id)]
          );
          const [cancelled] = await pool.query("SELECT id FROM scheduled_emails WHERE id IN (?) AND status = 'cancelled'", [rows.map((row) => row.id)]);
          const cancelledIds = new Set(cancelled.map((row) => Number(row.id)));
          for (const row of rows) {
            if (cancelledIds.has(Number(row.id))) await removeScheduledAttachments(parseJsonColumn(row.attachments_json, []));
          }
          deleted = result.affectedRows;
          deletedIds = rows.filter((row) => cancelledIds.has(Number(row.id))).map((row) => String(row.id));
        }
      } else {
        return res.status(400).json({ error: "Carpeta de email no válida." });
      }
      return res.json({ success: true, deleted, deletedIds });
    } catch (error) {
      console.error("ERROR ELIMINANDO EMAILS:", error);
      return res.status(502).json({ error: error.message || "No se pudieron eliminar los emails seleccionados." });
    }
  }
);

router.get(
  "/drafts",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const data = await getFounderMailDrafts();

      return res.json(data);
    } catch (error) {
      console.error(
        "ERROR OBTENIENDO BORRADORES DE FOUNDERMAIL:",
        error
      );

      return res.status(500).json({
        error: "No se pudieron obtener los borradores.",
      });
    }
  }
);

router.post(
  "/drafts",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const {
        id = null,
        to = [],
        subject = "",
        text = "",
        html = "",
      } = req.body || {};

      const recipients = Array.isArray(to)
        ? to
        : [to];

      const data = await saveFounderMailDraft({
        id,
        to: recipients,
        subject,
        text,
        html,
      });

      return res.json(data);
    } catch (error) {
      console.error(
        "ERROR GUARDANDO BORRADOR DE FOUNDERMAIL:",
        error
      );

      return res.status(502).json({
        error:
          error.message ||
          "No se pudo guardar el borrador.",
      });
    }
  }
);

router.delete(
  "/drafts/:id",
  verifyToken,
  checkRole(["admin", "owner"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: "Falta el ID del borrador.",
        });
      }

      const data = await deleteFounderMailDraft(id);

      return res.status(204).send();
    } catch (error) {
      console.error(
        "ERROR ELIMINANDO BORRADOR DE FOUNDERMAIL:",
        error
      );

      return res.status(502).json({
        error:
          error.message ||
          "No se pudo eliminar el borrador.",
      });
    }
  }
);

router.post(
  "/send-founder",
  verifyToken,
  checkRole(["admin", "owner"]),
  founderMailUpload.array("attachments"),
  async (req, res) => {
    try {
      const {
        to,
        subject,
        text = "",
        html = "",
        inReplyToMessageId = null,
      } = req.body || {};

      const attachments = (req.files || []).map(
        (file) => ({
          filename: file.originalname,
          path: file.path,
        })
      );

      if (!to || !subject?.trim()) {
        return res.status(400).json({
          error: "El destinatario y el asunto son obligatorios.",
        });
      }

      const recipients = Array.isArray(to)
        ? to
        : [to];



      const data = await sendFounderMail({
        to: recipients,
        subject: subject.trim(),
        text,
        html,
        inReplyToMessageId,
        attachments,
      });

      return res.json({
        success: true,
        message: "Correo enviado correctamente.",
        result: data,
      });
    } catch (error) {
      console.error(
        "ERROR ENVIANDO EMAIL CON FOUNDERMAIL:",
        error
      );

      return res.status(502).json({
        error:
          error.message ||
          "No se pudo enviar el correo con FounderMail.",
      });
    }
  }
);

/*

====================================

ENVIAR EMAIL DESDE EL DASHBOARD

====================================

*/

router.post(

  "/send",

  verifyToken,

  checkRole(["admin", "owner"]),

  emailUpload.array("attachments"),

  async (req, res) => {

    let queueEntryId = null;
    let filesPersisted = false;

    try {

      const {

        type,

        recipientType,

        to,

        subject,

        html,

        text,

      } = req.body;

      let recipients = req.body.recipients;

      if (typeof recipients === "string") {

        try {

          recipients = JSON.parse(recipients);

        } catch (error) {

          recipients = [];

        }

      }

      if (!Array.isArray(recipients)) {

        recipients = [];

      }

      const resolvedType = type || recipientType;

      const incomingRecipients = Array.isArray(recipients)

        ? recipients

        : Array.isArray(to)

          ? to

          : to

            ? [to]

            : [];

      if (!ALLOWED_RECIPIENT_TYPES.has(resolvedType)) {
        throw Object.assign(new Error("Tipo de destinatario no válido."), { statusCode: 400 });

      }

      if (!subject || !subject.trim()) {
        throw Object.assign(new Error("Debes indicar un asunto."), { statusCode: 400 });

      }

      if (!html || !html.trim()) {
        throw Object.assign(new Error("Debes indicar el contenido del email."), { statusCode: 400 });

      }

      const resolvedRecipients = await resolveRecipients({

        type: resolvedType,

        recipients: incomingRecipients,

      });

      await ensureScheduledEmailsTable();
      const storedAttachments = (req.files || []).map((file) => ({
        originalname: file.originalname,
        path: file.path,
      }));
      const [insert] = await pool.query(`
        INSERT INTO scheduled_emails
          (scheduled_at, recipient_type, recipients_json, subject, html_content,
           text_content, attachments_json, status)
        VALUES (UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?, 'queued')
      `, [resolvedType, JSON.stringify(resolvedRecipients), subject.trim(), html,
        text || stripHtml(html), JSON.stringify(storedAttachments)]);
      queueEntryId = insert.insertId;
      filesPersisted = true;

      // Send the portion covered by today's remaining provider allowance now.
      // Any remaining recipients stay in MySQL for the next quota window.
      await processScheduledEmails();
      const [[job]] = await pool.query(
        "SELECT status, recipients_json, error_message FROM scheduled_emails WHERE id = ? LIMIT 1",
        [queueEntryId]
      );
      const [[sentSummary]] = await pool.query(`
        SELECT COALESCE(SUM(JSON_LENGTH(recipients_json)), 0) AS sent
        FROM sent_email_archive WHERE source_job_id = ?
      `, [queueEntryId]);
      const [sentRows] = await pool.query(`
        SELECT id, recipients_json, subject, html_content, text_content,
               DATE_FORMAT(sent_at, '%Y-%m-%dT%H:%i:%sZ') AS sent_at_utc
        FROM sent_email_archive WHERE source_job_id = ? ORDER BY sent_at ASC
      `, [queueEntryId]);
      const pending = job ? parseJsonColumn(job.recipients_json, []).length : 0;
      return res.status(pending > 0 ? 202 : 200).json({
        success: true,
        queued: pending > 0 && ["queued", "scheduled", "sending"].includes(job?.status),
        failed: job?.status === "failed",
        error: job?.error_message || undefined,
        queueId: queueEntryId,
        sent: Number(sentSummary.sent) || 0,
        pending,
        sentEmails: sentRows.map((row) => ({
          id: row.id,
          recipients: parseJsonColumn(row.recipients_json, []),
          subject: row.subject,
          html: row.html_content,
          text: row.text_content,
          date: row.sent_at_utc,
        })),
        message: pending > 0
          ? "El email se está enviando por tandas; los destinatarios restantes quedan guardados hasta que haya cuota."
          : "Email aceptado por el proveedor para todos los destinatarios.",
      });

    } catch (error) {

      if (!filesPersisted) {
        await removeScheduledAttachments((req.files || []).map((file) => ({ path: file.path })));
      }

      console.error(

        "ERROR ENVIANDO EMAIL DESDE DASHBOARD:",

        error

      );

      return res.status(error.statusCode || 500).json({

        error: error.message || "No se pudo enviar el email.",

      });

    }

  }

);

/*

====================================

OBTENER USUARIOS PARA EL SELECTOR

====================================

*/

router.get(

  "/users",

  verifyToken,

  checkRole(["admin", "owner"]),

  async (req, res) => {

    try {

      const [users] = await pool.query(

        `

        SELECT

          id,

          nickname,

          email,

          province,

          country,

          status

        FROM users

        WHERE status = 'active'

          AND email IS NOT NULL

          AND TRIM(email) <> ''

        ORDER BY nickname ASC

        `

      );

      return res.json(users);

    } catch (error) {

      console.error(

        "ERROR OBTENIENDO USUARIOS:",

        error

      );

      return res.status(500).json({

        error: "No se pudieron obtener los usuarios.",

      });

    }

  }

);

const scheduledEmailWorkerTimer = setInterval(() => {
  processScheduledEmails();
}, 60_000);
scheduledEmailWorkerTimer.unref?.();
processScheduledEmails();

module.exports = router;
