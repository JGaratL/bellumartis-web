import { useState, useRef, useEffect, useContext } from "react";
import "./Navbar.css";

import {
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { FaBell, FaSearch } from "react-icons/fa";
import { FaUser } from "react-icons/fa6";

import { AuthContext } from "../context/AuthContext";

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

function Navbar() {
  const { user, logout, isAdmin, isOwner, isModerator } =
    useContext(AuthContext);

  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const userRef = useRef(null);
  const notifRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

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
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(
        "http://localhost:5000/api/notifications/count",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();
      setNotifCount(data.count || 0);

    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(
        "http://localhost:5000/api/notifications?limit=20",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifCount();
  }, []);

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

  const handleNotificationClick = async (notification) => {
    try {
      const token = localStorage.getItem("token");

      if (token && notification?.id && !notification.is_read) {
        await fetch(`http://localhost:5000/api/notifications/${notification.id}/read`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          }
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
    <nav className={`navbar ${hidden ? "hide" : ""}`}>

      <div className="navbar-left">
        <NavLink to="/">
          <img
            src="/BHM.webp"
            className="logo"
            alt="Logo BHM"
          />
        </NavLink>
      </div>

      <div className="navbar-links">
        <NavLink to="/">HOME</NavLink>

        <NavLink to="/articles">
          VÍDEOS/ARTÍCULOS
        </NavLink>

        <NavLink to="/shop">
          TIENDA
        </NavLink>

        <NavLink to="/community">
          COMUNIDAD
        </NavLink>

        <NavLink to="/events">
          EVENTOS
        </NavLink>

        <NavLink to="/about">
          CONTACTO
        </NavLink>

        {user && (isAdmin() || isOwner()) && (
          <NavLink to="/admin">
            Admin
          </NavLink>
        )}

        {user && isModerator() && (
          <NavLink to="/moderation">
            Moderación
          </NavLink>
        )}
      </div>

      <div className="navbar-right">

        <FaSearch className="icon" />

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
                      src={n.from_avatar || "/default-avatar.png"}
                      alt={n.from_nickname || "usuario"}
                      className="notif-avatar"
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
                    className={
                      location.pathname === "/login"
                        ? "active"
                        : ""
                    }
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() => goTo("/login")}
                  >
                    Iniciar sesión
                  </p>

                  <p
                    className={
                      location.pathname === "/register"
                        ? "active"
                        : ""
                    }
                    onMouseDown={(e) =>
                      e.preventDefault()
                    }
                    onClick={() => goTo("/register")}
                  >
                    Registrarse
                  </p>
                </>
              ) : (
                <>

                  <p onClick={() => goTo("/profile")}>
                    Mi perfil
                  </p>

                  <p onClick={() => goTo("/settings")}>
                    Ajustes
                  </p>

                  {isAdmin() && <p className="role">Admin</p>}
                  {isOwner() && <p className="role">Owner</p>}
                  {isModerator() && <p className="role">Moderator</p>}

                  <p
                    onClick={handleLogout}
                    className="logout"
                  >
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
    </nav>
  );
}

export default Navbar;
