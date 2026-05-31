import "./VideoModal.css";

export default function VideoModal({
  video,
  onClose,
}) {
  if (!video) return null;

  const formattedDate =
    new Date(video.published_at)
      .toLocaleDateString("es-ES");

  const duration =
    video.duration_seconds
      ? Math.floor(video.duration_seconds / 60) +
        " min"
      : "Desconocida";

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="video-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">
          {video.title}
        </h2>

        <div className="modal-meta">
          <span>
            📅 {formattedDate}
          </span>

          <span>
            ⏱ {duration}
          </span>
        </div>

        <p className="modal-description">
          {video.description ||
            "Sin descripción"}
        </p>

        <div className="modal-buttons">
          <a
            href={video.source_url}
            target="_blank"
            rel="noreferrer"
            className="youtube-btn"
          >
            Ver en YouTube
          </a>

          <button
            onClick={onClose}
            className="close-btn"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}