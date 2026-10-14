const FOUNDERMAIL_API_URL = "https://api.foundermail.mx";

const {
    sendFounderMailSmtp,
} = require("./founderMailSmtpService");
const { recordEmailSend } = require("./emailSendLog");

const getFounderMailHeaders = () => {
    if (!process.env.FOUNDERMAIL_API_KEY) {
        throw new Error("FOUNDERMAIL_API_KEY no está configurada.");
    }

    return {
        "X-Api-Key": process.env.FOUNDERMAIL_API_KEY,
        Accept: "application/json",
    };
};

const getInboxMessages = async ({
    skip = 0,
    take = 10,
} = {}) => {
    const response = await fetch(
        `${FOUNDERMAIL_API_URL}/messages/admin?skip=${skip}&take=${take}`,
        {
            method: "GET",
            headers: getFounderMailHeaders(),
        }
    );

    const responseText = await response.text();

    let data = {};

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            data = {
                raw: responseText,
            };
        }
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            `FounderMail respondió con HTTP ${response.status}`
        );
    }

    return data;
};

const sendFounderMail = async ({
    to,
    subject,
    text,
    html,
    inReplyToMessageId = null,
    attachments = [],
}) => {
    if (attachments.length > 0) {
        return sendFounderMailSmtp({
            to,
            subject,
            text,
            html,
            inReplyToMessageId,
            attachments,
        });
    }

    let response;
    try {
        response = await fetch(
            `${FOUNDERMAIL_API_URL}/messages/admin/send`,
            {
                method: "POST",
                headers: {
                    ...getFounderMailHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    to,
                    subject,
                    text,
                    html: html || null,
                    cc: [],
                    bcc: [],
                    ...(inReplyToMessageId ? { inReplyToMessageId } : {}),
                }),
            }
        );
    } catch (error) {
        await recordEmailSend({ provider: "foundermail", outcome: "failed" });
        throw error;
    }

    const responseText = await response.text();

    let data = {};

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            data = {
                raw: responseText,
            };
        }
    }

    if (!response.ok) {
        console.error(
            "RESPUESTA FOUNDERMAIL:",
            {
                status: response.status,
                data,
                responseText,
            }
        );

        throw new Error(
            data?.message ||
            data?.detail ||
            data?.error ||
            data?.raw ||
            `FounderMail respondió con HTTP ${response.status}`
        );
    }

    await recordEmailSend({
        provider: "foundermail",
        outcome: "accepted",
        operationId: data?.messageId || data?.id || data?.operationId || null,
    });
    return data;
};

const getFounderMailDrafts = async () => {
    const response = await fetch(
        `${FOUNDERMAIL_API_URL}/messages/admin/drafts`,
        {
            method: "GET",
            headers: getFounderMailHeaders(),
        }
    );

    const responseText = await response.text();

    let data = {};

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            data = {
                raw: responseText,
            };
        }
    }

    if (!response.ok) {
        await recordEmailSend({ provider: "foundermail", outcome: "failed" });
        console.error(
            "RESPUESTA OBTENIENDO BORRADORES FOUNDERMAIL:",
            {
                status: response.status,
                data,
                responseText,
            }
        );

        throw new Error(
            data?.message ||
            data?.detail ||
            data?.error ||
            data?.raw ||
            `FounderMail respondió con HTTP ${response.status}`
        );
    }

    return data;
};


const saveFounderMailDraft = async ({
    id = null,
    to = [],
    subject = "",
    text = "",
    html = null,
}) => {
    const response = await fetch(
        `${FOUNDERMAIL_API_URL}/messages/admin/draft`,
        {
            method: "POST",
            headers: {
                ...getFounderMailHeaders(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                to,
                subject,
                text,
                html,
                id,
            }),
        }
    );

    const responseText = await response.text();

    let data = {};

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            data = {
                raw: responseText,
            };
        }
    }

    if (!response.ok) {
        console.error(
            "RESPUESTA GUARDANDO BORRADOR FOUNDERMAIL:",
            {
                status: response.status,
                data,
                responseText,
            }
        );

        throw new Error(
            data?.message ||
            data?.detail ||
            data?.error ||
            data?.raw ||
            `FounderMail respondió con HTTP ${response.status}`
        );
    }

    return data;
};


const deleteFounderMailDraft = async (id) => {
    const response = await fetch(
        `${FOUNDERMAIL_API_URL}/messages/admin/drafts/${encodeURIComponent(id)}`,
        {
            method: "DELETE",
            headers: getFounderMailHeaders(),
        }
    );

    const responseText = await response.text();

    let data = {};

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            data = {
                raw: responseText,
            };
        }
    }

    if (!response.ok) {
        console.error(
            "RESPUESTA ELIMINANDO BORRADOR FOUNDERMAIL:",
            {
                status: response.status,
                data,
                responseText,
            }
        );

        throw new Error(
            data?.message ||
            data?.detail ||
            data?.error ||
            data?.raw ||
            `FounderMail respondió con HTTP ${response.status}`
        );
    }

    return data;
};

module.exports = {
    getInboxMessages,
    sendFounderMail,
    getFounderMailDrafts,
    saveFounderMailDraft,
    deleteFounderMailDraft,
};
