import { apiFetch } from "../api";
﻿import { useState, useRef, useEffect, useContext } from "react";

import { MdLogout } from "react-icons/md";
import { VscSettingsGear } from "react-icons/vsc";
import { CgProfile } from "react-icons/cg";
import { FiUserPlus } from "react-icons/fi";
import { MdLogin } from "react-icons/md";
import { RiAdminLine } from "react-icons/ri";

import "./Navbar.css";

import {
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { FaBell, FaSearch } from "react-icons/fa";
import { FaUser } from "react-icons/fa6";
import { FiMenu, FiX } from "react-icons/fi";

import { AuthContext } from "../context/AuthContext";
import { useFiltersStore } from "../store/filtersStore";

const formatRelativeTime = (value) => {
  if (!value) return "";

  const now = new Date();
  const then = new Date(value);
  const diffMs = now - then;

  if (diffMs < 0) return "0 min";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} min`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} h`;
  if (diffMs < month) return `${Math.floor(diffMs / day)} días`;
  if (diffMs < year) return `${Math.floor(diffMs / month)} meses`;

  const years = Math.floor(diffMs / year);
  return years === 1 ? "1 año" : `${years} años`;
};

const resolveAvatarSrc = (value) => {
  if (!value || typeof value !== "string") return null;
  const avatar = value.trim();
  if (!avatar) return null;

  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }

  if (avatar.startsWith("/uploads/")) {
    return `http://localhost:5000${avatar}`;
  }

  if (avatar.startsWith("uploads/")) {
    return `http://localhost:5000/${avatar}`;
  }

  return avatar;
};

