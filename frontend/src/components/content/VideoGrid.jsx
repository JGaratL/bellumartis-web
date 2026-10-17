import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_URL, apiFetch } from "../../api";
import { useFiltersStore } from "../../store/filtersStore";
import VideoCard from "./VideoCard";
import "./VideoGrid.css";
import VideoModal from "./VideoModal";

const PAGE_SIZE = 50;

export default function VideoGrid() {
  const [content, setContent] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const moreRequestRef = useRef(null);
  const filters = useFiltersStore((state) => state.filters);
  const search = useFiltersStore((state) => state.search);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));

    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, item));
      } else if (value) {
        params.set(key, value);
      }
    });

    return params.toString();
  }, [filters, debouncedSearch]);

  const fetchPage = useCallback(async (pageOffset, append, signal) => {
    setLoadingMore(append);
    setLoading(!append);
    setError("");

    try {
      const params = new URLSearchParams(queryString);
      params.set("offset", String(pageOffset));
      const response = await apiFetch(`${API_URL}/api/content?${params}`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `Error HTTP ${response.status}`);

      const items = Array.isArray(data?.items) ? data.items : [];
      setContent((current) => (append ? [...current, ...items] : items));
      setTotal(Number(data?.total) || 0);
      setHasMore(Boolean(data?.hasMore));
      setOffset(pageOffset + (Number(data?.limit) || PAGE_SIZE));
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        console.error("Error cargando contenido:", requestError);
        setError("No se pudo cargar el contenido. Inténtalo de nuevo.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [queryString]);

  useEffect(() => {
    const controller = new AbortController();
    moreRequestRef.current?.abort();
    setContent([]);
    setOffset(0);
    setTotal(0);
    setHasMore(false);
    fetchPage(0, false, controller.signal);

    return () => controller.abort();
  }, [fetchPage]);

  const loadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    moreRequestRef.current?.abort();
    const controller = new AbortController();
    moreRequestRef.current = controller;
    fetchPage(offset, true, controller.signal);
  };

  const openContent = async (item) => {
    setSelectedContent(item);
    if (item.type !== "articulo" || item.content_html) return;

    setSelectedContent({ ...item, detailLoading: true });
    try {
      const response = await apiFetch(`${API_URL}/api/content/${item.id}`);
      const detail = await response.json();
      if (!response.ok) throw new Error(detail?.error || `Error HTTP ${response.status}`);
      setSelectedContent((current) =>
        current?.id === item.id ? { ...current, ...detail, detailLoading: false } : current
      );
    } catch (detailError) {
      console.error("Error cargando artículo:", detailError);
      setSelectedContent((current) =>
        current?.id === item.id ? { ...current, detailLoading: false, detailError: true } : current
      );
    }
  };

  return (
    <>
      <div className="results-counter" aria-live="polite">
        {loading && content.length === 0
          ? "Cargando contenido…"
          : `Mostrando ${content.length} de ${total} ${total === 1 ? "resultado" : "resultados"}`}
      </div>

      {error && <p className="content-load-error" role="alert">{error}</p>}

      <div className="video-grid">
        {content.map((item) => (
          <button
            key={item.id}
            type="button"
            className="video-card-button"
            onClick={() => openContent(item)}
          >
            <VideoCard video={item} />
          </button>
        ))}
      </div>

      {!loading && !content.length && !error && (
        <p className="content-empty-state">No hay contenido que coincida con la búsqueda.</p>
      )}

      {hasMore && (
        <div className="video-grid-pagination">
          <button type="button" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Cargando…" : "Cargar más"}
          </button>
        </div>
      )}

      <VideoModal
        video={selectedContent}
        onClose={() => setSelectedContent(null)}
      />
    </>
  );
}
