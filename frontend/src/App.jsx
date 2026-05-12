import { Routes, Route, useLocation } from "react-router-dom";

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

  const hideLayout =
    location.pathname === "/login" ||
    location.pathname === "/register";

  return (
    <div className="app">

      {!hideLayout && <Navbar />}

      <Routes>

        {/* HOME (TU ORIGINAL SIN TOCAR) */}
        <Route
          path="/"
          element={
            <>
              <section className="home">
                <div className="hero-content">
                  <div className="hero-copy">
                    <h1 className="title">BellumArtis</h1>
                    <p className="subtitle">Historia y Actualidad Militar</p>
                  </div>

                  <div className="cta">
                    <button>Regístrate</button>
                  </div>
                </div>
              </section>

              <section className="about-section">
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

              <section className="journey-section">
                <div className="journey-container">
                  <h2 className="journey-title">
                    <span>De abogado a</span>
                    <span>divulgador</span>
                    <span>histórico militar.</span>
                  </h2>

                  <div className="journey-line"></div>

                  <div className="journey-copy">

                    {/* 👇 ESTE BLOQUE ES EL QUE HABÍAS PERDIDO SIEMPRE DEBE QUEDAR COMPLETO */}
                    <p>
                      Soy un ovetense, viajero en el tiempo y hambriento de conocimientos, siendo la Historia, especialmente la Militar, mi debilidad.
                    </p>

                    <p>
                      Pese a mi pasión por la Historia, orienté mis estudios hacia las Ciencias Jurídicas, Licenciado en Derecho y Diplomado en Relaciones Laborales por la Universidad de Oviedo.
                    </p>

                    <p>
                      Trabajando como profesor de Formación y Orientación Laboral en el Colegio Fundación Masaveu-Salesianos y actualmente en la organización Sindical OTECAS defendiendo a mis compañeros de la Enseñanza Concertada Asturiana.
                    </p>

                    <p>
                      Persiguiendo mi sueño me gradué en Geografía e Historia por la UNED, dedicándome a la divulgación histórico-militar en mi proyecto Bellumartis Historia Militar desde el 2011.
                    </p>

                    <p>
                      Además de esto colaboro con numerosas revistas, blogs, podcasts y canales de YouTube para difundir la Historia en todas las facetas.
                    </p>

                    <img
                      src="/tank.png"
                      alt=""
                      className="journey-tank"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="journey-signature">
                    <p className="journey-name">Francisco García Campa</p>
                    <p className="journey-role">Director de Bellumartis</p>
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