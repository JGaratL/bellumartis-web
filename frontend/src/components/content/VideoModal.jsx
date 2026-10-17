import { resolveAssetUrl } from "../../utils/assetHelpers";
import { rewriteContentHtmlAssetUrls } from "../../utils/contentHtmlHelpers";
import { sanitizeArticleHtml } from "../../utils/htmlSanitizers";
import "./VideoModal.css";

function formatDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-ES");
}

function normalizeHtml(value) {
  return String(value || "").trim();
}

function normalizeImageUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value, window.location.href);
    let pathname = decodeURIComponent(url.pathname).replace(/\\/g, "/");

    // Blogger puede servir la misma imagen con distintos tamaños en la ruta.
    pathname = pathname.replace(
      /\/(?:s\d+(?:-c)?|w\d+-h\d+(?:-[a-z0-9-]+)?)(?=\/)/gi,
      ""
    );
    pathname = pathname.replace(/\/+$/, "") || "/";

    return `${url.hostname.toLowerCase().replace(/^www\./, "")}${pathname}`;
  } catch {
    return String(value).trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}

function removeRepeatedThumbnail(html, thumbnailUrl) {
  if (!html || !thumbnailUrl || typeof DOMParser === "undefined") return html;

  const document = new DOMParser().parseFromString(html, "text/html");
  const firstImage = document.querySelector("img");

  if (
    !firstImage ||
    normalizeImageUrl(firstImage.getAttribute("src")) !== normalizeImageUrl(thumbnailUrl)
  ) {
    return html;
  }

  const parent = firstImage.parentElement;
  firstImage.remove();

  if (
    parent?.tagName === "P" &&
    !parent.textContent.trim() &&
    parent.children.length === 0
  ) {
    parent.remove();
  }

  return document.body.innerHTML;
}

export default function VideoModal({ video, onClose }) {
  if (!video) return null;

  const isArticle = video.type === "articulo";
  const formattedDate = formatDate(video.published_at);
  const imageUrl = resolveAssetUrl(video.thumbnail_url);
  const contentHtml = rewriteContentHtmlAssetUrls(normalizeHtml(video.content_html));
  const safeArticleHtml = isArticle ? sanitizeArticleHtml(contentHtml) : contentHtml;
  const articleHtml = isArticle
    ? removeRepeatedThumbnail(safeArticleHtml, imageUrl || video.thumbnail_url)
    : contentHtml;

  console.log("thumbnail_url:", video.thumbnail_url);
  console.log("imageUrl:", imageUrl);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`video-modal content-modal ${isArticle ? "article-reading-modal" : ""}`} onClick={(e) => e.stopPropagation()}>
      

        <div className="modal-body">
          <header className="modal-header">
            <h2 className="modal-title">{video.title}</h2>

            <div className="modal-meta">
              <span>{formattedDate}</span>
              {video.period ? <span>{video.period}</span> : null}
              {video.subperiod ? <span>{video.subperiod}</span> : null}
            </div>
          </header>

          {imageUrl ? (
            <div className="modal-image-wrap">
              <img className="modal-image" src={imageUrl} alt={video.title} />
            </div>
          ) : null}

          {isArticle ? (
            video.detailLoading ? (
              <p className="modal-content-loading">Cargando artículo…</p>
            ) : video.detailError ? (
              <p className="modal-content-error">No se pudo cargar el artículo. Cierra el modal e inténtalo de nuevo.</p>
            ) : (
              <div
                className="modal-article-content content-html"
                dangerouslySetInnerHTML={{ __html: articleHtml || "<p>Sin contenido</p>" }}
              />
            )
          ) : (
            <div className="modal-description">
              {video.description || "Sin descripcion"}
            </div>
          )}
        </div>

        <div className="modal-buttons">
          {!isArticle && video.source_url ? (
            <a
              href={video.source_url}
              target="_blank"
              rel="noreferrer"
              className="youtube-btn"
            >
              Ver en YouTube
            </a>
          ) : (
            <span />
          )}

          <button onClick={onClose} className="close-btn" type="button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
