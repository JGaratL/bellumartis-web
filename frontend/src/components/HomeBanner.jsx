import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";

const DISMISSED_BANNER_KEY = "home-banner-dismissed-id";

function resolveAssetUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  if (value.startsWith("/")) {
    return `${baseUrl}${value}`;
  }

  return `${baseUrl}/${value.replace(/^\/+/, "")}`;
}

export default function HomeBanner({ user }) {
  const navigate = useNavigate();
  const [banner, setBanner] = useState(null);
  const [dismissedBannerId, setDismissedBannerId] = useState(() => {
    const dismissedId = window.localStorage.getItem(DISMISSED_BANNER_KEY);
    return dismissedId ? Number(dismissedId) : null;
  });

  useEffect(() => {
    let alive = true;

    const loadBanner = async () => {
      try {
        const res = await api.get("/banners/current");
        if (!alive) return;
        setBanner(res.data?.banner || null);
      } catch (err) {
        if (!alive) return;
        setBanner(null);
      }
    };

    loadBanner();

    return () => {
      alive = false;
    };
  }, [user?.id, user?.province]);

  if (!banner || banner.id === dismissedBannerId) return null;

  const closeBanner = () => {
    setDismissedBannerId(banner.id);
    window.localStorage.setItem(DISMISSED_BANNER_KEY, String(banner.id));
  };

  const imageUrl = resolveAssetUrl(banner.image_url);
  const title = banner.title || "Banner";
  const description = banner.description || "";
  const bannerTypeLabel =
    banner.banner_type === "book_promotion"
      ? "Promocion"
      : banner.banner_type === "sorteo"
        ? "Sorteo"
        : "Evento";

  const goToEvents = () => {
    navigate("/events", {
      state: banner.event_id ? { openEventId: banner.event_id } : undefined,
    });
  };

  const content = (
    <>
      <div className="home-banner-copy">
        <p className="home-banner-kicker">{bannerTypeLabel}</p>
        <h2 className="home-banner-title">{title}</h2>
        {description && (
          <p className="home-banner-description">{description}</p>
        )}
        {banner.event_id && (
          <button
            type="button"
            className="home-banner-cta"
            onClick={goToEvents}
          >
            Apúntate Aquí 
          </button>
        )}
      </div>

      {imageUrl && <img className="home-banner-image" src={imageUrl} alt={title} />}
    </>
  );

  const bannerCard = banner.event_id ? (
    <div className="home-banner-body home-banner-body-event">
      {content}
    </div>
  ) : banner.link ? (
    <a
      className="home-banner-body"
      href={banner.link}
      target={/^https?:\/\//i.test(banner.link) ? "_blank" : undefined}
      rel={/^https?:\/\//i.test(banner.link) ? "noreferrer noopener" : undefined}
    >
      {content}
    </a>
  ) : (
    <div className="home-banner-body">{content}</div>
  );

  return (
    <div className="home-banner-wrap">
      <button
        type="button"
        className="home-banner-close"
        aria-label="Cerrar banner"
        onClick={closeBanner}
      >
        X
      </button>
      {bannerCard}
    </div>
  );
}
