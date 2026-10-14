const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");

// FounderMail limits concurrent IMAP sessions for a mailbox. Serialize logins
// in this Node process, and hold the slot until logout completes.
let imapQueue = Promise.resolve();

const createFounderMailImapClient = () => {
    if (!process.env.FOUNDERMAIL_PASSWORD) {
        throw new Error(
            "FOUNDERMAIL_PASSWORD no está configurada."
        );
    }

    const client = new ImapFlow({
        host: "imap.foundermail.mx",
        port: 993,
        secure: true,
        auth: {
            user: "admin@bellumartis.com",
            pass: process.env.FOUNDERMAIL_PASSWORD,
        },
    });

    const originalConnect = client.connect.bind(client);
    const originalLogout = client.logout.bind(client);
    let releaseSlot = null;
    client.connect = async () => {
        const previous = imapQueue;
        let release;
        imapQueue = new Promise((resolve) => { release = resolve; });
        await previous;
        let released = false;
        releaseSlot = () => {
            if (!released) {
                released = true;
                release();
            }
        };
        try {
            return await originalConnect();
        } catch (error) {
            releaseSlot();
            throw error;
        }
    };
    client.logout = async () => {
        try {
            return await originalLogout();
        } finally {
            releaseSlot?.();
        }
    };
    return client;
};

const verifyFounderMailImap = async () => {
    const client =
        createFounderMailImapClient();

    try {
        await client.connect();

        const mailbox =
            await client.mailboxOpen("Sent");

        return {
            connected: true,
            mailbox: mailbox.path,
            messages: mailbox.exists,
        };
    } finally {
        await client.logout().catch(() => { });
    }
};

const getFounderMailSentMessages = async ({
    limit = 50,
} = {}) => {
    const client =
        createFounderMailImapClient();

    try {
        await client.connect();

        const mailbox =
            await client.mailboxOpen("Sent");

        if (!mailbox.exists) {
            return [];
        }

        const start = Math.max(
            1,
            mailbox.exists - limit + 1
        );

        const messages = [];

        for await (const message of client.fetch(
            `${start}:*`,
            {
                envelope: true,
                source: true,
                uid: true,
                flags: true,
            }
        )) {
            const envelope =
                message.envelope || {};

            let parsed = null;

            if (message.source) {
                parsed = await simpleParser(
                    message.source
                );
            }

            const attachments =
                (parsed?.attachments || []).map(
                    (attachment) => ({
                        filename:
                            attachment.filename ||
                            "archivo",

                        contentType:
                            attachment.contentType ||
                            "application/octet-stream",

                        size:
                            attachment.size || 0,

                        content:
                            attachment.content
                                ? attachment.content.toString("base64")
                                : null,
                    })
                );

            messages.push({
                uid: message.uid,
                unread: !message.flags?.has("\\Seen"),

                messageId:
                    envelope.messageId || null,

                date:
                    envelope.date || null,

                subject:
                    envelope.subject || "Sin asunto",

                from:
                    envelope.from || [],

                sender:
                    envelope.sender || [],

                replyTo:
                    envelope.replyTo || [],

                to:
                    envelope.to || [],

                cc:
                    envelope.cc || [],

                bcc:
                    envelope.bcc || [],

                text:
                    parsed?.text || "",

                html:
                    parsed?.html || "",

                attachments,
            });
        }

        return messages.reverse();
    } finally {
        await client.logout().catch(() => { });
    }
};

const countFounderMailSentMessagesForRanges = async (ranges) => {
    const client = createFounderMailImapClient();

    try {
        await client.connect();
        const mailbox = await client.mailboxOpen("Sent");
        const counts = ranges.map(() => 0);
        if (!mailbox.exists) return counts;

        const parsedRanges = ranges.map(({ from, to }) => ({
            from: new Date(`${from.replace(" ", "T")}Z`),
            to: new Date(`${to.replace(" ", "T")}Z`),
        }));
        // IMAP SINCE has day precision; search from two UTC days earlier, then
        // apply the exact Europe/Madrid interval to each message timestamp.
        const earliestFrom = Math.min(...parsedRanges.map((range) => range.from.getTime()));
        const searchFrom = new Date(earliestFrom - 2 * 86400000);
        const uids = await client.search({ since: searchFrom }, { uid: true });

        for (let offset = 0; offset < uids.length; offset += 500) {
            const uidBatch = uids.slice(offset, offset + 500);
            for await (const message of client.fetch(uidBatch.join(","), {
                uid: true,
                internalDate: true,
            }, { uid: true })) {
                const sentAt = message.internalDate ? new Date(message.internalDate) : null;
                if (!sentAt) continue;
                parsedRanges.forEach((range, index) => {
                    if (sentAt >= range.from && sentAt < range.to) counts[index] += 1;
                });
            }
        }

        return counts;
    } finally {
        await client.logout().catch(() => { });
    }
};

