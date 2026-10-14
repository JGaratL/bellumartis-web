import { useEffect, useState } from "react";
import EmailRecipientSelector from "./EmailRecipientSelector";
import RichTextEditor from "./RichTextEditor";
import "./EmailComposeModal.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailComposeModal({
    isOpen,
    onClose,
    onSend,
    onSchedule,
    onSaveDraft,
    isSubmitting = false,
    initialRecipients = {
        type: "custom",
        recipients: [],
    },
    initialSubject = "",
    initialContent = "",
}) {
    const [subject, setSubject] = useState(initialSubject);
    const [content, setContent] = useState(initialContent);

    const [sendMode, setSendMode] = useState("now");

    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");

    const [attachments, setAttachments] = useState([]);

    const [recipients, setRecipients] = useState(initialRecipients);
    const [pendingCustomEmail, setPendingCustomEmail] = useState("");

    useEffect(() => {

        if (!isOpen) {
            return;
        }

        setSubject(initialSubject);
        setContent(initialContent);
        setRecipients(initialRecipients);

        setScheduledDate("");
        setScheduledTime("");
        setAttachments([]);
        setPendingCustomEmail("");

    }, [
        isOpen,
        initialSubject,
        initialContent,
        initialRecipients,
    ]);

    /*
     * =====================================
     * LIMPIAR FORMULARIO
     * =====================================
     */

    const resetForm = () => {
        setSubject("");
        setContent("");
        setSendMode("now");
        setScheduledDate("");
        setScheduledTime("");
        setAttachments([]);
        setPendingCustomEmail("");
        setRecipients({
            type: "users",
            recipients: [],
        });
    };

    /*
     * =====================================
     * CERRAR MODAL
     * =====================================
     */

    const handleClose = () => {
        resetForm();

        if (onClose) {
            onClose();
        }
    };

    /*
     * =====================================
     * ARCHIVOS
     * =====================================
     */

    const handleAttachmentChange = (event) => {
        const files = Array.from(event.target.files || []);

        setAttachments((previous) => [
            ...previous,
            ...files,
        ]);

        // Permite volver a seleccionar el mismo archivo
        event.target.value = "";
    };

    const removeAttachment = (index) => {
        setAttachments((previous) =>
            previous.filter(
                (_, fileIndex) => fileIndex !== index
            )
        );
    };

    /*
     * =====================================
     * ENVIAR / PROGRAMAR
     * =====================================
     */

    const handleSend = () => {

        if (isSubmitting) {
            return;
        }

        // ================================
        // VALIDAR DESTINATARIOS
        // ================================

        const pendingEmail = pendingCustomEmail.trim();
        const finalRecipients = {
            ...recipients,
            recipients: Array.isArray(recipients.recipients)
                ? [...recipients.recipients]
                : [],
        };

        if (
            finalRecipients.type === "custom" &&
            pendingEmail &&
            !finalRecipients.recipients.some(
                (recipient) =>
                    String(recipient || "").toLowerCase() ===
                    pendingEmail.toLowerCase()
            )
        ) {
            finalRecipients.recipients.push(pendingEmail);
        }

        const hasRecipients =
            finalRecipients.type === "all_users" ||
            finalRecipients.type === "spain_users" ||
            finalRecipients.type === "newsletter" ||
            finalRecipients.recipients.length > 0;

        if (!hasRecipients) {
            alert("Selecciona al menos un destinatario.");
            return;
        }

        if (
            finalRecipients.type === "custom" &&
            finalRecipients.recipients.some(
                (recipient) =>
                    !EMAIL_REGEX.test(
                        String(recipient || "").trim()
                    )
            )
        ) {
            alert("Revisa las direcciones de email.");
            return;
        }


        // ================================
        // VALIDAR ASUNTO
        // ================================

        if (!subject.trim()) {
            alert("Escribe un asunto para el email.");
            return;
        }


        // ================================
        // VALIDAR CONTENIDO
        // ================================

        if (!content.trim()) {
            alert("Escribe el contenido del email.");
            return;
        }


        // ================================
        // DATOS DEL EMAIL
        // ================================

        const emailData = {
            recipients: finalRecipients,
            subject: subject.trim(),
            content,
            attachments,
        };


        // ================================
        // ENVIAR AHORA
        // ================================

        if (sendMode === "now") {

            if (onSend) {
                onSend(emailData);
            }

            return;
        }


        // ================================
        // VALIDAR PROGRAMACIÓN
        // ================================

        if (!scheduledDate) {
            alert("Selecciona una fecha para programar el email.");
            return;
        }

        if (!scheduledTime) {
            alert("Selecciona una hora para programar el email.");
            return;
        }

        const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
        if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
            alert("La fecha y hora del envío deben ser futuras.");
            return;
        }


        // ================================
        // EMAIL PROGRAMADO
        // ================================

        const scheduledData = {
            ...emailData,
            scheduledDate,
            scheduledTime,
        };


        if (onSchedule) {
            onSchedule(scheduledData);
        }

    };

    /*
     * =====================================
     * GUARDAR BORRADOR
     * =====================================
     */

    const handleSaveDraft = () => {
        if (onSaveDraft) {
            onSaveDraft({
                recipients,
                subject,
                content,
                attachments,
                sendMode,
                scheduledDate,
                scheduledTime,
            });
        }

        handleClose();
    };

    /*
     * =====================================
     * MODAL
     * =====================================
     */

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="admin-email-compose-overlay"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget
                ) {
                    handleClose();
                }
            }}
        >

            <div
                className="admin-email-compose-modal"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >

                {/* =======================
            CABECERA
        ======================== */}

                <div className="admin-email-compose-header">

                    <div>

                        <h2>
                            Nuevo email
                        </h2>

                        <p>
                            Crear y enviar un correo
                        </p>

                    </div>


                    <button
                        type="button"
                        className="admin-email-compose-close"
                        onClick={handleClose}
                        aria-label="Cerrar"
                    >
                        ×
                    </button>

                </div>


                {/* =======================
            CUERPO
        ======================== */}

                <div className="admin-email-compose-body">

                    {/* =======================
              DESTINATARIOS
          ======================== */}

                    <div className="admin-email-compose-field">

                        <label>
                            Para
                        </label>

                        <EmailRecipientSelector
                            value={recipients}
                            onChange={setRecipients}
                            onPendingCustomEmailChange={
                                setPendingCustomEmail
                            }
                        />

                    </div>


                    {/* =======================
              ASUNTO
          ======================== */}

                    <div className="admin-email-compose-field">

                        <label>
                            Asunto
                        </label>

                        <input
                            type="text"
                            value={subject}
                            onChange={(event) =>
                                setSubject(event.target.value)
                            }
                            placeholder="Escribe el asunto del email..."
                        />

                    </div>


                    {/* =======================
              EDITOR
          ======================== */}

                    <div className="admin-email-compose-field">

                        <label>
                            Contenido
                        </label>

                        <RichTextEditor
                            value={content}
                            onChange={setContent}
                        />

                    </div>


                    {/* =======================
              ADJUNTOS
          ======================== */}

                    <div className="admin-email-compose-field">

                        <label>
                            Adjuntos
                        </label>

                        <label className="admin-email-attachment-button">

                            📎 Añadir archivos

                            <input
                                type="file"
                                multiple
                                onChange={handleAttachmentChange}
                            />

                        </label>


                        {attachments.length > 0 && (

                            <div className="admin-email-attachments-list">

                                {attachments.map((file, index) => (

                                    <div
                                        className="admin-email-attachment-item"
                                        key={`${file.name}-${index}`}
                                    >

                                        <span>
                                            📄 {file.name}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeAttachment(index)
                                            }
                                        >
                                            ×
                                        </button>

                                    </div>

                                ))}

                            </div>

                        )}

                    </div>


                    {/* =======================
              TIPO DE ENVÍO
          ======================== */}

                    <div className="admin-email-send-options">

                        <label>

                            <input
                                type="radio"
                                name="sendMode"
                                value="now"
                                checked={sendMode === "now"}
                                onChange={() =>
                                    setSendMode("now")
                                }
                            />

                            Enviar ahora

                        </label>


                        <label>

                            <input
                                type="radio"
                                name="sendMode"
                                value="scheduled"
                                checked={sendMode === "scheduled"}
                                onChange={() =>
                                    setSendMode("scheduled")
                                }
                            />

                            Programar envío

                        </label>

                    </div>


                    {/* =======================
              PROGRAMACIÓN
          ======================== */}

                    {sendMode === "scheduled" && (

                        <div className="admin-email-schedule">

                            <div>

                                <label>
                                    Fecha
                                </label>

                                <input
                                    type="date"
                                    value={scheduledDate}
                                    onChange={(event) =>
                                        setScheduledDate(
                                            event.target.value
                                        )
                                    }
                                />

                            </div>


                            <div>

                                <label>
                                    Hora
                                </label>

                                <input
                                    type="time"
                                    value={scheduledTime}
                                    onChange={(event) =>
                                        setScheduledTime(
                                            event.target.value
                                        )
                                    }
                                />

                            </div>

                        </div>

                    )}

                </div>


                {/* =======================
            FOOTER
        ======================== */}

                <div className="admin-email-compose-footer">

                    <button
                        type="button"
                        className="admin-email-draft-button"
                        onClick={handleSaveDraft}
                    >
                        Guardar borrador
                    </button>


                    <div className="admin-email-compose-footer-right">

                        <button
                            type="button"
                            className="admin-email-cancel-button"
                            onClick={handleClose}
                        >
                            Cancelar
                        </button>


                        <button
                            type="button"
                            className="admin-primary-button"
                            onClick={handleSend}
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? "Enviando…"
                                : sendMode === "now"
                                ? "Enviar email"
                                : "Programar email"}
                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
}
