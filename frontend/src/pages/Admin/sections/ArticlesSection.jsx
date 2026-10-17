import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import api from "../../../api";
import { resolveAdminAssetUrl } from "../utils/assetHelpers";
import ArticleFormModal from "../components/articles/ArticleFormModal";

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("es-ES");
}

export default function ArticlesSection() {
  const [articles, setArticles] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sortOrder, setSortOrder] = useState("recent");
  const [createOpen, setCreateOpen] = useState(false);
  const [editArticle, setEditArticle] = useState(null);
  const [saving, setSaving] = useState(false);
  const saveInFlightRef = useRef(false);

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/api/articles");
      setArticles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("ADMIN ARTICLES LIST ERROR:", err);
      setError(err?.response?.data?.error || "No se pudo cargar la lista de articulos");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMeta = useCallback(async () => {
    try {
      setLoadingMeta(true);

      const res = await api.get("/api/articles/meta");
      setPeriods(Array.isArray(res.data?.periods) ? res.data.periods : []);
    } catch (err) {
      console.error("ADMIN ARTICLES META ERROR:", err);
      setError(err?.response?.data?.error || "No se pudieron cargar los periodos");
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    loadArticles();
    loadMeta();
  }, [loadArticles, loadMeta]);

  const sortedArticles = useMemo(() => {
    const rows = [...articles];

    rows.sort((a, b) => {
      const aTime = new Date(a.published_at || 0).getTime();
      const bTime = new Date(b.published_at || 0).getTime();

      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;

      return sortOrder === "oldest" ? aTime - bTime : bTime - aTime;
    });

    return rows;
  }, [articles, sortOrder]);

  const closeModal = useCallback(() => {
    if (saving) return;
    setCreateOpen(false);
    setEditArticle(null);
    setError("");
  }, [saving]);

  const saveArticle = useCallback(
    async (form) => {
      if (saving || saveInFlightRef.current) return;

      try {
        saveInFlightRef.current = true;
        setSaving(true);
        setError("");
        setMessage("");

        const payload = new FormData();
        payload.append("title", form.title || "");
        payload.append("slug", form.slug || "");
        payload.append("description", form.description || "");
        payload.append("published_at", form.published_at || "");
        payload.append("theme", form.theme || "historia_militar");
        payload.append("period_id", form.period_id || "");
        payload.append("subperiod_id", form.subperiod_id || "");
        payload.append("is_visible", form.is_visible ? "1" : "0");
        payload.append("content", form.content || "");

        if (form.imageMode === "url") {
          payload.append("image_url", form.image_url || "");
        } else if (form.imageFile) {
          payload.append("image", form.imageFile);
        } else if (editArticle?.thumbnail_url) {
          payload.append("image_url", editArticle.thumbnail_url);
        }

        if (editArticle?.id) {
          const res = await api.put(`/api/articles/${editArticle.id}`, payload);
          setMessage(res.data?.message || "Articulo actualizado correctamente");
        } else {
          const res = await api.post("/api/articles", payload);
          setMessage(res.data?.message || "Articulo creado correctamente");
        }

        setCreateOpen(false);
        setEditArticle(null);
        await loadArticles();
      } catch (err) {
        console.error("ADMIN ARTICLES SAVE ERROR:", err);
        setError(err?.response?.data?.error || "No se pudo guardar el articulo");
      } finally {
        saveInFlightRef.current = false;
        setSaving(false);
      }
    },
    [editArticle?.id, editArticle?.thumbnail_url, loadArticles, saving]
  );

  const deleteArticle = useCallback(
    async (article) => {
      if (!article?.id) return;

      const confirmed = window.confirm(
        "Este articulo se eliminara definitivamente. Quieres continuar?"
      );
      if (!confirmed) return;

      try {
        setSaving(true);
        setError("");
        setMessage("");

        const res = await api.delete(`/api/articles/${article.id}`);
        setMessage(res.data?.message || "Articulo eliminado correctamente");
        await loadArticles();
      } catch (err) {
        console.error("ADMIN ARTICLES DELETE ERROR:", err);
        setError(err?.response?.data?.error || "No se pudo eliminar el articulo");
      } finally {
        setSaving(false);
      }
    },
    [loadArticles]
  );

  const toggleArticleVisibility = useCallback(
    async (article) => {
      if (!article?.id || saving) return;

      try {
        setSaving(true);
        setError("");
        setMessage("");

        const payload = new FormData();
        payload.append("title", article.title || "");
        payload.append("slug", article.slug || "");
        payload.append("description", article.description || "");
        payload.append("published_at", article.published_at || "");
        payload.append("theme", article.theme || "historia_militar");
        payload.append("period_id", article.period_id || "");
        payload.append("subperiod_id", article.subperiod_id || "");
        payload.append("is_visible", article.is_visible ? "0" : "1");
        payload.append("content", article.content_html || "");
        payload.append("image_url", article.thumbnail_url || "");

        const res = await api.put(`/api/articles/${article.id}`, payload);
        const updatedArticle = res.data?.article;
        setArticles((current) =>
          current.map((item) =>
            item.id === article.id
              ? updatedArticle || { ...item, is_visible: !article.is_visible }
              : item
          )
        );
        setMessage(
          res.data?.message ||
            `Articulo ${article.is_visible ? "desactivado" : "activado"} correctamente`
        );
      } catch (err) {
        console.error("ADMIN ARTICLES VISIBILITY ERROR:", err);
        setError(err?.response?.data?.error || "No se pudo cambiar la visibilidad del articulo");
      } finally {
        setSaving(false);
      }
    },
    [loadArticles, saving]
  );

  const articleRows = useMemo(() => sortedArticles, [sortedArticles]);

  return (
    <section className="admin-content">
      <div className="admin-card admin-events-card admin-articles-card">
        <div className="admin-events-card-head">
          <div>
            <p className="admin-stat-label">Gestión de artículos</p>
            <p className="admin-events-card-copy">
              Crea, edita y elimina artículos editoriales. El contenido se guarda como HTML generado por el editor visual.
            </p>
          </div>

          <button
            type="button"
            className="admin-events-create-btn"
            onClick={() => setCreateOpen(true)}
          >
            + Nuevo artículo
          </button>
        </div>

        <div className="admin-events-list-toolbar">
          <p className="admin-events-list-count">
            {articleRows.length} artículo{articleRows.length === 1 ? "" : "s"}
          </p>

          <div className="admin-events-sort-wrap">
            <label className="admin-events-sort-label" htmlFor="articles-sort-order">
              Ordenar por
            </label>
            <select
              id="articles-sort-order"
              className="admin-events-sort-select"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="recent">Mas recientes</option>
              <option value="oldest">Mas antiguos</option>
            </select>
          </div>
        </div>

        {error ? <p className="admin-table-error">{error}</p> : null}
        {message ? <p className="admin-table-success">{message}</p> : null}

        <div className="admin-table-wrap">
          {loading ? (
            <p className="admin-table-loading">Cargando artículos...</p>
          ) : articleRows.length === 0 ? (
            <p className="admin-table-empty">No hay artículos para mostrar.</p>
          ) : (
            <table className="admin-users-table admin-events-table admin-articles-table">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Título</th>
                  <th>Fecha</th>
                  <th>Visible</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {articleRows.map((article) => {
                  const preview = resolveAdminAssetUrl(article.thumbnail_url);

                  return (
                    <tr key={article.id}>
                      <td>
                        {preview ? (
                          <img className="admin-banner-thumb" src={preview} alt={article.title} />
                        ) : (
                          <span className="admin-banner-thumb admin-banner-thumb-empty">
                            Sin imagen
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="admin-strong-cell">{article.title}</span>
                      </td>
                      <td>{formatDate(article.published_at)}</td>
                      <td>
                        <span className={`admin-banner-status ${article.is_visible ? "is-active" : "is-inactive"}`}>
                          {article.is_visible ? "Visible" : "No visible"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button
                            type="button"
                            className="admin-banner-action-btn"
                            onClick={() => setEditArticle(article)}
                            disabled={saving}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className={`admin-banner-action-btn${article.is_visible ? " danger" : ""}`}
                            onClick={() => toggleArticleVisibility(article)}
                            disabled={saving}
                          >
                            {article.is_visible ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            type="button"
                            className="admin-banner-action-btn danger"
                            onClick={() => deleteArticle(article)}
                            disabled={saving}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ArticleFormModal
        open={createOpen}
        article={null}
        periods={periods}
        periodsLoading={loadingMeta}
        onClose={closeModal}
        onSave={saveArticle}
        saving={saving}
      />

      <ArticleFormModal
        open={Boolean(editArticle)}
        article={editArticle}
        periods={periods}
        periodsLoading={loadingMeta}
        onClose={closeModal}
        onSave={saveArticle}
        saving={saving}
      />
    </section>
  );
}