const countFounderMailSentMessages = async (range) => {
    const [count] = await countFounderMailSentMessagesForRanges([range]);
    return count;
};

const getFounderMailInboxMessages = async ({ skip = 0, take = 25 } = {}) => {
    const client = createFounderMailImapClient();

    try {
        await client.connect();
        const mailbox = await client.mailboxOpen("INBOX");

        if (!mailbox.exists || skip >= mailbox.exists) {
            return { total: mailbox.exists || 0, messages: [] };
        }

        const end = mailbox.exists - skip;
        const start = Math.max(1, end - take + 1);
        const messages = [];

        for await (const message of client.fetch(`${start}:${end}`, {
            envelope: true,
            flags: true,
            source: true,
            uid: true,
        })) {
            const parsed = message.source
                ? await simpleParser(message.source)
                : null;
            const addresses = (list) => (list || [])
                .flatMap((entry) => entry?.group || [entry])
                .map((entry) => entry?.address)
                .filter(Boolean);
            const from = addresses(parsed?.from?.value || message.envelope?.from);
            const to = addresses(parsed?.to?.value || message.envelope?.to);
            const date = parsed?.date || message.envelope?.date || null;

            messages.push({
                uniqueId: message.uid,
                unread: !message.flags?.has("\\Seen"),

                // Identificador RFC del correo, necesario para las cabeceras SMTP.
                messageId: parsed?.messageId || message.envelope?.messageId || null,

                // El ID interno numérico de FounderMail no está disponible en esta respuesta IMAP.
                id: null,
                received: date,
                from,
                to,
                subject: parsed?.subject || message.envelope?.subject || "Sin asunto",
                body: parsed?.html || parsed?.text || "",
                isHtml: Boolean(parsed?.html),
                attachments: (parsed?.attachments || []).map((attachment) => ({
                    filename: attachment.filename || "archivo",
                    contentType: attachment.contentType || "application/octet-stream",
                    size: attachment.size || 0,
                    content: attachment.content
                        ? attachment.content.toString("base64")
                        : null,
                })),
            });
        }

        return {
            total: mailbox.exists,
            messages: messages.reverse(),
        };
    } finally {
        await client.logout().catch(() => { });
    }
};

const markFounderMailInboxMessageRead = async (uid) => {
    const client = createFounderMailImapClient();

    try {
        await client.connect();
        await client.mailboxOpen("INBOX");
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
        return true;
    } finally {
        await client.logout().catch(() => { });
    }
};

const deleteFounderMailMessages = async (mailboxName, uids = []) => {
    const normalizedUids = [...new Set(uids.map((uid) => Number(uid)).filter((uid) => Number.isSafeInteger(uid) && uid > 0))];
    if (!normalizedUids.length) return 0;
    const client = createFounderMailImapClient();

    try {
        await client.connect();
        await client.mailboxOpen(mailboxName);
        await client.messageDelete(normalizedUids.join(","), { uid: true });
        return normalizedUids.length;
    } finally {
        await client.logout().catch(() => { });
    }
};

const appendFounderMailSentMessage = async (source) => {
    const client = createFounderMailImapClient();

    try {
        await client.connect();
        await client.append(source, "Sent", {
            flags: ["\\Seen"],
        });
    } finally {
        await client.logout().catch(() => { });
    }
};

module.exports = {
    verifyFounderMailImap,
    getFounderMailSentMessages,
    countFounderMailSentMessages,
    countFounderMailSentMessagesForRanges,
    getFounderMailInboxMessages,
    markFounderMailInboxMessageRead,
    deleteFounderMailMessages,
    appendFounderMailSentMessage,
};
