import "./Shop.css";
import { PiTShirt, PiBooksLight } from "react-icons/pi";
import { FiArrowRight } from "react-icons/fi";
import { useEffect, useState, useRef } from "react";

function Shop() {
  const [selectedBook, setSelectedBook] = useState(null);

  const bookRefs = useRef([]);

  /* =========================
      PARALLAX ESTABLE + SNAP SAFE
  ========================= */
  useEffect(() => {
    let raf;

    const currentY = new Map();
    let lastScrollTime = Date.now();

    const handleScroll = () => {
      lastScrollTime = Date.now();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    const animate = () => {
      const now = Date.now();
      const idle = now - lastScrollTime > 120;

      bookRefs.current.forEach((el, i) => {
        if (!el) return;

        const rect = el.getBoundingClientRect();

        // posición relativa al centro de pantalla
        const offset =
          (rect.top + window.scrollY) - (window.scrollY + window.innerHeight * 0.5);

        // rango controlado (evita que “se quede muerto”)
        const clamped = Math.max(-180, Math.min(180, offset));

        // intensidad base
        const baseTarget = clamped * -0.03;

        // pequeña inercia extra cuando el scroll se detiene
        const target = idle ? baseTarget * 1.15 : baseTarget;

        const prev = currentY.get(i) || 0;

        // suavizado estable
        const next = prev + (target - prev) * 0.035;

        currentY.set(i, next);

        // IMPORTANTE: translate3d para evitar glitches con snap scroll
        el.style.transform = `translate3d(0, ${next}px, 0)`;
      });

      raf = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const merch = [
    { base: "/mer1.jpg", hover: "/mer1b.jpg" },
    { base: "/mer2.jpg", hover: "/mer2b.jpg" },
    { base: "/mer3.jpg", hover: "/mer3b.jpg" },
    { base: "/mer4.jpg", hover: "/mer4b.jpg" },
    { base: "/mer5.jpg", hover: "/mer5b.jpg" },
    { base: "/mer6.jpg", hover: "/mer6b.jpg" },
  ];

  const books = [
    {
      image: "/Libro1.webp",
      title: "Un Mundo Convulso",
      description: <p>
        El mapa del mundo ya no es estable, sino un <strong>campo de batalla</strong>: fronteras en llamas, rutas bloqueadas, recursos convertidos en armas y tecnologías que alteran el equilibrio del poder. La <strong>geopolítica</strong> deja de ser un lujo académico para convertirse en una necesidad vital.

        <strong>Un Mundo Convulso</strong> ofrece las claves del siglo XXI: guerras híbridas, energía, rivalidad entre potencias y fracturas identitarias. Francisco García Campa guía al lector desde <strong>Ucrania</strong> al <strong>Indo-Pacífico</strong>, del <strong>ciberespacio</strong> al <strong>Sahel</strong>.

        No es un manual para expertos, sino una <strong>brújula</strong> para entender por qué el mundo se tambalea.

        Quien no entiende el mapa… queda atrapado en él.
      </p>
    },
    {
      image: "/Libro2.webp",
      title: "La Frontera Norte",
      description: <p>
        Apaches, comanches, río Bravo y río Pecos, búfalos y caravanas atacadas forman parte del imaginario del <strong>western</strong>.
        Antes de la llegada anglosajona, españoles recorrieron el <strong>Far West</strong> en una aventura.
        Este libro aborda el norte de la <strong>Nueva España</strong> tras la conquista de México por Hernán Cortés,
        con una frontera de exploración, conflicto y evangelización.
        Conquistadores y misioneros se adentraron en territorios hostiles bajo la Corona.
        Durante dos siglos, hasta los Borbones, se configuró una frontera que dio forma al suroeste de EE. UU. y al norte de México,
        dejando un legado en su toponimia y cultura.
      </p>
    },
    {
      image: "/Libro3.webp",
      title: "Cayo Mario",
      description:
        <p>
          A finales del siglo II a.C. <strong>Roma</strong> se encontraba en una nueva edad de oro. Riquezas procedentes de los tres continentes conocidos llenaban las arcas de la Res Publica y de las familias patricias. Mientras los pequeños propietarios se arruinaban debido a los cada vez más largos períodos de servicio militar. Dos guerras, una al sur contra Yugurta el rey de los númidas, y la otra contra cimbrios y teutones que descendieron de las frías tierras del norte de Europa, ponían en peligro la propia existencia de Roma. La <strong>negligencia y corrupción</strong> generalizada de la clase política, hicieron que el pueblo confiase en la llegada de un hombre nuevo.
        </p>
    }
  ];

  return (
    <div className="page-container">
      <h1>Tienda Bellumartis</h1>

      <section className="shop-container">

        <div className="shop-bg"></div>

        {/* =========================
            MERCH
        ========================= */}
        <div className="shop-section">

          <div className="shop-header">
            <div className="shop-title">
              <PiTShirt className="shop-icon" />
              <h2>Merchandising Bellumartis</h2>
            </div>

            <a
              href="https://bhmshop.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="shop-link"
            >
              Ir a tienda
              <FiArrowRight />
            </a>
          </div>

          <div className="merch-grid">
            {merch.map((item, index) => (
              <div className="merch-card" key={index}>
                <img src={item.base} className="merch-img base" />
                <img src={item.hover} className="merch-img hover" />
              </div>
            ))}
          </div>

        </div>

        {/* =========================
            LIBROS
        ========================= */}
        <div className="shop-section">

          <div className="shop-header">
            <div className="shop-title">
              <PiBooksLight className="shop-icon" />
              <h2>Libros Bellumartis</h2>

              <p className="shop-subtitle">
                Pincha en el libro para más información
              </p>

            </div>

            <a
              href="https://amzn.to/3Xk7mAE"
              target="_blank"
              rel="noopener noreferrer"
              className="shop-link"
            >
              Ir a tienda
              <FiArrowRight />
            </a>
          </div>

          <div className="books-grid">
            {books.map((book, index) => (
              <div
                className="book-card"
                key={index}
                ref={(el) => (bookRefs.current[index] = el)}
                onClick={() => setSelectedBook(book)}
              >
                <img src={book.image} alt={book.title} />
              </div>
            ))}
          </div>

        </div>

      </section>

      {/* =========================
          MODAL LIBRO
      ========================= */}
      {selectedBook && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="book-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              onClick={() => setSelectedBook(null)}
            >
              ×
            </button>

            <div className="modal-content">

              <img
                src={selectedBook.image}
                className="modal-book-image"
                alt={selectedBook.title}
              />

              <div className="modal-text">

                <h3>{selectedBook.title}</h3>

                <p>{selectedBook.description}</p>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Shop;