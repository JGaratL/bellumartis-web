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

          {/* COLUMN 1 */}
          <div className="footer-col footer-col--brand">

            <div className="footer-col__top footer-col__top--left">
              <img
                src="/bellumartisLogo.png"
                alt="BellumArtis"
                className="footer-logo"
              />
            </div>

            <div className="footer-col__bottom footer-col__location">
              <img src="/asturias.webp" alt="Asturias" className="footer-flag" />
              <img src="/espana.webp" alt="España" className="footer-flag" />

              <div className="footer-location-text">
                <strong>Oviedo, Asturias</strong>
              </div>
            </div>

          </div>

          {/* COLUMN 2 */}
          <div className="footer-col footer-col--links">

            <div className="footer-links">
              <a href="#">Política de privacidad</a>
              <a href="#">Aviso legal</a>
              <a href="#">Política de cookies</a>
              <a href="#">Condiciones de uso</a>
            </div>

          </div>

          {/* COLUMN 3 */}
          <div className="footer-col footer-col--legal">

            <div>©2026. Francisco García Campa.</div>
            <div>Todos los derechos reservados.</div>
            <div><strong>E-mail:</strong></div>
            <div>info@bellumartis.com</div>

          </div>

          {/* COLUMN 4 */}
          <div className="footer-col footer-col--social">

            <div className="footer-col__top footer-col__top--right">
              <img
                src="/escudo.png"
                alt="BellumArtis"
                className="footer-logo-right"
              />
            </div>

            <div className="footer-col__bottom footer-socials">

              <a href="https://youtube.com/@BELLUMARTISHISTORIAMILITAR" target="_blank" rel="noopener noreferrer">
                <FaYoutube />
              </a>

              <a href="https://x.com/bellumartis" target="_blank" rel="noopener noreferrer">
                <FaXTwitter />
              </a>

              <a href="https://www.facebook.com/bellumartishistoriamilitar/" target="_blank" rel="noopener noreferrer">
                <FaFacebookF />
              </a>

              <a href="https://www.instagram.com/bellumartis_historia_militar/" target="_blank" rel="noopener noreferrer">
                <FaInstagram />
              </a>

            </div>

          </div>

        </div>
      </footer>

      <div className="footer-bottom">
        <div className="footer-bottom__left">@unsitiogenial</div>
        <div className="footer-bottom__right">
          Copyright by Cani Garat. All rights reserved.
        </div>
      </div>
    </>
  );
}

export default Footer;