export default function CookiePolicy() {
  const acceptCookies = () => {
    localStorage.setItem("cookiesAccepted", "true");
    window.location.reload();
  };

  const rejectCookies = () => {
    localStorage.setItem("cookiesAccepted", "false");
    window.location.reload();
  };

  return (
    <div className="legal-page">
      <h1>Política de Cookies</h1>

      <p className="legal-intro">
        Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo
        cuando visitas nuestra web.
      </p>

      <section>
        <h2>Responsable</h2>
        <p>
          FRANCISCO GARCÍA CAMPA<br />
          NIF: 09422776K<br />
          Calle Carlos López Otín 10, 33005 Oviedo<br />
          info@bellumartis.com
        </p>
      </section>

      <section>
        <h2>Tipos de cookies</h2>

        <ul>
          <li><strong>Técnicas:</strong> necesarias para el funcionamiento de la web.</li>
          <li><strong>Análisis:</strong> estadísticas de uso (si se activan).</li>
          <li><strong>Terceros:</strong> YouTube, Google Login, etc.</li>
        </ul>
      </section>

      <section>
        <h2>Gestión de cookies</h2>

        <p>
          Puedes aceptar o rechazar cookies desde el banner o desde tu navegador.
        </p>

        {/* 🔥 IMPORTANTE: usamos tus clases reales del CSS */}
        <div className="cookie-buttons">
          <button className="btn reject" onClick={rejectCookies}>
            Rechazar
          </button>

          <button className="btn accept" onClick={acceptCookies}>
            Aceptar
          </button>
        </div>
      </section>

      <div className="legal-footer">
        Última actualización: 2026
      </div>
    </div>
  );
}