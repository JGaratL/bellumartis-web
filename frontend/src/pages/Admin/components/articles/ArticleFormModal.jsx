import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import api from "../../../../api";
import AdminImageField from "../AdminImageField";
import { resolveAdminAssetUrl } from "../../utils/assetHelpers";
import { rewriteContentHtmlAssetUrls } from "../../../../utils/contentHtmlHelpers";
import ArticleEditor from "./ArticleEditor";

function slugifyText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ArticleFormModal({
  open,
  article,
  periods = [],
  periodsLoading = false,
  onClose,
  onSave,
  saving,
}) {
  const initialForm = useMemo(
    () => ({
      title: article?.title || "",
      slug: article?.slug || "",
      description: article?.description || "",
      published_at: article?.published_at || getTodayDate(),
      theme: article?.theme || "historia_militar",
      period_id: article?.period_id ? String(article.period_id) : "",
      subperiod_id: article?.subperiod_id ? String(article.subperiod_id) : "",
      is_visible:
        article?.is_visible === undefined ? true : Boolean(article?.is_visible),
      image_url: article?.thumbnail_url || "",
      content: rewriteContentHtmlAssetUrls(article?.content_html || ""),
    }),
    [article]
  );

  const [form, setForm] = useState(initialForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [imageMode, setImageMode] = useState("upload");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const imageUrl = article?.thumbnail_url || "";
    const isRemoteImage = /^https?:\/\//i.test(imageUrl);

    setForm(initialForm);
    setSlugTouched(Boolean(article?.slug));
    setImageMode(isRemoteImage ? "url" : "upload");
    setImageFile(null);
    setImageFileName("");
    setImagePreviewUrl(resolveAdminAssetUrl(imageUrl));
    setError("");
  }, [article, initialForm, open]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "title" && !slugTouched) {
        next.slug = slugifyText(value);
      }

      if (field === "theme" && value === "actualidad_militar") {
        next.period_id = "";
      }

      return next;
    });
  };

  const clearImage = () => {
    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(null);
    setImageFileName("");
    setImageMode("upload");
    setImagePreviewUrl(resolveAdminAssetUrl(article?.thumbnail_url || ""));
    setForm((current) => ({
      ...current,
      image_url: article?.thumbnail_url || "",
    }));
  };

  const handleImageFile = (file) => {
    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    if (!file) {
      clearImage();
      return;
    }

    setImageMode("upload");
    setImageFile(file);
    setImageFileName(file.name);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleInlineImageUpload = async (file) => {
    const payload = new FormData();
    payload.append("image", file);

    const response = await api.post("/api/articles/upload-image", payload, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data?.url || response.data?.path || "";
  };

  const submitLabel = article ? "Guardar cambios" : "Crear artículo";
  const modalTitle = article ? "Editar artículo" : "Nuevo artículo";
  const selectedTheme = form.theme || "historia_militar";
  const periodOptions = Array.isArray(periods) ? periods : [];
  const periodDisabled = selectedTheme === "actualidad_militar" || periodsLoading;

  return createPortal(
    <div
      className="admin-event-modal-backdrop"
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 20px",
        background: "rgba(0, 0, 0, 0.72)",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <div
        className="admin-modal admin-event-create-modal admin-article-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-article-modal-title"
        onClick={(event) => event.stopPropagation()}
        style={{ margin: "0 auto" }}
      >
        <p className="admin-modal-kicker">Artículos</p>
        <h3 id="admin-article-modal-title">{modalTitle}</h3>
        <p className="admin-modal-copy">
          Crea contenido editorial con un editor visual. Los campos de tipo y orígen se fijan automaticamente.
        </p>

        <form
          className="admin-event-create-form admin-article-form"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");

            if (!form.title.trim()) {
              setError("El título es obligatorio");
              return;
            }

            if (!form.slug.trim()) {
              setError("El slug es obligatorio");
              return;
            }

            if (!form.content.trim()) {
              setError("El contenido del artículo es obligatorio");
              return;
            }

            if (imageMode === "url" && !form.image_url.trim() && !article?.thumbnail_url) {
              setError("Debes indicar una imagen principal o subir un archivo");
              return;
            }

            if (imageMode === "upload" && !imageFile && !article?.thumbnail_url) {
              setError("Selecciona una imagen principal o usa una URL");
              return;
            }

            onSave({
              ...form,
              theme: selectedTheme,
              period_id: periodDisabled ? "" : form.period_id,
              imageMode,
              imageFile,
              inlineImageUpload: handleInlineImageUpload,
            });
          }}
        >
          <div className="admin-event-field">
            <label className="event-create-label" htmlFor="article-title">
              <span>Título</span>
            </label>
            <input
              id="article-title"
              className="admin-event-input"
              type="text"
              maxLength={255}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Título del artículo"
            />
          </div>

          <div className="admin-event-field">
            <label className="event-create-label" htmlFor="article-slug">
              <span>Slug</span>
            </label>
            <input
              id="article-slug"
              className="admin-event-input"
              type="text"
              maxLength={255}
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                updateField("slug", slugifyText(event.target.value));
              }}
              placeholder="slug-del-artículo"
            />
          </div>

          <div className="admin-event-field">
            <label className="event-create-label" htmlFor="article-description">
              <span>Descripción</span>
            </label>
            <textarea
              id="article-description"
              className="admin-event-textarea"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Descripción breve o resumen"
              rows={4}
            />
          </div>

          <div className="admin-event-field">
            <div className="admin-article-image-mode">
              <button
                type="button"
                className={`admin-article-mode-btn ${imageMode === "upload" ? "active" : ""}`}
                onClick={() => setImageMode("upload")}
              >
                Subir imagen
              </button>
              <button
                type="button"
                className={`admin-article-mode-btn ${imageMode === "url" ? "active" : ""}`}
                onClick={() => setImageMode("url")}
              >
                Usar URL
              </button>
            </div>

            {imageMode === "upload" ? (
              <AdminImageField
                id="article-image"
                label="Imagen principal"
                description="Selecciona una imagen desde tu equipo. Se almacenará en uploads y podrás cambiarla antes de guardar."
                previewUrl={imagePreviewUrl}
                fileName={imageFileName}
                onFileChange={handleImageFile}
                onClear={clearImage}
                disabled={saving}
                buttonLabel="Seleccionar imagen"
                clearLabel="Cancelar seleccion"
              />
            ) : (
              <div className="admin-event-field">
                <label className="event-create-label" htmlFor="article-image-url">
                  <span>URL de la imagen principal</span>
                </label>
                <input
                  id="article-image-url"
                  className="admin-event-input"
                  type="url"
                  maxLength={500}
                  value={form.image_url}
                  onChange={(event) => updateField("image_url", event.target.value)}
                  placeholder="https://..."
                />
                {resolveAdminAssetUrl(form.image_url) ? (
                  <div className="admin-article-url-preview">
                    <img src={resolveAdminAssetUrl(form.image_url)} alt="Vista previa" />
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="admin-event-row">
            <div className="admin-event-field">
              <label className="event-create-label" htmlFor="article-date">
                <span>Fecha de publicacion</span>
              </label>
              <input
                id="article-date"
                className="admin-event-input"
                type="date"
                value={form.published_at}
                onChange={(event) => updateField("published_at", event.target.value)}
              />
            </div>

            <div className="admin-event-field">
              <label className="event-create-label" htmlFor="article-visible">
                <span>Visibilidad</span>
              </label>
              <select
                id="article-visible"
                className="admin-event-input"
                value={form.is_visible ? "1" : "0"}
                onChange={(event) => updateField("is_visible", event.target.value === "1")}
              >
                <option value="1">Visible</option>
                <option value="0">No visible</option>
              </select>
            </div>
          </div>

          <div className="admin-event-row">
            <div className="admin-event-field">
              <label className="event-create-label" htmlFor="article-theme">
                <span>Tema</span>
              </label>
              <select
                id="article-theme"
                className="admin-event-input"
                value={selectedTheme}
                onChange={(event) => updateField("theme", event.target.value)}
              >
                <option value="historia_militar">Historia militar</option>
                <option value="actualidad_militar">Actualidad militar</option>
              </select>
            </div>
          </div>

          <div className="admin-event-row">
            <div className="admin-event-field">
              <label className="event-create-label" htmlFor="article-period">
                <span>Periodo histórico</span>
              </label>
              <select
                id="article-period"
                className="admin-event-input"
                value={periodDisabled ? "" : form.period_id}
                onChange={(event) => updateField("period_id", event.target.value)}
                disabled={periodDisabled}
              >
                <option value="">
                  {selectedTheme === "actualidad_militar"
                    ? "No aplica"
                    : periodsLoading
                      ? "Cargando periodos..."
                      : "Selecciona un periodo"}
                </option>
                {periodOptions.map((period) => (
                  <option key={period.id} value={String(period.id)}>
                    {period.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-event-field">
            <label className="event-create-label">
              <span>Contenido</span>
            </label>
            <ArticleEditor
              value={form.content}
              onChange={(nextHtml) => updateField("content", nextHtml)}
              onUploadImage={handleInlineImageUpload}
              disabled={saving}
            />
          </div>

          {error ? <p className="admin-modal-copy admin-modal-error">{error}</p> : null}

          <div className="admin-event-actions">
            <button type="submit" className="admin-modal-btn" disabled={saving}>
              {saving ? "Guardando..." : submitLabel}
            </button>
            <button
              type="button"
              className="admin-modal-btn secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
