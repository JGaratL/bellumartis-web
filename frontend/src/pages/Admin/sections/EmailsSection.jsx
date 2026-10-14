import { useCallback, useEffect, useRef, useState } from "react";
import EmailComposeModal from "../components/emails/EmailComposeModal";
import "./EmailsSection.css";

const REPORT_REASONS = {
  informe_tecnico: "Informe técnico",
  error_plataforma: "Error de la plataforma",
  sugerencia: "Sugerencia",
  reporte_contenido: "Reporte de contenido",
  colaboracion: "Colaboración",
  otro: "Otro",
};
const getReportReasonLabel = (report) => {
  const storedSubject = String(report.subject || "").trim();
  if (storedSubject.toLocaleLowerCase("es").startsWith("solicitar evento")) return storedSubject;
  if (report.reason === "otro" && storedSubject) return `Otro: ${storedSubject}`;
  return REPORT_REASONS[report.reason] || report.reason;
};
const REPORT_PRIORITIES = { baja: "Baja", media: "Media", alta: "Alta", critica: "Crítica" };
const REPORT_STATUSES = { pending: "Pendiente", in_review: "En revisión", resolved: "Resuelto", archived: "Archivado" };

const htmlToPlainText = (html = "") => {
  const parsed = new DOMParser().parseFromString(String(html), "text/html");
  parsed.querySelectorAll("script, style, head, title, meta, link").forEach((node) => node.remove());

  const blockTags = new Set([
    "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DIV", "DL", "DT", "DD",
    "FIGCAPTION", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6",
    "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "TR", "UL",
  ]);
  const collectText = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    if (node.tagName === "BR") return "\n";

    const isBlock = blockTags.has(node.tagName);
    const prefix = isBlock ? "\n" : "";
    const bullet = node.tagName === "LI" ? "• " : "";
    const childrenText = Array.from(node.childNodes, collectText).join("");
    return `${prefix}${bullet}${childrenText}${isBlock ? "\n" : ""}`;
  };

  return collectText(parsed.body)
    .replace(/[\t\f\v ]+\n/g, "\n")
    .replace(/\n[\t\f\v ]+/g, "\n")
    .replace(/[\t\f\v ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export default function EmailsSection() {
  const [activeFolder, setActiveFolder] = useState("received");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedEmailIds, setSelectedEmailIds] = useState([]);
  const [pendingEmailDeletion, setPendingEmailDeletion] = useState(null);
  const [isDeletingEmails, setIsDeletingEmails] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const emailSubmissionInProgress = useRef(false);

  const [composeMode, setComposeMode] = useState("new");
  const [composeDraftId, setComposeDraftId] = useState(null);

  const [composeInitialRecipients, setComposeInitialRecipients] = useState({
    type: "custom",
    recipients: [],
  });

  const [composeInitialSubject, setComposeInitialSubject] = useState("");

  const [composeInitialContent, setComposeInitialContent] = useState("");

  const [sentEmails, setSentEmails] = useState([]);
  const [draftEmails, setDraftEmails] = useState([]);
  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [contactReports, setContactReports] = useState([]);
  const [pendingReportCount, setPendingReportCount] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [reportFilters, setReportFilters] = useState({ search: "", reason: "", priority: "", status: "", sort: "newest" });
  const [providerUsage, setProviderUsage] = useState(null);

  const [emails, setEmails] = useState([]);
  const [emailSearch, setEmailSearch] = useState("");
  const [emailSort, setEmailSort] = useState("newest");
  const [loadingFolders, setLoadingFolders] = useState({ received: true, sent: true, drafts: true, scheduled: false });
  const [inboxError, setInboxError] = useState("");
  const [newEmailNotice, setNewEmailNotice] = useState(0);
  const unreadEmailsCount = emails.filter((email) => email.unread).length;
  const folderEmails = activeFolder === "sent"
    ? sentEmails
    : activeFolder === "drafts"
      ? draftEmails
      : activeFolder === "scheduled"
        ? scheduledEmails
        : emails;
  const searchTerms = emailSearch
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const visibleEmails = [...folderEmails]
    .filter((email) => emailSort !== "unread" || email.unread)
    .filter((email) => {
      if (searchTerms.length === 0) return true;
      const bodyText = htmlToPlainText(email.body?.[0] || "");
      const searchableText = [
        email.sender,
        email.email,
        email.subject,
        ...(email.recipients?.recipients || []),
        bodyText,
      ]
        .join(" ")
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return searchTerms.every((term) => searchableText.includes(term));
    })
    .sort((first, second) => {
      const firstTime = first.timestamp || Date.parse(first.fullDate) || 0;
      const secondTime = second.timestamp || Date.parse(second.fullDate) || 0;
      return emailSort === "oldest" ? firstTime - secondTime : secondTime - firstTime;
    });

  useEffect(() => {
    setSelectedEmailIds([]);
  }, [activeFolder]);

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      try {
        const params = new URLSearchParams();
        Object.entries(reportFilters).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });
        const response = await fetch(`http://localhost:5000/api/communications/reports?${params}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "No se pudieron cargar los reportes.");
        if (isMounted) {
          setContactReports(data.reports || []);
          setPendingReportCount(Number(data.pendingCount || 0));
          setReportsError("");
          if (activeFolder === "reports") setReportsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setReportsError(error.message || "No se pudieron cargar los reportes.");
          if (activeFolder === "reports") setReportsLoading(false);
        }
      }
    };

    if (activeFolder === "reports") setReportsLoading(true);
    const debounce = setTimeout(loadReports, reportFilters.search ? 250 : 0);
    const refresh = activeFolder === "reports" ? setInterval(loadReports, 60_000) : null;
    return () => {
      isMounted = false;
      clearTimeout(debounce);
      if (refresh) clearInterval(refresh);
    };
  }, [activeFolder, reportFilters]);

  const updateContactReport = async (field, value) => {
    if (!selectedReport) return;
    try {
      const response = await fetch(`http://localhost:5000/api/communications/reports/${selectedReport.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No se pudo actualizar el reporte.");
      setSelectedReport(data.report);
      setContactReports((current) => current.map((report) => report.id === data.report.id ? data.report : report));
      if (field === "status") {
        if (selectedReport.status === "pending" && value !== "pending") setPendingReportCount((count) => Math.max(0, count - 1));
        if (selectedReport.status !== "pending" && value === "pending") setPendingReportCount((count) => count + 1);
      }
      setReportsError("");
    } catch (error) {
      setReportsError(error.message || "No se pudo actualizar el reporte.");
    }
  };

  const deleteContactReport = async (report) => {
    if (report.status !== "resolved") return;
    if (!window.confirm("¿Quieres eliminar definitivamente este reporte resuelto? Esta acción no se puede deshacer.")) return;

    try {
      const response = await fetch(`http://localhost:5000/api/communications/reports/${report.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No se pudo eliminar el reporte.");
      setContactReports((current) => current.filter((item) => item.id !== report.id));
      setSelectedReport(null);
      setReportsError("");
    } catch (error) {
      setReportsError(error.message || "No se pudo eliminar el reporte.");
    }
  };

  const refreshProviderUsage = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:5000/api/admin/emails/stats/usage", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("No se pudo consultar el uso de los proveedores.");
      setProviderUsage(await response.json());
    } catch (error) {
      console.error("ERROR CONSULTANDO USO DE EMAIL:", error);
      setProviderUsage({ brevo: { unavailable: true }, founderMail: { unavailable: true } });
    }
  }, []);

  useEffect(() => {
    refreshProviderUsage();
  }, [refreshProviderUsage]);

  useEffect(() => {
    if (activeFolder !== "sent") return undefined;
    setLoadingFolders((current) => ({ ...current, sent: true }));
    let isMounted = true;

    const loadSentEmails = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          "http://localhost:5000/api/admin/emails/sent",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "No se pudieron cargar los enviados."
          );
        }

        const founderMailSentEmails =
          (data.messages || []).map((email) => {
            const sentDate = new Date(email.date);

            const recipients =
              (email.to || [])
                .map(
                  (recipient) =>
                    recipient.address ||
                    recipient.name ||
                    ""
                )
                .filter(Boolean);

            return {
              id: `founder-sent-${email.uid}`,
              founderMailUid: email.uid,

              sender:
                email.from?.[0]?.name ||
                "Bellumartis",

              email:
                email.from?.[0]?.address ||
                "admin@bellumartis.com",

              subject:
                email.subject ||
                "Sin asunto",

              date: sentDate.toLocaleString("es-ES", {
                timeZone: "Europe/Madrid",
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }),

              fullDate:
                sentDate.toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),

              timestamp: sentDate.getTime(),

              unread: Boolean(email.unread),

              body: [
                email.html ||
                email.text ||
                "",
              ],

              recipients: {
                type: "custom",
                recipients,
              },

              attachments:
                email.attachments || [],

              isSent: true,
            };
          });
        const archivedBrevoEmails = (data.archiveMessages || []).map((email) => {
          const sentDate = new Date(email.date);
          return {
            id: `brevo-archive-${email.id}`,
            sender: "Bellumartis",
            email: "admin@bellumartis.com",
            subject: email.subject || "Sin asunto",
            date: sentDate.toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
            fullDate: sentDate.toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
            timestamp: sentDate.getTime(),
            unread: false,
            body: [email.html || email.text || ""],
            recipients: { type: "custom", recipients: email.recipients || [] },
            attachments: [],
            isSent: true,
          };
        });

        if (!isMounted) return;
        setSentEmails([...founderMailSentEmails, ...archivedBrevoEmails]
          .sort((first, second) => second.timestamp - first.timestamp));
      } catch (error) {
        if (!isMounted) return;
        console.error(
          "ERROR CARGANDO ENVIADOS:",
          error
        );
      } finally {
        if (isMounted) setLoadingFolders((current) => ({ ...current, sent: false }));
      }
    };

    loadSentEmails();
    const refresh = setInterval(loadSentEmails, 60_000);
    return () => {
      isMounted = false;
      clearInterval(refresh);
    };
  }, [activeFolder]);

  useEffect(() => {
    if (activeFolder !== "received") return undefined;

    let isMounted = true;
    let isLoading = false;
    let hasLoadedOnce = false;
    let previousInboxIds = new Set();

    const loadInbox = async () => {
      if (isLoading) return;
      isLoading = true;

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setInboxError("Tu sesión ha caducado. Inicia sesión de nuevo para cargar los correos.");
          return;
        }

        const response = await fetch(
          "http://localhost:5000/api/admin/emails/inbox?skip=0&take=25",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "No se pudieron cargar los correos."
          );
        }

        const founderMailEmails = (data.messages || []).map(
          (email) => {
            const receivedDate = new Date(email.received);

            return {
              id: email.uniqueId,

              founderMailMessageId: email.id,

              sender: email.from?.[0] || "Remitente desconocido",

              email: email.from?.[0] || "",

              subject: email.subject || "Sin asunto",

              date: receivedDate.toLocaleString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }),

              fullDate: receivedDate.toLocaleString("es-ES"),

              timestamp: receivedDate.getTime(),

              unread: Boolean(email.unread),

              body: email.isHtml
                ? [email.body || ""]
                : [email.body || ""],

              recipients: {
                type: "custom",
                recipients: email.to || [],
              },

              attachments: email.attachments || [],

              founderMailId: email.uniqueId,
            };
          }
        );

        if (!isMounted) return;

        const newCount = hasLoadedOnce
          ? founderMailEmails.filter(
            (email) => !previousInboxIds.has(String(email.id))
          ).length
          : 0;
        previousInboxIds = new Set(
          founderMailEmails.map((email) => String(email.id))
        );
        hasLoadedOnce = true;

        if (newCount > 0) {
          setNewEmailNotice((count) => count + newCount);
        }

        setEmails(founderMailEmails);
        setInboxError("");
      } catch (error) {
        if (!isMounted) return;
        console.error(
          "ERROR CARGANDO BANDEJA FOUNDERMAIL:",
          error
        );
        setInboxError(error.message || "No se pudieron cargar los correos de FounderMail.");
      } finally {
        isLoading = false;
        if (isMounted) setLoadingFolders((current) => ({ ...current, received: false }));
      }
    };

    loadInbox();
    const inboxPoll = setInterval(loadInbox, 60_000);

    return () => {
      isMounted = false;
      clearInterval(inboxPoll);
    };
  }, [activeFolder]);

  useEffect(() => {
    const loadDrafts = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          console.error("No hay token de autenticación.");
          return;
        }

        const response = await fetch(
          "http://localhost:5000/api/admin/emails/drafts",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "No se pudieron cargar los borradores."
          );
        }

        const founderMailDrafts = (data || []).map((draft) => {
          const updatedDate = new Date(draft.updatedAt);

          return {
            id: draft.id,
            sender: "Borrador",
            email: "",
            subject: draft.subject || "Sin asunto",
            date: updatedDate.toLocaleString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
            fullDate: updatedDate.toLocaleString("es-ES"),
            unread: false,
            body: draft.body
              ? [draft.body]
              : ["Sin contenido"],
            recipients: {
              type: "custom",
              recipients: draft.to || [],
            },
            attachments: [],
            isDraft: true,
            founderMailDraftId: draft.id,
          };
        });

        setDraftEmails(founderMailDrafts);
      } catch (error) {
        console.error(
          "ERROR CARGANDO BORRADORES FOUNDERMAIL:",
          error
        );
      } finally {
        setLoadingFolders((current) => ({ ...current, drafts: false }));
      }
    };

    loadDrafts();
  }, []);

  const loadScheduledEmails = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingFolders((current) => ({ ...current, scheduled: true }));
    try {
      const response = await fetch("http://localhost:5000/api/admin/emails/scheduled", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar los emails programados.");

      setScheduledEmails((data.emails || []).map((email) => {
        const scheduledAt = new Date(email.scheduledAt);
        return {
          id: email.id,
          sender: "Bellumartis",
          email: "admin@bellumartis.com",
          subject: email.subject || "Sin asunto",
          date: scheduledAt.toLocaleString("es-ES"),
          fullDate: scheduledAt.toLocaleString("es-ES"),
          unread: false,
          body: [email.html || "Sin contenido"],
          recipients: { type: email.recipientType, recipients: email.recipients || [] },
          attachments: email.attachments || [],
          scheduleStatus: email.status,
          scheduledAt: email.scheduledAt,
          scheduledDate: scheduledAt.toLocaleDateString("es-ES"),
          scheduledTime: scheduledAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
          isScheduled: true,
        };
      }));
    } catch (error) {
      console.error("ERROR CARGANDO EMAILS PROGRAMADOS:", error);
    } finally {
      setLoadingFolders((current) => ({ ...current, scheduled: false }));
    }
  }, []);

  useEffect(() => {
    if (activeFolder !== "scheduled") return undefined;
    loadScheduledEmails();
    const refresh = setInterval(loadScheduledEmails, 60_000);
    return () => clearInterval(refresh);
  }, [activeFolder, loadScheduledEmails]);

  const folders = [
    {
      id: "received",
      label: "Recibidos",
      icon: "📥",
    },
    {
      id: "sent",
      label: "Enviados",
      icon: "📤",
    },
    {
      id: "drafts",
      label: "Borradores",
      icon: "📝",
    },
    {
      id: "scheduled",
      label: "Programados",
      icon: "🕐",
    },
    {
      id: "reports",
      label: "Reportes",
      icon: "📋",
    },
  ];

  const handleFolderChange = (folder) => {
    setActiveFolder(folder);
    setSelectedEmail(null);
    setSelectedReport(null);
  };

  const handleDownloadAttachment = (attachment) => {
    if (!attachment?.content) {
      alert("No se puede descargar este archivo porque no tiene contenido.");
      return;
    }

    try {
      const byteCharacters = atob(
        attachment.content
      );

      const byteNumbers =
        new Array(byteCharacters.length);

      for (
        let i = 0;
        i < byteCharacters.length;
        i++
      ) {
        byteNumbers[i] =
          byteCharacters.charCodeAt(i);
      }

      const byteArray =
        new Uint8Array(byteNumbers);

      const blob = new Blob(
        [byteArray],
        {
          type:
            attachment.contentType ||
            "application/octet-stream",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        attachment.filename ||
        "archivo-adjunto";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
    } catch (error) {
      console.error(
        "ERROR DESCARGANDO ADJUNTO:",
        error
      );

      alert(
        "No se ha podido descargar el archivo."
      );
    }
  };

  const handlePreviewAttachment = (attachment) => {
    if (!attachment?.content) {
      alert(
        "No se puede mostrar la vista previa de este archivo."
      );
      return;
    }

    if (
      !attachment.contentType?.startsWith("image/")
    ) {
      return;
    }

    try {
      const byteCharacters = atob(
        attachment.content
      );

      const byteNumbers =
        new Array(byteCharacters.length);

      for (
        let i = 0;
        i < byteCharacters.length;
        i++
      ) {
        byteNumbers[i] =
          byteCharacters.charCodeAt(i);
      }

      const byteArray =
        new Uint8Array(byteNumbers);

      const blob = new Blob(
        [byteArray],
        {
          type:
            attachment.contentType,
        }
      );

      const url =
        URL.createObjectURL(blob);

      setPreviewAttachment({
        ...attachment,
        url,
      });
    } catch (error) {
      console.error(
        "ERROR GENERANDO VISTA PREVIA:",
        error
      );

      alert(
        "No se ha podido mostrar la vista previa."
      );
    }
  };

  const handleOpenAttachment = (attachment) => {
    if (!attachment?.content) {
      alert("No se puede abrir este archivo porque no tiene contenido.");
      return;
    }

    const byteCharacters = atob(attachment.content);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] =
        byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(
      byteNumbers
    );

    const blob = new Blob([byteArray], {
      type:
        attachment.contentType ||
        "application/octet-stream",
    });

    const url = URL.createObjectURL(blob);

    const isImage =
      attachment.contentType?.startsWith(
        "image/"
      );

    console.log("ADJUNTO:", attachment);

    if (isImage) {
      setPreviewAttachment({
        ...attachment,
        url,
      });

      return;
    }

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      attachment.filename ||
      "archivo-adjunto";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  };

  const handleEmailClick = async (email) => {

    // Si es un email recibido y está sin leer,
    // lo marcamos como leído al abrirlo.
    if (activeFolder === "received" && email.unread) {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
        }

        const response = await fetch(
          `http://localhost:5000/api/admin/emails/inbox/${email.id}/read`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "No se pudo marcar como leído en FounderMail.");
        }

        const readEmail = { ...email, unread: false };

        setEmails((prev) =>
          prev.map((item) => item.id === email.id ? readEmail : item)
        );
        setSelectedEmail(readEmail);
      } catch (error) {
        console.error("ERROR MARCANDO CORREO COMO LEÍDO:", error);
        alert(error.message || "No se pudo marcar el correo como leído.");
        setSelectedEmail(email);
      }

      return;
    }

    // Si es un borrador, lo abrimos directamente
    // en el editor para continuar editándolo.
    if (activeFolder === "drafts") {
      setComposeMode("draft");
      setComposeDraftId(email.id);

      setComposeInitialRecipients({
        type: "custom",
        recipients: email.recipients?.recipients || [],
      });

      setComposeInitialSubject(email.subject || "");

      setComposeInitialContent(
        email.body?.[0] || ""
      );

      setIsComposeOpen(true);

      return;
    }

    setSelectedEmail(email);
  };

  const handleToggleRead = () => {

    if (!selectedEmail || activeFolder !== "received") {
      return;
    }

    const newUnreadState = !selectedEmail.unread;

    setEmails((prev) =>
      prev.map((email) =>
        email.id === selectedEmail.id
          ? {
            ...email,
            unread: newUnreadState,
          }
          : email
      )
    );

    setSelectedEmail((prev) => ({
      ...prev,
      unread: newUnreadState,
    }));
  };


  const handleBackToList = () => {
    setSelectedEmail(null);
  };

  const handleDeleteEmail = () => {
    if (!selectedEmail) return;
    setPendingEmailDeletion({ folder: activeFolder, ids: [selectedEmail.id] });
  };

  const handleBulkDeleteEmails = () => {
    if (!selectedEmailIds.length) return;
    setPendingEmailDeletion({ folder: activeFolder, ids: selectedEmailIds });
  };

  const confirmDeleteEmails = async () => {
    if (!pendingEmailDeletion || isDeletingEmails) return;
    setIsDeletingEmails(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
      const response = await fetch("http://localhost:5000/api/admin/emails/messages", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(pendingEmailDeletion),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudieron eliminar los emails.");

      const deletedIds = new Set((data.deletedIds || []).map(String));
      const setters = {
        received: setEmails,
        sent: setSentEmails,
        drafts: setDraftEmails,
        scheduled: setScheduledEmails,
      };
      setters[pendingEmailDeletion.folder]?.((current) => current.filter((email) => !deletedIds.has(String(email.id))));
      if (selectedEmail && deletedIds.has(String(selectedEmail.id))) setSelectedEmail(null);
      setSelectedEmailIds([]);
      setPendingEmailDeletion(null);
      if (Number(data.deleted) < deletedIds.size) {
        alert(`Se eliminaron ${data.deleted} de ${deletedIds.size} emails. Los que estaban enviándose o ya no estaban disponibles se conservaron.`);
      }
    } catch (error) {
      alert(error.message || "No se pudieron eliminar los emails.");
    } finally {
      setIsDeletingEmails(false);
    }
  };

  const toggleEmailSelection = (emailId) => {
    const id = String(emailId);
    setSelectedEmailIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  };

  const toggleVisibleEmailSelection = () => {
    const visibleIds = visibleEmails.map((email) => String(email.id));
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedEmailIds.includes(id));
    setSelectedEmailIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };

  const handleReply = () => {

    if (!selectedEmail) {
      return;
    }

    setComposeMode("reply");

    setComposeInitialRecipients({
      type: "custom",
      recipients: [selectedEmail.email],
    });

    setComposeInitialSubject(
      selectedEmail.subject?.startsWith("Re:")
        ? selectedEmail.subject
        : `Re: ${selectedEmail.subject}`
    );

    setComposeInitialContent("");

    setIsComposeOpen(true);
  };


  const handleForward = () => {

    if (!selectedEmail) {
      return;
    }

    setComposeMode("forward");

    setComposeInitialRecipients({
      type: "custom",
      recipients: [],
    });

    setComposeInitialSubject(
      selectedEmail.subject?.startsWith("Fwd:")
        ? selectedEmail.subject
        : `Fwd: ${selectedEmail.subject}`
    );

    setComposeInitialContent(
      selectedEmail.body?.join("<br>") || ""
    );

    setIsComposeOpen(true);
  };

  const handleReplyToReport = (report) => {
    setComposeMode("new");
    setComposeDraftId(null);
    setComposeInitialRecipients({
      type: "custom",
      recipients: [report.email],
    });
    setComposeInitialSubject(`Re: ${getReportReasonLabel(report)}`);
    setComposeInitialContent("");
    setIsComposeOpen(true);
  };

  const getRecipientLabel = (recipients) => {

    if (!recipients) {
      return "Sin destinatarios";
    }

    switch (recipients.type) {

      case "all_users":
        return "Todos los usuarios";

      case "spain_users":
        return "Todos los usuarios de España";

      case "newsletter":
        return "Suscriptores newsletter";

      case "province":
        return recipients.recipients?.length
          ? `Usuarios de ${recipients.recipients.join(", ")}`
          : "Usuarios de una provincia";

      case "custom":
        return recipients.recipients?.length
          ? recipients.recipients.join(", ")
          : "Direcciones concretas";

      case "users":
        return recipients.recipients?.length
          ? recipients.recipients.join(", ")
          : "Usuarios registrados";

      default:
        return "Sin destinatarios";
    }
  };


  const handleSendEmail = async (emailData) => {
    if (emailSubmissionInProgress.current) return;
    emailSubmissionInProgress.current = true;
    setIsEmailSubmitting(true);

    try {
      console.log("EMAIL DATA:", emailData);

      const token = localStorage.getItem("token");

      if (!token) {
        alert("Tu sesión ha caducado. Vuelve a iniciar sesión.");
        return;
      }

      // =================================
      // BORRADOR CON FOUNDERMAIL
      // =================================

      if (composeMode === "draft") {

        const founderMailResponse = await fetch(
          "http://localhost:5000/api/admin/emails/send-founder",
          {
            method: "POST",

            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              to: emailData.recipients?.recipients || [],
              subject: emailData.subject,
              text: htmlToPlainText(emailData.content),
              html: emailData.content,
            }),
          }
        );

        const founderMailData =
          await founderMailResponse.json();

        if (!founderMailResponse.ok) {
          throw new Error(
            founderMailData.error ||
            "No se pudo enviar el borrador con FounderMail."
          );
        }

        // Eliminamos el borrador de FounderMail
        const deleteResponse = await fetch(
          `http://localhost:5000/api/admin/emails/drafts/${composeDraftId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!deleteResponse.ok) {
          throw new Error(
            "El correo se envió, pero no se pudo eliminar el borrador."
          );
        }

        // Eliminamos el borrador de la interfaz
        setDraftEmails((prev) =>
          prev.filter(
            (draft) => draft.id !== composeDraftId
          )
        );

        setComposeDraftId(null);
        setIsComposeOpen(false);
        await refreshProviderUsage();

        alert("Email enviado correctamente.");

        return;
      }
      // =================================
      // RESPUESTA CON FOUNDERMAIL
      // =================================

      if (composeMode === "reply") {

        console.log(
          "FOUNDERMAIL REPLY DATA:",
          {
            email: selectedEmail.email,
            founderMailId: selectedEmail.founderMailId,
            subject: emailData.subject,
          }
        );

        const formData = new FormData();
        formData.append("to", selectedEmail.email);
        formData.append("subject", emailData.subject);
        formData.append(
          "text",
          htmlToPlainText(emailData.content)
        );
        formData.append("html", emailData.content);
        formData.append(
          "inReplyToMessageId",
          selectedEmail.founderMailMessageId || ""
        );

        (emailData.attachments || []).forEach((file) => {
          formData.append("attachments", file, file.name);
        });

        const founderMailResponse = await fetch(
          "http://localhost:5000/api/admin/emails/send-founder",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const founderMailData =
          await founderMailResponse.json();

        if (!founderMailResponse.ok) {
          throw new Error(
            founderMailData.error ||
            "No se pudo enviar la respuesta con FounderMail."
          );
        }

        setIsComposeOpen(false);
        await refreshProviderUsage();

        alert("Respuesta enviada correctamente.");

        return;
      }

      // =================================
      // DESTINATARIOS
      // =================================

      const recipientType = emailData.recipients?.type;
      const recipients = emailData.recipients?.recipients || [];
      const recipientTypesWithoutSelection = [
        "all_users",
        "spain_users",
        "newsletter",
      ];

      if (
        !recipientTypesWithoutSelection.includes(recipientType) &&
        recipients.length === 0
      ) {
        alert("Selecciona al menos un destinatario.");
        return;
      }
      // =================================
      // ENVIAR EMAIL
      // =================================

      const formData = new FormData();
      const usesFounderMail = ["users", "custom"].includes(recipientType);

      if (usesFounderMail) {
        recipients.forEach((recipient) => {
          formData.append("to", recipient);
        });
      } else {
        formData.append("type", emailData.recipients.type);

        formData.append(
          "recipients",
          JSON.stringify(emailData.recipients.recipients || [])
        );
      }

      formData.append(
        "subject",
        emailData.subject
      );

      formData.append(
        "html",
        emailData.content
      );

      formData.append(
        "text",
        htmlToPlainText(emailData.content)
      );

      (emailData.attachments || []).forEach((file) => {
        formData.append("attachments", file, file.name);
      });

      const response = await fetch(
        `http://localhost:5000/api/admin/emails/${usesFounderMail ? "send-founder" : "send"}`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo enviar el email."
        );
      }

      if (usesFounderMail) {
        const sentDate = new Date();
        setSentEmails((previous) => [{
          id: `founder-sent-local-${sentDate.getTime()}`,
          sender: "Bellumartis",
          email: "admin@bellumartis.com",
          subject: emailData.subject,
          date: sentDate.toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
          fullDate: sentDate.toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
          timestamp: sentDate.getTime(),
          unread: false,
          body: [emailData.content],
          recipients: emailData.recipients,
          attachments: emailData.attachments || [],
        }, ...previous]);
        setIsComposeOpen(false);
        await refreshProviderUsage();
        alert(recipients.length === 1
          ? "Email enviado correctamente."
          : `Email enviado correctamente a ${recipients.length} destinatarios.`);
        return;
      }

      if (data.failed) {
        throw new Error(data.error || "El email no pudo enviarse y quedó marcado para revisar.");
      }

      // Solo muestra en Enviados las tandas archivadas por el backend.
      const archivedSentEmails = (data.sentEmails || []).map((email) => {
        const sentDate = new Date(email.date);
        return {
          id: `brevo-archive-${email.id}`,
          sender: "Bellumartis",
          email: "admin@bellumartis.com",
          subject: email.subject || emailData.subject,
          date: sentDate.toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
          fullDate: sentDate.toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
          timestamp: sentDate.getTime(),
          unread: false,
          body: [email.html || email.text || emailData.content],
          recipients: { type: "custom", recipients: email.recipients || [] },
          attachments: [],
          isSent: true,
        };
      });
      if (archivedSentEmails.length) {
        setSentEmails((previous) => [
          ...archivedSentEmails,
          ...previous.filter((email) => !archivedSentEmails.some((sent) => sent.id === email.id)),
        ]);
      }

      setIsComposeOpen(false);
      await loadScheduledEmails();
      await refreshProviderUsage();

      const sentCount = Number(data.sent) || 0;
      const pendingCount = Number(data.pending) || 0;
      if (data.queued) {
        alert(`Enviados ${sentCount}; quedan ${pendingCount} en la cola de Bellumartis. Se reanudarán cuando haya cuota de Brevo.`);
      } else {
        alert(sentCount === 1
          ? "Email aceptado por Brevo para su envío."
          : `Emails aceptados por Brevo para ${sentCount} destinatarios.`);
      }

    } catch (error) {

      console.error(
        "ERROR ENVIANDO EMAIL:",
        error
      );

      alert(
        error.message ||
        "No se pudo enviar el email."
      );
    } finally {
      emailSubmissionInProgress.current = false;
      setIsEmailSubmitting(false);
    }
  };

  const handleScheduleEmail = async (emailData) => {
    if (emailSubmissionInProgress.current) return;
    emailSubmissionInProgress.current = true;
    setIsEmailSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");

      const scheduledAt = new Date(`${emailData.scheduledDate}T${emailData.scheduledTime}`);
      if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
        throw new Error("La fecha y hora del envío deben ser futuras.");
      }

      const formData = new FormData();
      formData.append("type", emailData.recipients.type);
      formData.append("recipients", JSON.stringify(emailData.recipients.recipients || []));
      formData.append("scheduledAt", scheduledAt.toISOString());
      formData.append("subject", emailData.subject);
      formData.append("html", emailData.content);
      formData.append("text", htmlToPlainText(emailData.content));
      (emailData.attachments || []).forEach((file) => formData.append("attachments", file, file.name));

      const response = await fetch("http://localhost:5000/api/admin/emails/schedule", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo programar el email.");

      setIsComposeOpen(false);
      await loadScheduledEmails();
      alert("Email programado correctamente.");
    } catch (error) {
      console.error("ERROR PROGRAMANDO EMAIL:", error);
      alert(error.message || "No se pudo programar el email.");
    } finally {
      emailSubmissionInProgress.current = false;
      setIsEmailSubmitting(false);
    }
  };



  return (
    <>
      {/* =======================
          SERVICIOS EMAIL
      ======================== */}

      <div className="admin-email-services">
        <div className="admin-card admin-email-service">
          <span className="admin-service-title">
            FounderMail
          </span>
          <span className="admin-service-status online">
            🟢 Plan gratuito
          </span>
          <small>
            {providerUsage?.founderMail?.unavailable
              ? "Uso no disponible (IMAP)"
              : providerUsage?.founderMail
                ? `${providerUsage.founderMail.today} enviados hoy · ${providerUsage.founderMail.month} este mes`
                : "Consultando uso…"}
          </small>
          <small>
            Límite: 100 al día y 3.000 al mes · reinicio diario UTC
          </small>
        </div>

        <div className="admin-card admin-email-service">
          <span className="admin-service-title">Brevo</span>
          <span className="admin-service-status online">
            🟢 Plan gratuito
          </span>
          <small>
            {providerUsage?.brevo?.unavailable
              ? "Uso no disponible (API)"
              : providerUsage?.brevo
                ? `${providerUsage.brevo.today} envíos transaccionales reportados hoy`
                : "Consultando uso…"}
          </small>
          <small>
            Límite publicado: hasta 300 emails al día
          </small>
        </div>

      </div>


      {/* =======================
          CENTRO DE EMAIL
      ======================== */}

      <div className="admin-card admin-email-container">


        {/* =======================
            BARRA DE ACCIONES
        ======================== */}

        <div className="admin-email-toolbar">
          {activeFolder === "reports" ? (
            <>
              <strong className="contact-reports-toolbar-title">Reportes de contacto</strong>
              <div className="admin-email-toolbar-spacer" />
              <input
                className="admin-email-search"
                placeholder="Buscar nombre, email o asunto…"
                value={reportFilters.search}
                onChange={(event) => setReportFilters((filters) => ({ ...filters, search: event.target.value }))}
              />
              <select aria-label="Filtrar por motivo" value={reportFilters.reason} onChange={(event) => setReportFilters((filters) => ({ ...filters, reason: event.target.value }))}>
                <option value="">Todos los motivos</option>
                {Object.entries(REPORT_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select aria-label="Filtrar por prioridad" value={reportFilters.priority} onChange={(event) => setReportFilters((filters) => ({ ...filters, priority: event.target.value }))}>
                <option value="">Todas las prioridades</option>
                {Object.entries(REPORT_PRIORITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select aria-label="Filtrar por estado" value={reportFilters.status} onChange={(event) => setReportFilters((filters) => ({ ...filters, status: event.target.value }))}>
                <option value="">Todos los estados</option>
                {Object.entries(REPORT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select aria-label="Ordenar reportes" value={reportFilters.sort} onChange={(event) => setReportFilters((filters) => ({ ...filters, sort: event.target.value }))}>
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguos</option>
              </select>
            </>
          ) : (
            <>
          <button
            className="admin-primary-button"
            onClick={() => {
              setComposeMode("new");
              setComposeDraftId(null);
              setComposeInitialRecipients({
                type: "custom",
                recipients: [],
              });
              setComposeInitialSubject("");
              setComposeInitialContent("");
              setIsComposeOpen(true);
            }}
          >
            + Nuevo email
          </button>


          <button
            disabled={!selectedEmail}
            onClick={handleReply}
          >
            Responder
          </button>

          <button
            disabled={!selectedEmail}
            onClick={handleForward}
          >
            Reenviar
          </button>


          <button
            disabled={!selectedEmail}
            onClick={handleDeleteEmail}
          >
            Eliminar
          </button>

          {selectedEmailIds.length > 0 && (
            <button className="admin-email-delete-selected" onClick={handleBulkDeleteEmails}>
              Eliminar seleccionados ({selectedEmailIds.length})
            </button>
          )}


          {(["received", "sent", "drafts", "scheduled"].includes(activeFolder)) && (
            <>
              <div className="admin-email-toolbar-spacer" />

              <input
                className="admin-email-search"
                placeholder="Buscar emails por palabras…"
                aria-label="Buscar emails por palabras"
                value={emailSearch}
                onChange={(event) => setEmailSearch(event.target.value)}
              />

              <select
                className="admin-email-sort"
                aria-label="Filtrar y ordenar emails"
                value={emailSort}
                onChange={(event) => setEmailSort(event.target.value)}
              >
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="unread">No leídos</option>
              </select>
            </>
          )}
            </>
          )}
        </div>


        {/* =======================
            ZONA PRINCIPAL
        ======================== */}

        <div className="admin-email-workspace">


          {/* =======================
              MENU LATERAL
          ======================== */}

          <aside className="admin-email-sidebar">

            {folders.map((folder) => (
              <button
                key={folder.id}
                className={
                  activeFolder === folder.id ? "active" : ""
                }
                onClick={() => handleFolderChange(folder.id)}
              >
                <span>
                  {folder.icon}
                </span>

                <span className="admin-email-folder-label">{folder.label}</span>
                {folder.id === "received" && unreadEmailsCount > 0 && (
                  <span className="admin-email-folder-count" aria-label={`${unreadEmailsCount} correos sin leer`}>
                    {unreadEmailsCount}
                  </span>
                )}
                {folder.id === "reports" && pendingReportCount > 0 && (
                  <span className="admin-email-folder-count" aria-label={`${pendingReportCount} reportes pendientes`}>
                    {pendingReportCount}
                  </span>
                )}
              </button>
            ))}

          </aside>


          {/* =======================
              LISTA DE EMAILS
              O
              VISOR DEL EMAIL
          ======================== */}

          <div className="admin-email-content">
            {activeFolder === "reports" ? (
              selectedReport ? (
                <div className="contact-report-detail">
                  <div className="contact-report-detail-heading">
                    <div className="contact-report-detail-actions">
                      <button type="button" className="admin-email-back" onClick={() => setSelectedReport(null)}>← Volver a reportes</button>
                      <div className="contact-report-detail-action-buttons">
                        <button type="button" className="contact-report-reply" onClick={() => handleReplyToReport(selectedReport)}>↩ Responder por email</button>
                        <button
                          type="button"
                          className="contact-report-delete"
                          onClick={() => deleteContactReport(selectedReport)}
                          disabled={selectedReport.status !== "resolved"}
                          title={selectedReport.status === "resolved" ? "Eliminar reporte resuelto" : "Solo se pueden eliminar reportes resueltos"}
                        >
                          Eliminar reporte
                        </button>
                      </div>
                    </div>
                    <h2>Reporte de contacto</h2>
                  </div>
                  {reportsError && <p className="contact-reports-error" role="alert">{reportsError}</p>}
                  <div className="contact-report-detail-meta">
                    <p><strong>Nombre:</strong> {selectedReport.name}</p>
                    <p><strong>Email:</strong> <a href={`mailto:${selectedReport.email}`}>{selectedReport.email}</a></p>
                    <p><strong>Recibido:</strong> {new Date(selectedReport.created_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</p>
                    <p><strong>Motivo:</strong> {getReportReasonLabel(selectedReport)}</p>
                    <p><strong>Prioridad solicitada:</strong> <span className={`contact-report-priority contact-report-priority-${selectedReport.priority}`}>{REPORT_PRIORITIES[selectedReport.priority] || selectedReport.priority}</span></p>
                    <label>
                      Estado
                      <select value={selectedReport.status} onChange={(event) => updateContactReport("status", event.target.value)}>
                        {Object.entries(REPORT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label>
                      Prioridad revisada
                      <select value={selectedReport.priority} onChange={(event) => updateContactReport("priority", event.target.value)}>
                        {Object.entries(REPORT_PRIORITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                  </div>
                  <h3>Mensaje</h3>
                  <div className="contact-report-message">{selectedReport.message}</div>
                </div>
              ) : (
                <div className="contact-report-list">
                  {reportsError && <p className="contact-reports-error" role="alert">{reportsError}</p>}
                  {reportsLoading && contactReports.length === 0 ? (
                    <div className="admin-email-empty"><p>Cargando reportes…</p></div>
                  ) : contactReports.length === 0 ? (
                    <div className="admin-email-empty"><span>📋</span><p>No hay reportes que coincidan con estos filtros.</p></div>
                  ) : (
                    <>
                      <div className="contact-report-list-header">
                        <span>Remitente</span><span>Motivo</span><span>Prioridad · Estado</span><span>Recibido</span>
                      </div>
                      {contactReports.map((report) => (
                        <button type="button" className="contact-report-row" key={report.id} onClick={() => setSelectedReport(report)}>
                          <span><strong>{report.name}</strong><small>{report.email}</small></span>
                          <span className="contact-report-reason">{getReportReasonLabel(report)}</span>
                          <span className="contact-report-priority-cell"><span className={`contact-report-priority contact-report-priority-${report.priority}`}>{REPORT_PRIORITIES[report.priority] || report.priority}</span><small>{REPORT_STATUSES[report.status] || report.status}</small></span>
                          <small>{new Date(report.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</small>
                        </button>
                      ))}
                      {contactReports.length >= 100 && <p className="contact-reports-limit">Mostrando los 100 reportes más recientes; usa los filtros para acotar la búsqueda.</p>}
                    </>
                  )}
                </div>
              )
            ) : (
              <>
            {activeFolder === "received" && newEmailNotice > 0 && (
              <div className="admin-email-new-message-notice" role="status">
                {newEmailNotice === 1
                  ? "Ha llegado un correo nuevo."
                  : `Han llegado ${newEmailNotice} correos nuevos.`}
                <button
                  type="button"
                  onClick={() => setNewEmailNotice(0)}
                  aria-label="Cerrar aviso de correo nuevo"
                >
                  ×
                </button>
              </div>
            )}


            {!selectedEmail ? (

              /* =======================
                 LISTADO
              ======================== */

              <div className="admin-email-list-panel">

                <div className="admin-email-list-header">

                  <span>
                    De
                  </span>

                  <span>
                    Asunto
                  </span>

                  <span>
                    Fecha
                  </span>

                  <label className="admin-email-select-all" title="Seleccionar todos los emails visibles">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos los emails visibles"
                      checked={visibleEmails.length > 0 && visibleEmails.every((email) => selectedEmailIds.includes(String(email.id)))}
                      onChange={toggleVisibleEmailSelection}
                    />
                  </label>

                </div>


                {/* =======================
      RECIBIDOS
  ======================== */}

                {activeFolder === "received" &&
                  visibleEmails.map((email) => (

                    <div
                      key={email.id}
                      className={`admin-email-row ${email.unread ? "unread" : ""} ${selectedEmailIds.includes(String(email.id)) ? "selected" : ""}`}
                      onClick={() => handleEmailClick(email)}
                    >

                      <strong>

                        {email.unread && (
                          <span className="admin-email-unread-dot">
                            ●
                          </span>
                        )}

                        {email.sender}

                      </strong>

                      <span>
                        {email.subject}
                      </span>

                      <small>
                        {email.date}
                      </small>

                      <input className="admin-email-row-checkbox" type="checkbox" checked={selectedEmailIds.includes(String(email.id))} aria-label={`Seleccionar email: ${email.subject}`} onClick={(event) => event.stopPropagation()} onChange={() => toggleEmailSelection(email.id)} />

                    </div>

                  ))
                }


                {/* =======================
      ENVIADOS
  ======================== */}

                {activeFolder === "sent" &&
                  visibleEmails.map((email) => (

                    <div
                      key={email.id}
                      className={`admin-email-row ${selectedEmailIds.includes(String(email.id)) ? "selected" : ""}`}
                      onClick={() => handleEmailClick(email)}
                    >

                      <span>
                        Para:{" "}
                        <strong>
                          {email.recipients?.recipients?.join(", ") || "Destinatario desconocido"}
                        </strong>
                      </span>

                      <span>
                        {email.subject}
                      </span>

                      <small>
                        {email.date}
                      </small>

                      <input className="admin-email-row-checkbox" type="checkbox" checked={selectedEmailIds.includes(String(email.id))} aria-label={`Seleccionar email enviado: ${email.subject}`} onClick={(event) => event.stopPropagation()} onChange={() => toggleEmailSelection(email.id)} />

                    </div>

                  ))
                }


                {/* =======================
      BORRADORES
  ======================== */}

                {activeFolder === "drafts" &&
                  visibleEmails.map((email) => (

                    <div
                      key={email.id}
                      className={`admin-email-row ${selectedEmailIds.includes(String(email.id)) ? "selected" : ""}`}
                      onClick={() => handleEmailClick(email)}
                    >

                      <strong>
                        Borrador
                      </strong>

                      <span>
                        {email.subject || "Sin asunto"}
                      </span>

                      <small>
                        Pendiente
                      </small>

                      <input className="admin-email-row-checkbox" type="checkbox" checked={selectedEmailIds.includes(String(email.id))} aria-label={`Seleccionar borrador: ${email.subject}`} onClick={(event) => event.stopPropagation()} onChange={() => toggleEmailSelection(email.id)} />

                    </div>

                  ))
                }


                {/* =======================
      PROGRAMADOS
  ======================== */}

                {activeFolder === "scheduled" &&
                  visibleEmails.map((email) => (

                    <div
                      key={email.id}
                      className={`admin-email-row ${selectedEmailIds.includes(String(email.id)) ? "selected" : ""}`}
                      onClick={() => handleEmailClick(email)}
                    >

                      <strong>
                        {email.scheduleStatus === "failed"
                          ? "Error de envío"
                          : ["queued", "sending"].includes(email.scheduleStatus)
                            ? "En cola"
                            : "Programado"}
                      </strong>

                      <span>
                        {email.subject}
                      </span>

                      <small>
                        {email.scheduledDate} · {email.scheduledTime}
                      </small>

                      <input className="admin-email-row-checkbox" type="checkbox" checked={selectedEmailIds.includes(String(email.id))} aria-label={`Seleccionar email programado: ${email.subject}`} onClick={(event) => event.stopPropagation()} onChange={() => toggleEmailSelection(email.id)} />

                    </div>

                  ))
                }

                {loadingFolders[activeFolder] && (
                  <div className="admin-email-empty admin-email-loading" role="status" aria-live="polite">
                    <span className="admin-email-loading-spinner" aria-hidden="true" />
                    <p>Cargando Emails…</p>
                  </div>
                )}

                {activeFolder === "received" && !loadingFolders.received && inboxError && (
                  <div className="admin-email-empty admin-email-load-error" role="alert">
                    <span>⚠️</span>
                    <p>{inboxError}</p>
                  </div>
                )}

                {(["received", "sent", "drafts", "scheduled"].includes(activeFolder)) &&
                  !loadingFolders[activeFolder] &&
                  folderEmails.length > 0 &&
                  visibleEmails.length === 0 && (
                    <div className="admin-email-empty">
                      <p>
                        {emailSort === "unread" && !emailSearch.trim()
                          ? "No hay emails sin leer en esta carpeta."
                          : "No se encontraron emails con esos criterios."}
                      </p>
                    </div>
                  )}

                {/* =======================
      SECCIÓN VACÍA
  ======================== */}

                {(
                  (!loadingFolders[activeFolder] && !inboxError && activeFolder === "received" && emails.length === 0) ||
                  (!loadingFolders[activeFolder] && activeFolder === "sent" && sentEmails.length === 0) ||
                  (!loadingFolders[activeFolder] && activeFolder === "drafts" && draftEmails.length === 0) ||
                  (!loadingFolders.scheduled && activeFolder === "scheduled" && scheduledEmails.length === 0)
                ) && (

                    <div className="admin-email-empty">

                      <span>
                        {
                          folders.find(
                            (folder) => folder.id === activeFolder
                          )?.icon
                        }
                      </span>

                      <p>
                        No hay emails en esta sección.
                      </p>

                    </div>

                  )}

              </div>


            ) : (

              /* =======================
                 VISOR
              ======================== */

              <div className="admin-email-view-panel">


                <div className="admin-email-view-header">

                  <button
                    className="admin-email-back"
                    onClick={handleBackToList}
                  >
                    ← Volver
                  </button>


                  <h3>
                    {selectedEmail.subject}
                  </h3>


                  <div className="admin-email-meta">

                    <p>
                      <strong>
                        De:
                      </strong>{" "}
                      {selectedEmail.sender}{" "}
                      &lt;{selectedEmail.email}&gt;
                    </p>


                    <p>
                      <strong>
                        Para:
                      </strong>{" "}
                      {getRecipientLabel(selectedEmail.recipients)}
                    </p>


                    <p>
                      <strong>
                        Fecha:
                      </strong>{" "}
                      {selectedEmail.fullDate}
                    </p>

                  </div>

                </div>


                <div className="admin-email-message">

                  {selectedEmail.body.map((paragraph, index) => (
                    <div
                      key={index}
                      dangerouslySetInnerHTML={{
                        __html: paragraph,
                      }}
                    />
                  ))}

                </div>


                <div className="admin-email-attachments">

                  <span>
                    📎 Adjuntos
                  </span>

                  <div>
                    {selectedEmail.attachments?.length > 0 ? (
                      selectedEmail.attachments.map(
                        (attachment, index) => {

                          const isImage =
                            attachment.contentType?.startsWith(
                              "image/"
                            );

                          return (
                            <div
                              key={index}
                              className="admin-email-attachment"
                            >

                              {isImage && attachment.content ? (
                                <img
                                  src={`data:${attachment.contentType};base64,${attachment.content}`}
                                  alt={
                                    attachment.filename ||
                                    "Imagen adjunta"
                                  }
                                  className="admin-email-attachment-preview"
                                />
                              ) : (
                                <div className="admin-email-attachment-icon">
                                  📄
                                </div>
                              )}

                              <div className="admin-email-attachment-info">

                                <strong>
                                  {attachment.filename ||
                                    "Archivo adjunto"}
                                </strong>

                                <div className="admin-email-attachment-actions">

                                  {isImage && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handlePreviewAttachment(
                                          attachment
                                        )
                                      }
                                    >
                                      👁️ Vista previa
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadAttachment(
                                        attachment
                                      )
                                    }
                                  >
                                    ⬇️ Descargar
                                  </button>

                                </div>

                              </div>

                            </div>
                          );
                        }
                      )
                    ) : (
                      <div>
                        Ningún archivo adjunto
                      </div>
                    )}
                  </div>

                </div>


              </div>

            )}

              </>
            )}
          </div>

        </div>

      </div>
      {pendingEmailDeletion && (
        <div className="admin-email-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeletingEmails) setPendingEmailDeletion(null); }}>
          <section className="admin-email-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="admin-email-confirm-title">
            <h2 id="admin-email-confirm-title">{pendingEmailDeletion.ids.length === 1 ? "¿Eliminar este email?" : `¿Eliminar ${pendingEmailDeletion.ids.length} emails?`}</h2>
            <p>Esta acción eliminará los emails seleccionados de la carpeta {folders.find((folder) => folder.id === pendingEmailDeletion.folder)?.label || "actual"}.</p>
            <div className="admin-email-confirm-actions">
              <button type="button" disabled={isDeletingEmails} onClick={() => setPendingEmailDeletion(null)}>Cancelar</button>
              <button type="button" className="danger" disabled={isDeletingEmails} onClick={confirmDeleteEmails}>{isDeletingEmails ? "Eliminando…" : "Eliminar"}</button>
            </div>
          </section>
        </div>
      )}
      <EmailComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        composeMode={composeMode}
        initialRecipients={composeInitialRecipients}
        initialSubject={composeInitialSubject}
        initialContent={composeInitialContent}
        isSubmitting={isEmailSubmitting}

        onSend={handleSendEmail}
        onSchedule={handleScheduleEmail}

        onSaveDraft={async (emailData) => {
          try {
            const token = localStorage.getItem("token");

            if (!token) {
              alert("Tu sesión ha caducado. Vuelve a iniciar sesión.");
              return;
            }

            const response = await fetch(
              "http://localhost:5000/api/admin/emails/drafts",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  id: composeDraftId,
                  to: emailData.recipients?.recipients || [],
                  subject: emailData.subject || "",
                  text: htmlToPlainText(emailData.content),
                  html: emailData.content || "",
                }),
              }
            );

            const data = await response.json();

            if (!response.ok) {
              throw new Error(
                data.error || "No se pudo guardar el borrador."
              );
            }

            const updatedDate = new Date(data.updatedAt);

            const newDraft = {
              id: data.id,
              sender: "Borrador",
              email: "",
              subject: data.subject || "Sin asunto",
              date: updatedDate.toLocaleString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }),
              fullDate: updatedDate.toLocaleString("es-ES"),
              unread: false,
              body: data.body
                ? [data.body]
                : ["Sin contenido"],
              recipients: {
                type: "custom",
                recipients: data.to || [],
              },
              attachments: [],
              isDraft: true,
              founderMailDraftId: data.id,
            };

            setDraftEmails((prev) => {
              if (composeDraftId !== null) {
                return prev.map((draft) =>
                  draft.id === composeDraftId
                    ? newDraft
                    : draft
                );
              }

              return [
                newDraft,
                ...prev,
              ];
            });

            setIsComposeOpen(false);

            alert("Borrador guardado correctamente.");
          } catch (error) {
            console.error(
              "ERROR GUARDANDO BORRADOR:",
              error
            );

            alert(
              error.message ||
              "No se pudo guardar el borrador."
            );
          }
        }}
      />
    </>
  );
}
