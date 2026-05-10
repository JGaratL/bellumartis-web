import { useState, useRef, useEffect } from "react";
import "./Navbar.css";

import { Link } from "react-router-dom";
import { FaBell, FaSearch } from "react-icons/fa";
import { FaUser } from "react-icons/fa6";

function Navbar() {
  const [user] = useState(null);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const userRef = useRef(null);
  const lastScrollY = useRef(0);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (userRef.current && !userRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Ocultar al bajar y mostrar al subir con un umbral pequeno
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

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav className={`navbar ${hidden ? "hide" : ""}`}>
      {/* IZQUIERDA */}
      <div className="navbar-left">
        <img src="/BHM.webp" className="logo" alt="Logo BHM" />
      </div>

      {/* CENTRO */}
      <div className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/articles">Vídeos/Artículos</Link>
        <Link to="/shop">Tienda</Link>
        <Link to="/community">Comunidad</Link>
        <Link to="/events">Eventos</Link>
        <Link to="/about">Sobre BellumArtis</Link>
      </div>

      {/* DERECHA */}
      <div className="navbar-right">
        <FaSearch className="icon" />
        <FaBell className="icon" />

        {/* USER */}
        <div className="user" ref={userRef}>
          <FaUser
            className="icon"
            onClick={() => setOpen((prev) => !prev)}
          />

          {open && (
            <div className="dropdown">
              {!user ? (
                <>
                  <p>Iniciar sesion</p>
                  <p>Registrarse</p>
                </>
              ) : (
                <>
                  <p>Mi perfil</p>
                  <p>Ajustes</p>
                  <p>Cerrar sesion</p>
                </>
              )}
            </div>
          )}
        </div>

        <img src="/BAM.png" className="logo-extra" alt="Logo BellumArtis" />
      </div>
    </nav>
  );
}

export default Navbar;
