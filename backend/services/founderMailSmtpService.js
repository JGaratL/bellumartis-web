const nodemailer = require("nodemailer");
const { appendFounderMailSentMessage } = require("./founderMailImapService");
const { recordEmailSend } = require("./emailSendLog");

const createFounderMailTransporter = () => {
    if (!process.env.FOUNDERMAIL_PASSWORD) {
        throw new Error(
            "FOUNDERMAIL_PASSWORD no está configurada."
        );
    }

    return nodemailer.createTransport({
        host: "smtp.foundermail.mx",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: "admin@bellumartis.com",
            pass: process.env.FOUNDERMAIL_PASSWORD,
        },
    });
};

const verifyFounderMailSmtp = async () => {
    const transporter =
        createFounderMailTransporter();

    await transporter.verify();

    return true;
};

const sendFounderMailSmtp = async ({
    to,
    subject,
    text = "",
    html = "",
    inReplyToMessageId = null,
    attachments = [],
}) => {
    const transporter =
        createFounderMailTransporter();

    const messageId = `<${Date.now()}.${Math.random().toString(16).slice(2)}@bellumartis.com>`;
    const mail = {
        from: "admin@bellumartis.com",
        to,
        subject,
        text,
        html,
        attachments,
        messageId,
        ...(inReplyToMessageId
            ? {
                inReplyTo: inReplyToMessageId,
                references: inReplyToMessageId,
            }
            : {}),
    };

    // Create the MIME source with the same headers and attachments so the
    // successfully sent SMTP message can also be stored in FounderMail Sent.
    const mimeTransporter = nodemailer.createTransport({
        streamTransport: true,
        buffer: true,
        newline: "unix",
    });
    const mimeMessage = await mimeTransporter.sendMail(mail);
    let result;
    try {
        result = await transporter.sendMail(mail);
    } catch (error) {
        await recordEmailSend({ provider: "foundermail", outcome: "failed", operationId: messageId });
        throw error;
    }
    await recordEmailSend({ provider: "foundermail", outcome: "accepted", operationId: result.messageId || messageId });

    try {
        await appendFounderMailSentMessage(mimeMessage.message);
        result.savedToSent = true;
    } catch (error) {
        console.error("No se pudo guardar el correo SMTP en FounderMail Sent:", error);
        result.savedToSent = false;
    }

    return result;
};

module.exports = {
    sendFounderMailSmtp,
    verifyFounderMailSmtp,
};
