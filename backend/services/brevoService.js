const { BrevoClient } = require("@getbrevo/brevo");

const fs = require("fs");

const sharp = require("sharp");

const path = require("path");
const { recordEmailSend } = require("./emailSendLog");

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const MAIL_FROM =
  process.env.MAIL_FROM || "admin@bellumartis.com";

const MAIL_FROM_NAME =
  process.env.MAIL_FROM_NAME || "Bellumartis";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeRecipient = (recipient) => {
  if (typeof recipient === "string") {
    return {
      email: recipient.trim().toLowerCase(),
    };
  }

  if (recipient?.email) {
    return {
      email: String(recipient.email).trim().toLowerCase(),
      name: recipient.name || recipient.nickname || undefined,
    };
  }

  return null;
};

const normalizeRecipients = (to) => {
  const recipients = Array.isArray(to) ? to : [to];

  const seen = new Set();

  return recipients
    .map(normalizeRecipient)
    .filter((recipient) => {
      if (
        !recipient?.email ||
        !EMAIL_REGEX.test(recipient.email) ||
        seen.has(recipient.email)
      ) {
        return false;
      }

      seen.add(recipient.email);

      return true;
    });
};

const sendEmail = async ({
  to,
  subject,
  html,
  text,
  attachments = [],
  type = "administrative",
  idempotencyKey = null,
  logOperationId = null,
  deleteAttachmentsAfterSend = true,
}) => {
  const recipients = normalizeRecipients(to);

  if (recipients.length === 0) {
    throw new Error("No hay destinatarios validos.");
  }

  const brevoAttachments = [];

  for (const file of attachments) {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (extension === ".webp") {
      const sourceBuffer = fs.readFileSync(file.path);

      const convertedBuffer = await sharp(sourceBuffer)
        .png()
        .toBuffer();

      brevoAttachments.push({
        name: `${path.basename(
          file.originalname,
          extension
        )}.png`,
        content: convertedBuffer.toString("base64"),
      });

      continue;
    }

    brevoAttachments.push({
      name: file.originalname,
      content: fs.readFileSync(file.path).toString("base64"),
    });
  }

  const emailData = {
    sender: {
      name: MAIL_FROM_NAME,
      email: MAIL_FROM,
    },

    to: recipients,

    subject,

    htmlContent: html,

    textContent: text || "",
  };

  if (brevoAttachments.length > 0) {
    emailData.attachment = brevoAttachments;
  }
  if (idempotencyKey) {
    emailData.headers = { "Idempotency-Key": idempotencyKey };
  }

  let result;
  try {
    result = await brevo.transactionalEmails.sendTransacEmail(emailData);
  } catch (error) {
    await recordEmailSend({ provider: "brevo", outcome: "failed", type });
    throw error;
  }
  await recordEmailSend({
    provider: "brevo",
    outcome: "accepted",
    operationId: logOperationId || result?.messageId || result?.messageIds?.join(","),
    type,
    recipientCount: recipients.length,
  });

  // =====================================
  // ELIMINAR ARCHIVOS TEMPORALES
  // =====================================

  for (const file of deleteAttachmentsAfterSend ? attachments : []) {
    try {
      if (!fs.existsSync(file.path)) {
        continue;
      }

      let deleted = false;

      for (let attempt = 1; attempt <= 10; attempt++) {
        try {
          await fs.promises.unlink(file.path);

          console.log(
            "ADJUNTO BORRADO:",
            file.path
          );

          deleted = true;
          break;
        } catch (error) {
          if (
            error.code !== "EBUSY" &&
            error.code !== "EPERM"
          ) {
            throw error;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, 500)
          );
        }
      }

      if (!deleted) {
        console.error(
          "No se pudo eliminar el adjunto temporal después de varios intentos:",
          file.path
        );
      }
    } catch (error) {
      console.error(
        "No se pudo eliminar el adjunto temporal:",
        file.path,
        error
      );
    }
  }

  return result;
};

const getBrevoTransactionalUsage = async (date) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY no está configurada.");
  }

  const query = new URLSearchParams({ startDate: date, endDate: date });
  const response = await fetch(
    `https://api.brevo.com/v3/smtp/statistics/aggregatedReport?${query}`,
    { headers: { "api-key": process.env.BREVO_API_KEY, accept: "application/json" } }
  );
  if (!response.ok) {
    throw new Error(`Brevo respondió con HTTP ${response.status}.`);
  }
  const report = await response.json();
  return Number(report.requests || 0);
};

module.exports = {
  sendEmail,
  getBrevoTransactionalUsage,
  normalizeRecipients,
};
