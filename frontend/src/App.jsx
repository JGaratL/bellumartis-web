import { Routes, Route, useLocation, NavLink } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useContext, useEffect, useRef } from "react";

import Articles from "./pages/Articles";
import Shop from "./pages/Shop";
import Community from "./pages/Community";
import Events from "./pages/Events";
import About from "./pages/About";
import MyProfile from "./pages/MyProfile";
import Settings from "./pages/Settings";
import PrivacyPolicy from "./pages/Legal/PrivacyPolicy";
import LegalNotice from "./pages/Legal/LegalNotice";

import Cookies from "./pages/Legal/Cookies";
import Terms from "./pages/Legal/Terms";

import ScrollToTop from "./components/common/ScrollToTop";

import "./styles/legal.css";

import AuthPage from "./pages/Auth/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

import {
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

function App() {
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const aboutRef = useRef(null);
  const appRef = useRef(null);

  const hideLayout = ["/login", "/register"].includes(location.pathname);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const sections = document.querySelectorAll(".section");

    sections.forEach((section) => section.classList.remove("is-active"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-active");
          }
        });
      },
      {
        threshold: 0.05,
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <div className="app" ref={appRef}>
      {!hideLayout && <Navbar />}

      <ScrollToTop />


      <Routes>

        {/* HOME (TU ORIGINAL SIN TOCAR) */}
        <Route
          path="/"
          element={
            <>
              <section className="home section" data-section="hero">
                <div className="hero-content">
                  <div className="hero-copy">
                    <h1 className="title">BellumArtis</h1>
                    <p className="subtitle">Historia y Actualidad Militar</p>
                  </div>

                  {!user && (
                    <div className="cta">
                      <NavLink to="/register">
                        <button>Regístrate</button>
                      </NavLink>
                    </div>
                  )}
                </div>
              </section>

              <section
                ref={aboutRef}
                className="about-section section"
                data-section="about"
              >
                <div className="about-container">
                  <div className="about-left">
                    <h2 className="about-title">
                      <span>Francisco</span>
                      <span>García Campa</span>
                    </h2>

                    <div className="about-line"></div>

                    <p className="about-text">
                      Soy un viajero en el tiempo hambriento de conocimientos. Mi pasión
                      por la historia militar me llevó a crear un proyecto de divulgación
                      en YouTube y otras plataformas.
                    </p>

                    <img
                      src="/firma.png"
                      alt="Firma"
                      className="signature"
                    />

                    <div className="social-icons">
                      <a href="https://x.com/bellumartis" target="_blank" rel="noopener noreferrer"><FaXTwitter /></a>
                      <a href="https://www.facebook.com/bellumartishistoriamilitar/" target="_blank" rel="noopener noreferrer"><FaFacebookF /></a>
                      <a href="https://youtube.com/@BELLUMARTISHISTORIAMILITAR" target="_blank" rel="noopener noreferrer"><FaYoutube /></a>
                      <a href="https://www.instagram.com/bellumartis_historia_militar/" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
                    </div>
                  </div>

                  <div className="about-right">
                    <img src="/Campa.webp" alt="Francisco García Campa" />
                  </div>
                </div>
              </section>

              {/* ===================== SECTION 1 ===================== */}
              <section className="journey-section section" data-section="journey-1">
                <div className="journey-container">

                  {/* HERO 1 */}
                  <div className="journey-hero">
                    <div className="journey-hero-left">
                      <img src="/vectorStar.svg" className="journey-svg" aria-hidden="true" />
                    </div>

                    <div className="journey-hero-right">
                      <div className="journey-hero-line"></div>

                      <h2 className="journey-title">
                        <span>De abogado a divulgador</span>
                        <span>histórico militar</span>
                      </h2>
                    </div>
                  </div>

                  {/* TEXTO 1 */}
                  <div className="journey-copy">
                    <p>
                      Soy un ovetense apasionado por la <strong>Historia</strong>, especialmente la <strong>Historia Militar</strong>, que ha marcado mi forma de entender el pasado y el presente.
                    </p>

                    <p>
                      Aunque mi vocación inicial me llevó a las <strong>Ciencias Jurídicas</strong>, me licencié en Derecho y me diplomé en Relaciones Laborales por la Universidad de Oviedo.
                    </p>

                    <p>
                      He desarrollado mi carrera profesional en el ámbito de la <strong>docencia</strong>, como profesor de Formación y Orientación Laboral.
                    </p>

                    <p>
                      Con el tiempo me gradué en <strong>Geografía e Historia por la UNED</strong>, dedicándome a la divulgación histórico-militar.
                    </p>
                  </div>
                  <div className="journey-inline-line" aria-hidden="true"></div>

                </div>
              </section>


              {/* ===================== IMAGE SECTION ===================== */}
              <section className="journey-section section" data-section="journey-image">
                <div className="journey-container">

                  <div className="journey-image-divider">
                    <img src="/stalingrado.webp" alt="" aria-hidden="true" />

                    <p className="journey-image-caption">
                      Soldados soviéticos en el centro de la ciudad de Stalingrado, 2 de febrero de 1943.
                    </p>
                  </div>
                  <img src="/culDeLampe.webp" alt="" aria-hidden="true" className="journey-culdelampe" />

                </div>
              </section>


              {/* ===================== SECTION 3 ===================== */}
              <section className="journey-section section" data-section="journey-3">
                <div className="journey-container">

                  {/* HERO 2 */}
                  <div className="journey-hero">
                    <div className="journey-hero-left">
                      <img
                        src="/vectorStar.svg"
                        className="journey-svg"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="journey-hero-right">
                      <div className="journey-hero-line"></div>

                      <h2 className="journey-title">
                        <span>Bellumartis</span>
                        <span>Historia y Actualidad militar</span>
                      </h2>
                    </div>
                  </div>

                  {/* TEXTO 2 */}
                  <div className="journey-copy">
                    <p>
                      Bellumartis es un proyecto de divulgación dedicado a la historia militar, la geopolítica y el análisis de los conflictos pasados y presentes.
                    </p>

                    <p>
                      Nacido en 2011 como blog personal, ha evolucionado a plataforma de contenidos con comunidad consolidada.
                    </p>

                    <p>
                      El proyecto está dirigido por Francisco García Campa, profesor y divulgador especializado.
                    </p>

                    <p>
                      Con más de 6.000 contenidos, se ha consolidado como referencia en divulgación histórica.
                    </p>
                  </div>

                  {/* FOOTER */}
                  <div className="journey-footer">
                    <div className="journey-footer-left">
                      <div className="journey-footer-line"></div>
                    </div>

                    <div className="journey-footer-right">
                      <div className="journey-footer-top">
                        <p className="journey-name">Francisco García Campa</p>
                      </div>

                      <div className="journey-footer-bottom">
                        <p className="journey-role">Director de Bellumartis</p>
                      </div>
                    </div>
                  </div>

                </div>
              </section>
            </>
          }
        />



        {/* AUTH */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />

        {/* PUBLIC */}
        <Route path="/articles" element={<Articles />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/community" element={<Community />} />
        <Route path="/events" element={<Events />} />
        <Route path="/about" element={<About />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/legal" element={<LegalNotice />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/terms" element={<Terms />} />

        {/* PROTECTED */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin", "owner"]}>
              <div>Admin Panel (en desarrollo)</div>
            </ProtectedRoute>
          }
        />

      </Routes>

      {!hideLayout && <Footer />}

    </div>
  );
}

export default App;