function Navbar() {
  const { user, logout, isAdmin, isOwner, isModerator } =
    useContext(AuthContext);

  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => useFiltersStore.getState().search || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const userRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const setContentSearch = useFiltersStore((state) => state.setSearch);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    searchInputRef.current?.focus();

    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setSearchOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const timer = window.setTimeout(() => setSearchTerm(searchQuery.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    if (!searchOpen || searchTerm.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError("");

    apiFetch(`http://localhost:5000/api/search?q=${encodeURIComponent(searchTerm)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "No se pudo realizar la búsqueda");

        const normalizedTerm = searchTerm.toLocaleLowerCase("es");
        const books = ["Guerras Convulsas", "Un Mundo Convulso", "La Frontera Norte", "Cayo Mario"]
          .filter((title) => title.toLocaleLowerCase("es").includes(normalizedTerm))
          .map((title) => ({ kind: "book", id: title, title, snippet: "Libro · Tienda Bellumartis" }));
        setSearchResults([...(data.results || []), ...books]);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setSearchError(error.message || "No se pudo realizar la búsqueda");
          setSearchResults([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearchLoading(false);
      });

    return () => controller.abort();
  }, [searchOpen, searchTerm]);

  useEffect(() => {
    const setScrollbarOffset = () => {
      const container = document.querySelector(".app");
      const scrollBarWidth = container
        ? Math.max(0, container.offsetWidth - container.clientWidth)
        : 0;
      document.documentElement.style.setProperty(
        "--app-scrollbar-width",
        `${scrollBarWidth}px`
      );
    };

    setScrollbarOffset();
    window.addEventListener("resize", setScrollbarOffset);

    return () => {
      window.removeEventListener("resize", setScrollbarOffset);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        userRef.current &&
        !userRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  useEffect(() => {
    const container = document.querySelector(".app") || window;
    const readY = () =>
      container === window ? window.scrollY : container.scrollTop;

    let lastY = readY();
    let ticking = false;

    const applyDirection = () => {
      const currentY = readY();
      const delta = currentY - lastY;

      if (currentY <= 0) {
        setHidden(false);
        lastY = currentY;
        ticking = false;
        return;
      }

      if (Math.abs(delta) >= 4) {
        if (delta > 0) {
          setHidden(true);
          setOpen(false);
        } else {
          setHidden(false);
        }
        lastY = currentY;
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(applyDirection);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", onScroll);
    };
  }, [location.pathname]);

  const fetchNotifCount = async () => {
    try {

      if (!user) {
        setNotifCount(0);
        return;
      }

      const res = await apiFetch(
        "http://localhost:5000/api/notifications/count",
        {
          }
      );

      const data = await res.json();
      setNotifCount(Number(data.count) || 0);

    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {

      if (!user) {
        setNotifications([]);
        setNotifCount(0);
        return;
      }

      const res = await apiFetch(
        "http://localhost:5000/api/notifications?limit=20",
        {
          }
      );

      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
      await fetchNotifCount();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifCount(0);
      setNotifications([]);
      setNotifOpen(false);
      return;
    }

    fetchNotifCount();
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setNotifCount(0);
      setNotifications([]);
      setNotifOpen(false);
      return;
    }

    if (notifOpen) {
      fetchNotifications();
    }
  }, [notifOpen, user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target)
      ) {
        setNotifOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const goTo = (path) => {
    setOpen(false);
    navigate(path);
  };

  const submitGlobalSearch = (event) => {
    event.preventDefault();
    setSearchTerm(searchQuery.trim());
  };

  const openSearchResult = (result) => {
    setSearchOpen(false);
    setMobileMenuOpen(false);
    if (result.kind === "post") {
      navigate(`/community?post=${result.id}`);
    } else if (result.kind === "event") {
      navigate("/events", { state: { openEventId: result.id } });
    } else if (result.kind === "book") {
      navigate("/shop", { state: { openBookTitle: result.title } });
    } else {
      setContentSearch(result.title);
      navigate(`/articles?search=${encodeURIComponent(result.title)}`);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (user && notification?.id && !notification.is_read) {
        await apiFetch(`http://localhost:5000/api/notifications/${notification.id}/read`, {
          method: "PUT",
          });
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, is_read: 1 }
            : n
        )
      );

      setNotifCount((prev) => Math.max(0, prev - (notification.is_read ? 0 : 1)));
      setNotifOpen(false);

      const postId = notification.post_id;
      const replyId = notification.reply_id;
      const qs = new URLSearchParams();

      if (postId) qs.set("post", postId);
      if (replyId) qs.set("reply", replyId);

      navigate(`/community?${qs.toString()}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setNotifCount(0);
    setNotifications([]);
    setNotifOpen(false);

    logout();

    setOpen(false);

    navigate("/");
  };

  return (
    <nav className={`navbar ${hidden ? "hide" : ""} ${mobileMenuOpen ? "mobile-menu-open" : ""}`}>

      <div className="navbar-left">
        <NavLink to="/">
          <img
            src="/BHM.webp"
            className="logo"
            alt="Logo BHM"
          />
        </NavLink>
      </div>

      <div className="navbar-links" id="primary-navigation">
        <NavLink to="/" onClick={() => setMobileMenuOpen(false)}>HOME</NavLink>

        <NavLink to="/articles" onClick={() => setMobileMenuOpen(false)}>
          VÍDEOS/ARTÍCULOS
        </NavLink>

        <NavLink to="/shop" onClick={() => setMobileMenuOpen(false)}>
          TIENDA
        </NavLink>

        <NavLink to="/community" onClick={() => setMobileMenuOpen(false)}>
          COMUNIDAD
        </NavLink>

        <NavLink to="/events" onClick={() => setMobileMenuOpen(false)}>
          EVENTOS
        </NavLink>

        <NavLink to="/about" onClick={() => setMobileMenuOpen(false)}>
          CONTACTO
        </NavLink>

        {user && isModerator() && (
          <NavLink to="/moderation" onClick={() => setMobileMenuOpen(false)}>
            Moderación
          </NavLink>
        )}
      </div>

      <div className="navbar-right">

        <div className="navbar-search" ref={searchRef}>
          <button
            type="button"
            className="navbar-search-trigger"
            aria-label="Abrir búsqueda"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((current) => !current)}
          >
            <FaSearch className="icon" />
          </button>

          {searchOpen && (
            <form className="navbar-search-panel" onSubmit={submitGlobalSearch}>
              <label htmlFor="navbar-content-search">Buscar en Bellumartis</label>
              <div className="navbar-search-form-row">
                <input
                  id="navbar-content-search"
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Vídeos, artículos, posts, eventos, libros…"
                />
                <button type="submit">Buscar</button>
              </div>
              {searchQuery.trim().length < 2 ? (
                <p className="navbar-search-hint">Escribe al menos 2 caracteres.</p>
              ) : searchQuery.trim() !== searchTerm ? (
                <p className="navbar-search-hint">Buscando…</p>
              ) : searchLoading ? (
                <p className="navbar-search-hint">Buscando…</p>
              ) : searchError ? (
                <p className="navbar-search-error">{searchError}</p>
              ) : searchResults.length ? (
                <div className="navbar-search-results" role="listbox" aria-label="Resultados de búsqueda">
                  {searchResults.map((result) => (
                    <button
                      type="button"
                      className="navbar-search-result"
                      key={`${result.kind}-${result.id}`}
                      onClick={() => openSearchResult(result)}
                    >
                      <span className="navbar-search-result-kind">
                        {result.kind === "article" ? "Artículo" :
                          result.kind === "video" ? "Vídeo" :
                            result.kind === "podcast" ? "Pódcast" :
                            result.kind === "post" ? "Comunidad" :
                              result.kind === "event" ? "Evento" : "Libro"}
                      </span>
                      <span className="navbar-search-result-title">{result.title}</span>
                      {result.snippet && <span className="navbar-search-result-snippet">{result.snippet}</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="navbar-search-hint">No se encontraron resultados.</p>
              )}
            </form>
          )}
        </div>

        <div className="notif-wrapper" ref={notifRef}>
          <div
            className="notif-trigger"
            onClick={() => setNotifOpen((prev) => !prev)}
          >
            <FaBell className="icon" />

            {notifCount > 0 && (
              <span className="notif-badge">{notifCount}</span>
            )}
          </div>

          {notifOpen && (
            <div className="notif-panel">
              {notifications.length === 0 ? (
                <p className="notif-empty">Sin notificaciones</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notif-item ${n.is_read ? "read" : ""}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <img
                      src={resolveAvatarSrc(n.from_avatar) || "/BHM.webp"}
                      alt={n.from_nickname || "usuario"}
                      className="notif-avatar"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/BHM.webp";
                      }}
                    />

                    <div className="notif-content">
                      <p>
                        <strong>{n.from_nickname || "Sin nickname"}</strong>{" "}
                        {n.type === "reply_post" && "respondió a tu post"}
                        {n.type === "like_post" && "dio like a tu post"}
                        {n.type === "like_reply" && "dio like a tu respuesta"}
                      </p>

                      {n.type === "reply_post" && n.reply_content && (
                        <p className="notif-snippet">
                          "{n.reply_content.length > 90
                            ? `${n.reply_content.slice(0, 90)}...`
                            : n.reply_content}"
                        </p>
                      )}
                      <p className="notif-snippet">{formatRelativeTime(n.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="user" ref={userRef}>
          <FaUser
            className="icon"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
          />

          {open && (
            <div className="dropdown">

              {!user ? (
                <>
                  <p
                    className={location.pathname === "/login" ? "active" : ""}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goTo("/login")}
                  >
                    <MdLogin className="dropdown-icon" />
                    Iniciar sesión
                  </p>

                  <p
                    className={location.pathname === "/register" ? "active" : ""}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => goTo("/register")}
                  >
                    <FiUserPlus className="dropdown-icon" />
                    Registrarse
                  </p>
                </>
              ) : (
                <>

                  {isAdmin() && <p className="role">-Administrador-</p>}
                  {isOwner() && <p className="role">-Owner-</p>}
                  {isModerator() && <p className="role">-Moderador-</p>}

                  <p onClick={() => goTo("/profile")}>
                    <CgProfile className="dropdown-icon" />
                    Mi perfil
                  </p>

                  <p onClick={() => goTo("/settings")}>
                    <VscSettingsGear className="dropdown-icon" />
                    Ajustes
                  </p>

                  {(isAdmin() || isOwner()) && (
                    <p onClick={() => goTo("/admin")}>
                      <RiAdminLine className="dropdown-icon" />
                      Dashboard
                    </p>
                  )}

                  <p onClick={handleLogout} className="logout">
                    <MdLogout className="dropdown-icon" />
                    Cerrar sesión
                  </p>
                </>
              )}

            </div>
          )}
        </div>

        <NavLink to="/">
          <img
            src="/BAM.png"
            className="logo-extra"
            alt="Logo BellumArtis"
          />
        </NavLink>
      </div>

      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={mobileMenuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMobileMenuOpen((previous) => !previous)}
      >
        {mobileMenuOpen ? <FiX /> : <FiMenu />}
      </button>
    </nav>
  );
}

export default Navbar;
