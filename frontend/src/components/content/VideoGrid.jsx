import { useEffect, useMemo, useState } from "react";
import { useFiltersStore } from "../../store/filtersStore";
import { filterVideos } from "../../utils/filterEngine";
import VideoCard from "./VideoCard";
import "./VideoGrid.css";
import VideoModal from "./VideoModal";

export default function VideoGrid() {
  const [content, setContent] = useState([]);
  const filters = useFiltersStore((s) => s.filters);
  const search = useFiltersStore((s) => s.search);
  const [selectedContent, setSelectedContent] = useState(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        const response = await fetch("http://localhost:5000/api/content");

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody?.error || `Error HTTP ${response.status}`);
        }

        const data = await response.json();
        setContent(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error cargando contenido:", error);
        setContent([]);
      }
    }

    fetchContent();
  }, []);

  const filtered = useMemo(
    () => filterVideos(Array.isArray(content) ? content : [], filters, search),
    [content, filters, search]
  );

  return (
    <>
      <div className="results-counter" aria-live="polite">
        Mostrando {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
      </div>

      <div className="video-grid">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            className="video-card-button"
            onClick={() => setSelectedContent(item)}
          >
            <VideoCard video={item} />
          </button>
        ))}
      </div>

      <VideoModal
        video={selectedContent}
        onClose={() => setSelectedContent(null)}
      />
    </>
  );
}
