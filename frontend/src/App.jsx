import { Routes, Route, useLocation, NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Articles from "./pages/Articles";
import Shop from "./pages/Shop";
import Community from "./pages/Community";
import Events from "./pages/Events";
import About from "./pages/About";

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

  
  const hideLayout = ["/login", "/register"].includes(location.pathname);

  return (
    <div className="app">

      {!hideLayout && <Navbar />}

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

              <section className="about-section section" data-section="about">
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
                      <a href="#"><FaXTwitter /></a>
                      <a href="#"><FaFacebookF /></a>
                      <a href="#"><FaYoutube /></a>
                      <a href="#"><FaInstagram /></a>
                    </div>
                  </div>

                  <div className="about-right">
                    <img src="/Campa.webp" alt="Francisco García Campa" />
                  </div>
                </div>
              </section>

              <section className="journey-section section" data-section="journey">
                <div className="journey-container">

                  {/* =========================
        BLOQUE 1 (HERO)
    ========================= */}
                  <div className="journey-hero">

                    {/* LEFT */}
                    <div className="journey-hero-left">
                      <img
                        src="/vectorStar.svg"
                        alt=""
                        className="journey-svg"
                        aria-hidden="true"
                      />
                    </div>

                    {/* RIGHT */}
                    <div className="journey-hero-right">

                      {/* 👇 ESTA ES LA LÍNEA CORRECTA (HORIZONTAL) */}
                      <div className="journey-hero-line"></div>

                      <h2 className="journey-title">
                        <span>De abogado a divulgador</span>
                        <span>histórico militar</span>
                      </h2>

                    </div>
                  </div>

                  {/* =========================
        BLOQUE 2 (TEXTO OCUPA TODO)
    ========================= */}
                  <div className="journey-copy">

                    <p>
                      Soy un ovetense apasionado por la <strong>Historia</strong>, especialmente la <strong>Historia Militar</strong>, que ha marcado mi forma de entender el pasado y el presente.
                    </p>

                    <p>
                      Aunque mi vocación inicial me llevó a las <strong>Ciencias Jurídicas</strong>, me licencié en Derecho y me diplomé en Relaciones Laborales por la Universidad de Oviedo.                    </p>

                    <p>
                      He desarrollado mi carrera profesional en el ámbito de la <strong>docencia</strong>, como profesor de Formación y Orientación Laboral, compaginando esta labor con mi actividad en el ámbito de la enseñanza concertada en Asturias.
                    </p>

                    <p>
                      Con el tiempo, y persiguiendo una vocación que siempre estuvo presente, me gradué en <strong>Geografía e Historia por la UNED</strong>, lo que me permitió dedicarme plenamente a la <strong>divulgación histórico-militar</strong> a través de mi proyecto <strong>Bellumartis Historia Militar</strong>, activo desde 2011.
                    </p>

                  </div>

                  {/* =========================
        BLOQUE 3 (FOOTER FINAL)
    ========================= */}
                  <div className="journey-footer">

                    {/* LEFT: línea gruesa */}
                    <div className="journey-footer-left">
                      <div className="journey-footer-line"></div>
                    </div>

                    {/* RIGHT: 2 bloques verticales */}
                    <div className="journey-footer-right">





                    </div>

                  </div>

                    <div className="journey-image-divider">
                      <img
                        src="/stalingrado.jpg"
                        alt=""
                        aria-hidden="true"
                      />
                    </div>



                  <div className="journey-hero">

                    {/* LEFT */}
                    <div className="journey-hero-left">
                      <img
                        src="/vectorStar.svg"
                        alt=""
                        className="journey-svg"
                        aria-hidden="true"
                      />
                    </div>

                    {/* RIGHT */}
                    <div className="journey-hero-right">

                      {/* 👇 ESTA ES LA LÍNEA CORRECTA (HORIZONTAL) */}
                      <div className="journey-hero-line"></div>

                      <h2 className="journey-title">
                        <span>Bellumartis</span>
                        <span>Historia y Actualidad militar</span>
                      </h2>

                    </div>
                  </div>

                  {/* =========================
        BLOQUE 2 (TEXTO OCUPA TODO)
    ========================= */}
                  <div className="journey-copy">

                    <p>
                      Bellumartis es un proyecto de divulgación dedicado a la historia militar, la geopolítica y el análisis de los conflictos pasados y presentes. Nacido en 2011 como un blog personal, ha evolucionado hasta convertirse en una amplia plataforma de contenidos que integra artículos, podcasts y canales de vídeo, con una comunidad consolidada de miles de seguidores interesados en comprender la historia y su relación con el mundo actual.                    </p>

                    <p>
                      El proyecto esta dirigido por Francisco García Campa, profesor y divulgador especializado en historia militar y relaciones internacionales. Su enfoque combina el rigor histórico con una narrativa accesible.
                    </p>
                    <p>

                      <strong>Bellumartis</strong> se estructura en historia militar y actualidad geopolítica, ofreciendo una visión contextualizada de los grandes desafíos internacionales.

                    </p>

                    <p>
                      Con <strong>más de 6.000 contenidos</strong> publicados, Bellumartis se ha consolidado como un espacio de referencia en divulgación histórica.

                    </p>

                  </div>

                  {/* =========================
        BLOQUE 3 (FOOTER FINAL)
    ========================= */}
                  <div className="journey-footer">

                    {/* LEFT: línea gruesa */}
                    <div className="journey-footer-left">
                      <div className="journey-footer-line"></div>
                    </div>

                    {/* RIGHT: 2 bloques verticales */}
                    <div className="journey-footer-right">

                      <div className="journey-footer-top">
                        <p className="journey-name">
                          Francisco García Campa
                        </p>
                      </div>

                      <div className="journey-footer-bottom">
                        <p className="journey-role">
                          Director de Bellumartis
                        </p>
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