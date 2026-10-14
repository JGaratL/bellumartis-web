import { resolveAssetUrl } from "../../utils/assetHelpers";

export default function VideoCard({ video }) {
  const imageUrl = resolveAssetUrl(video.thumbnail_url);
  const isArticle = video.type === "articulo";
  const isPodcast = video.type === "podcast";

  return (
    <article
      className={`video-card ${isArticle ? "is-article" : ""} ${isPodcast ? "is-podcast" : ""}`}
    >
      <div className="video-thumb">
        <img
          src={imageUrl}
          alt={video.title}
          loading="lazy"
          decoding="async"
        />

        {isArticle ? (
          <div className="video-thumb-overlay">
            <span className="video-type-badge">Artículo</span>
            <h3 className="video-title">{video.title}</h3>
          </div>
        ) : null}
      </div>
    </article>
  );
}
