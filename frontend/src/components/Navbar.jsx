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
  const lastScrollY = useRef(0);

  const navigate = useNavigate();
  const location = useLocation();

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
  SCROLL HIDE / SHOW
  ============================
  */
  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (Math.abs(delta) < 10) {
        return;
      }

      if (currentY <= 90) {
        setHidden(false);
      } else if (delta > 0) {
        setHidden(true);
        setOpen(false);
      } else {
        setHidden(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

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
        <img
          src="/BHM.webp"
          className="logo"
          alt="Logo BHM"
        />
      </div>

      {/* CENTRO */}
      <div className="navbar-links">
        <NavLink to="/">Home</NavLink>

        <NavLink to="/articles">
          Vídeos/Artículos
        </NavLink>

        <NavLink to="/shop">
          Tienda
        </NavLink>

        <NavLink to="/community">
          Comunidad
        </NavLink>

        <NavLink to="/events">
          Eventos
        </NavLink>

        <NavLink to="/about">
          Sobre Bellumartis
        </NavLink>

        {/* ADMIN */}
        {user && (isAdmin() || isOwner()) && (
          <NavLink to="/admin">
            Admin
          </NavLink>
        )}

        {/* MOD */}
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
        <div
          className="user"
          ref={userRef}
        >
          <FaUser
            className="icon"
            onClick={(e) => {
              e.stopPropagation();

              setOpen((prev) => !prev);
            }}
          />

          {open && (
            <div className="dropdown">

              {/* NO LOGUEADO */}
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
                  <p className="user-name">
                    {user.nickname}
                  </p>

                  <p
                    onClick={() =>
                      goTo("/profile")
                    }
                  >
                    Mi perfil
                  </p>

                  <p
                    onClick={() =>
                      goTo("/settings")
                    }
                  >
                    Ajustes
                  </p>

                  {/* ROLES */}
                  {isAdmin() && (
                    <p className="role">
                      Admin
                    </p>
                  )}

                  {isOwner() && (
                    <p className="role">
                      Owner
                    </p>
                  )}

                  {isModerator() && (
                    <p className="role">
                      Moderator
                    </p>
                  )}

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

        <img
          src="/BAM.png"
          className="logo-extra"
          alt="Logo BellumArtis"
        />
      </div>
    </nav>
  );
}

export default Navbar;
