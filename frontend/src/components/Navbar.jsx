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

function Navbar() {
  const { user, logout, isAdmin, isOwner, isModerator } =
    useContext(AuthContext);

  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const userRef = useRef(null);

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

  /*
  ============================
  CLICK OUTSIDE DROPDOWN
  ============================
  */
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

  /*
  ============================
  SCROLL HIDE / SHOW (FIXED)
  ============================
  */
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

  /*
  ============================
  NAVIGATION
  ============================
  */
  const goTo = (path) => {
    setOpen(false);
    navigate(path);
  };

  /*
  ============================
  LOGOUT
  ============================
  */
  const handleLogout = () => {
    logout();

    setOpen(false);

    navigate("/");
  };

  return (
    <nav className={`navbar ${hidden ? "hide" : ""}`}>

      {/* IZQUIERDA */}
      <div className="navbar-left">
        <NavLink to="/">
          <img
            src="/BHM.webp"
            className="logo"
            alt="Logo BHM"
          />
        </NavLink>
      </div>

      {/* CENTRO */}
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

      {/* DERECHA */}
      <div className="navbar-right">

        <FaSearch className="icon" />

        <FaBell className="icon" />

        {/* USER */}
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
