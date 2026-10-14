import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import api from "../../../api";
import AdminImageField from "../components/AdminImageField";
import { resolveAdminAssetUrl } from "../utils/assetHelpers";


const BANNER_TYPE_LABELS = {
  sorteo: "Sorteo",
  charla: "Charla",
  firma: "Firma",
  webinar: "Webinar",
  book_promotion: "Promocion de libro",
};

const MANUAL_BANNER_TYPES = [
  { value: "book_promotion", label: "Promocion de libro" },
  { value: "sorteo", label: "Sorteo" },
];

function BannerFormModal({
  open,
  mode,
  banner,
  onClose,
  onSave,
  saving,
}) {
  const initialForm = useMemo(
    () => ({
      banner_type: banner?.banner_type || "book_promotion",
      title: banner?.title || "",
      image_url: banner?.image_url || "",
      link: banner?.link || "",
    }),
    [banner]
  );

  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setImageFile(null);
      setImageFileName("");
      setImagePreviewUrl(resolveAdminAssetUrl(banner?.image_url));
    }
  }, [banner?.image_url, initialForm, open]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const clearImage = () => {
    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(null);
    setImageFileName("");
    setImagePreviewUrl(resolveAdminAssetUrl(banner?.image_url));
    setForm((current) => ({
      ...current,
      image_url: banner?.image_url || "",
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

    setImageFile(file);
    setImageFileName(file.name);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const submitLabel = mode === "edit" ? "Guardar cambios" : "Crear banner";
  const titleLabel =
    mode === "edit" ? "Editar banner manual" : "Crear banner manual";

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
        className="admin-modal admin-event-create-modal admin-banner-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-banner-modal-title"
        onClick={(event) => event.stopPropagation()}
        style={{ margin: "0 auto" }}
      >
        <p className="admin-modal-kicker">Banners manuales</p>
        <h3 id="admin-banner-modal-title">{titleLabel}</h3>
        <p className="admin-modal-copy">
          Los banners de eventos se sincronizan desde la ficha del evento. Aqui
          aqui puedes crear promociones manuales de libros o banners de sorteo
          para usuarios no registrados.
        </p>

        <form
          className="admin-event-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              ...form,
              imageFile,
            });
          }}
        >
          <div className="admin-event-field">
            <label className="event-create-label" htmlFor="banner-type">
              <span>Tipo de banner</span>
            </label>
            <select
              id="banner-type"
              className="admin-event-input"
              value={form.banner_type}
              onChange={(event) => updateField("banner_type", event.target.value)}
              disabled={mode === "edit"}
            >
              {MANUAL_BANNER_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-event-field">
            <label className="event-create-label" htmlFor="banner-title">
              <span>Titulo</span>
            </label>
            <input
              id="banner-title"
              className="admin-event-input"
              type="text"
              maxLength={255}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Titulo del banner"
            />
          </div>

          <div className="admin-event-field">
            <AdminImageField
              id="banner-image"
              label="Imagen del banner"
              description="Selecciona una imagen desde tu equipo. Podras cancelarla o cambiarla antes de guardar."
              previewUrl={imagePreviewUrl}
              fileName={imageFileName}
              onFileChange={handleImageFile}
              onClear={clearImage}
              disabled={saving}
              buttonLabel="Seleccionar imagen"
              clearLabel="Cancelar seleccion"
            />
          </div>

          <div className="admin-event-field">
            <label className="event-create-label" htmlFor="banner-link">
              <span>Enlace</span>
            </label>
            <input
              id="banner-link"
              className="admin-event-input"
              type="url"
              maxLength={255}
              value={form.link}
              onChange={(event) => updateField("link", event.target.value)}
              placeholder="https://..."
            />
          </div>

          <p className="admin-modal-copy">
            El estado activo se controla desde la tabla principal.
          </p>

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

function BannerPreviewCard({ banner }) {
  if (!banner) {
    return <p className="admin-banner-preview-empty">No hay ningún banner activo para este caso.</p>;
  }

  const preview = resolveAdminAssetUrl(banner.image_url);
  const typeLabel = BANNER_TYPE_LABELS[banner.banner_type] || banner.banner_type;
  const title = banner.event_title || banner.title || typeLabel;
  const link = banner.event_link || banner.link;

  return (
    <article className="admin-banner-preview-card">
      {preview ? <img src={preview} alt={title} /> : <div className="admin-banner-preview-no-image">Sin imagen</div>}
      <div className="admin-banner-preview-card-copy">
        <strong>{title}</strong>
        <span>{typeLabel}{banner.event_province ? ` · ${banner.event_province}` : ""}</span>
        {link && <small>{link}</small>}
      </div>
    </article>
  );
}

export default function BannersSection() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editBanner, setEditBanner] = useState(null);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/admin/banners");
      setBanners(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("ADMIN BANNERS LIST ERROR:", err);
      setError(err?.response?.data?.error || "No se pudo cargar la lista de banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const manualBanner = editBanner && editBanner.is_manual ? editBanner : null;

  const closeModal = (force = false) => {
    if (saving && !force) return;
    setCreateOpen(false);
    setEditBanner(null);
  };

  const toggleBannerStatus = async (banner) => {
    if (!banner?.id) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const nextActive = !banner.active;
      const res = await api.patch(`/admin/banners/${banner.id}/status`, {
        active: nextActive,
      });

      setBanners((current) =>
        current.map((item) =>
          item.id === banner.id ? { ...item, active: Boolean(res.data?.active ?? nextActive) } : item
        )
      );
      setMessage(res.data?.message || "Estado actualizado correctamente");
    } catch (err) {
      console.error("ADMIN BANNERS STATUS ERROR:", err);
      setError(err?.response?.data?.error || "No se pudo actualizar el estado");
    } finally {
      setSaving(false);
    }
  };

  const saveBanner = async (form) => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!form.imageFile && !form.image_url) {
        setError("Selecciona una imagen para el banner");
        return;
      }

      const payload = new FormData();
      payload.append("banner_type", form.banner_type);
      payload.append("title", form.title);
      payload.append("link", form.link);
      payload.append("image_url", form.image_url || "");

      if (form.imageFile) {
        payload.append("image", form.imageFile);
      }

      if (editBanner?.id) {
        const res = await api.put(`/admin/banners/${editBanner.id}`, payload);
        const updated = res.data?.banner;

        setBanners((current) =>
          current.map((item) => (item.id === updated?.id ? { ...item, ...updated } : item))
        );
        setMessage(res.data?.message || "Banner actualizado correctamente");
      } else {
        const res = await api.post("/admin/banners", payload);
        const created = res.data?.banner;
        if (created?.id) {
          setBanners((current) => [created, ...current]);
        }
        setMessage(res.data?.message || "Banner creado correctamente");
      }

      closeModal(true);
    } catch (err) {
      console.log(err.response?.data);
      console.error("ADMIN BANNERS SAVE ERROR:", err);
      setError(err?.response?.data?.error || "No se pudo guardar el banner");
    } finally {
      setSaving(false);
    }
  };

  const deleteBanner = async (banner) => {
    if (!banner?.id) return;

    const confirmed = window.confirm(
      "Este banner manual se eliminara definitivamente. ¿Quieres continuar?"
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await api.delete(`/admin/banners/${banner.id}`);
      setBanners((current) => current.filter((item) => item.id !== banner.id));
      setMessage(res.data?.message || "Banner eliminado correctamente");
    } catch (err) {
      console.error("ADMIN BANNERS DELETE ERROR:", err);
      setError(err?.response?.data?.error || "No se pudo eliminar el banner");
    } finally {
      setSaving(false);
    }
  };

  const bannerRows = useMemo(() => banners, [banners]);
  const activeBannerRows = useMemo(() => bannerRows
    .filter((banner) => banner.active)
    .sort((first, second) => {
      const firstCreated = Date.parse(first.created_at) || 0;
      const secondCreated = Date.parse(second.created_at) || 0;
      return firstCreated - secondCreated || Number(first.id) - Number(second.id);
    }), [bannerRows]);
  const guestBanner = activeBannerRows.find((banner) => banner.is_manual && banner.banner_type === "sorteo")
    || activeBannerRows.find((banner) => !banner.is_manual && banner.banner_type === "sorteo")
    || null;
  const registeredFallbackBanner = activeBannerRows.find((banner) => !banner.is_manual && banner.banner_type === "webinar")
    || activeBannerRows.find((banner) => banner.is_manual && banner.banner_type === "book_promotion")
    || null;
  const provinceBanners = useMemo(() => {
    const bannersByProvince = new Map();
    activeBannerRows.forEach((banner) => {
      const province = String(banner.event_province || "").trim();
      if (!banner.is_manual && province && ["charla", "firma"].includes(banner.banner_type) && !bannersByProvince.has(province)) {
        bannersByProvince.set(province, banner);
      }
    });
    return [...bannersByProvince.entries()].map(([province, banner]) => ({ province, banner }));
  }, [activeBannerRows]);

  return (
    <section className="admin-content">
      <div className="admin-card admin-events-card">
        <div className="admin-events-card-head">
          <div>
            <p className="admin-stat-label">Gestion de banners</p>
            <p className="admin-events-card-copy">
              Los banners de eventos se crean automáticamente al crear el evento. Los
              manuales se usan para promociones de libros y sorteos.
            </p>
          </div>

          <button
            type="button"
            className="admin-events-create-btn"
            onClick={() => setCreateOpen(true)}
          >
            + Nuevo banner
          </button>
        </div>

        {error && <p className="admin-table-error">{error}</p>}
        {message && <p className="admin-table-success">{message}</p>}

        <div className="admin-table-wrap">
          {loading ? (
            <p className="admin-table-loading">Cargando banners...</p>
          ) : bannerRows.length === 0 ? (
            <p className="admin-table-empty">No hay banners para mostrar.</p>
          ) : (
            <table className="admin-users-table admin-events-table admin-banners-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Titulo</th>
                  <th>Tipo</th>
                  <th>Origen</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {bannerRows.map((banner) => {
                  const preview = resolveAdminAssetUrl(banner.image_url);
                  const typeLabel = BANNER_TYPE_LABELS[banner.banner_type] || banner.banner_type;
                  const isManual = Boolean(banner.is_manual);
                  const sourceLabel = isManual
                    ? "Manual"
                    : banner.event_title
                      ? `${banner.event_title}${banner.event_province ? ` - ${banner.event_province}` : ""}`
                      : "Evento";

                  return (
                    <tr key={banner.id}>
                      <td>
                        {preview ? (
                          <img
                            className="admin-banner-thumb"
                            src={preview}
                            alt={banner.title || typeLabel}
                          />
                        ) : (
                          <span className="admin-banner-thumb admin-banner-thumb-empty">
                            Sin imagen
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="admin-strong-cell">{banner.title || "-"}</span>
                      </td>
                      <td>
                        <span className="admin-banner-type-badge">{typeLabel}</span>
                      </td>
                      <td>
                        <span className="admin-banner-source">{sourceLabel}</span>
                      </td>
                      <td>
                        <span
                          className={`admin-banner-status ${banner.active ? "is-active" : "is-inactive"
                            }`}
                        >
                          {banner.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-banner-action-btn"
                            onClick={() => toggleBannerStatus(banner)}
                            disabled={saving}
                          >
                            {banner.active ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            type="button"
                            className="admin-banner-action-btn"
                            onClick={() => setEditBanner(banner)}
                            disabled={saving}
                          >
                            Editar
                          </button>

                          {isManual && (
                            <button
                              type="button"
                              className="admin-banner-action-btn danger"
                              onClick={() => deleteBanner(banner)}
                              disabled={saving}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <section className="admin-banner-live-preview" aria-labelledby="admin-banner-live-preview-title">
          <div className="admin-banner-live-preview-heading">
            <h3 id="admin-banner-live-preview-title">Banners que verá cada usuario</h3>
            <p>La vista previa sigue el orden de prioridad de la web y solo incluye banners activos.</p>
          </div>
          <div className="admin-banner-preview-scenarios">
            <article className="admin-banner-preview-scenario">
              <h4>Usuario no registrado</h4>
              <p>Se muestra primero el sorteo activo.</p>
              <BannerPreviewCard banner={guestBanner} />
            </article>
            <article className="admin-banner-preview-scenario">
              <h4>Usuario registrado sin banner en su provincia</h4>
              <p>Se muestra el webinar activo o, si no hay, la promoción manual.</p>
              <BannerPreviewCard banner={registeredFallbackBanner} />
            </article>
            <article className="admin-banner-preview-scenario admin-banner-preview-provinces">
              <h4>Usuario registrado con banner en su provincia</h4>
              <p>Para cada provincia se muestra el primer banner activo de charla o firma. Las demás provincias usan el banner general anterior.</p>
              {provinceBanners.length ? (
                <div className="admin-banner-preview-province-grid">
                  {provinceBanners.map(({ province, banner }) => (
                    <div className="admin-banner-preview-province" key={province}>
                      <h5>{province}</h5>
                      <BannerPreviewCard banner={banner} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="admin-banner-preview-empty">No hay banners activos de charla o firma asociados a provincias.</p>
              )}
            </article>
          </div>
        </section>
      </div>

      <BannerFormModal
        open={createOpen}
        mode="create"
        banner={null}
        onClose={closeModal}
        onSave={saveBanner}
        saving={saving}
      />

      <BannerFormModal
        open={Boolean(editBanner)}
        mode="edit"
        banner={editBanner}
        onClose={closeModal}
        onSave={saveBanner}
        saving={saving}
      />
    </section>
  );
}
