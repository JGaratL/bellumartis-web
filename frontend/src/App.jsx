import Navbar from "./components/Navbar";
import EventsList from "./components/EventsList";
import "./App.css";
import { FaFacebookF, FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";

function App() {
  return (
    <div className="app">

      <Navbar />

      {/* =========================
          HOME HERO
      ========================= */}
      <section className="home">

        <div className="hero-content">

          <h1 className="title">
            BellumArtis
          </h1>

          <p className="subtitle">
            Historia militar, análisis y documentación visual de conflictos modernos.
          </p>

          <div className="cta">
            <button>Explorar vídeos</button>
            <button className="secondary">Eventos</button>
          </div>

        </div>

      </section>

      {/* =========================
          NUEVA SECCIÓN: FRANCISCO GARCÍA CAMPA
      ========================= */}
      <section className="about-section">

        <div className="about-container">

          {/* IZQUIERDA */}
          <div className="about-left">

            <h2 className="about-title">
              Francisco García Campa
            </h2>

            <div className="about-line"></div>

            <p className="about-text">
              Soy un viajero en el tiempo hambriento de conocimientos. Mi pasión por la historia militar me llevó a crear un proyecto de divulgación en YouTube y otras plataformas.
            </p>

            {/* firma */}
            <img
              src="/firma.png"
              alt="Firma"
              className="signature"
            />

            {/* redes sociales */}
            <div className="social-icons">

              {/* X (Twitter) */}
              <a href="#" aria-label="X">
                <FaXTwitter />
              </a>

              {/* Facebook */}
              <a href="#" aria-label="Facebook">
                <FaFacebookF />
              </a>

              {/* YouTube */}
              <a href="#" aria-label="YouTube">
                <FaYoutube />
              </a>

              {/* Instagram */}
              <a href="#" aria-label="Instagram">
                <FaInstagram />
              </a>

            </div>

          </div>

          {/* DERECHA */}
          <div className="about-right">
            <img src="/Campa.webp" alt="Francisco García Campa" />
          </div>

        </div>

      </section>

    </div>
  );
}

export default App;
