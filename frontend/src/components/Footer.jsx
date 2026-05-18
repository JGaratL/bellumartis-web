import "./Footer.css";

import {
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

function Footer() {
  return (
    <>
      <footer className="footer">
        <div className="footer-container">

          {/* PARTE 1 */}
          <div className="footer-column footer-logo-column">
            <img src="/escudo.png" alt="BellumArtis" className="footer-logo" />
          </div>

          {/* PARTE 2 */}
          <div className="footer-column">
            <h3 className="footer-title">Enlaces de interés</h3>

            <div className="footer-links">
              <a href="#">Aviso legal</a>
              <a href="#">Política de cookies</a>
              <a href="#">Política de privacidad</a>
              <a href="#">Condiciones de uso</a>
            </div>
          </div>

          {/* PARTE 3 */}
          <div className="footer-column">
            <h3 className="footer-title">Contacto</h3>

            <div className="footer-contact">
              <p>© 2026 Bellumartis.</p>
              <p>Todos los derechos reservados.</p>
            </div>
          </div>

          {/* PARTE 4 */}
          <div className="footer-column footer-social-column">
            <img src="/bellumartisLogo.png" alt="BellumArtis" className="footer-logo-right" />

            <div className="footer-socials">
              <a href="#" aria-label="X">
                <FaXTwitter />
              </a>

              <a href="#" aria-label="Facebook">
                <FaFacebookF />
              </a>

              <a href="#" aria-label="YouTube">
                <FaYoutube />
              </a>

              <a href="#" aria-label="Instagram">
                <FaInstagram />
              </a>
            </div>
          </div>

        </div>
      </footer>

      {/* 👇 FRANJA NEGRA (FUERA DEL FOOTER, CORRECTO) */}
      <div className="footer-bottom">
        <div className="footer-bottom-left">@unsitiogenial</div>
        <div className="footer-bottom-right">
          Copyright by Cani Garat. All rights reserved.
        </div>
      </div>
    </>
  );
}

export default Footer;