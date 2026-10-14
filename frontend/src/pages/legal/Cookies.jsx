import { openCookieSettings } from "../../components/CookieConsentBanner";

export default function CookiePolicy() {
  return (
    <div className="legal-page">
      <h1>Política de Cookies</h1>

      <p className="legal-intro">
        Esta política explica qué información se almacena en el dispositivo al utilizar Bellumartis y cómo puedes cambiar tus preferencias.
      </p>

      <section>
        <h2>Responsable</h2>
        <p>
          Francisco García Campa<br />
          NIF: 09422776K<br />
          Calle Carlos López Otín 10, 33005 Oviedo<br />
          admin@bellumartis.com
        </p>
      </section>

      <section>
        <h2>Almacenamiento necesario</h2>
        <p>
          Bellumartis utiliza almacenamiento local del navegador para mantener la sesión iniciada y recordar tu elección de privacidad. La elección se guarda en este dispositivo, no en la base de datos de Bellumartis, y se renueva como máximo cada 12 meses.
        </p>
      </section>

      <section>
        <h2>Servicios externos opcionales</h2>
        <p>
          Si autorizas los servicios externos, al abrir las pantallas de acceso se carga Google Identity Services para permitir iniciar sesión con Google. Google puede tratar datos técnicos de la conexión y utilizar tecnologías propias conforme a su política de privacidad. Si rechazas esta categoría, podrás seguir usando el acceso con email y contraseña.
        </p>
        <p>
          Bellumartis no tiene actualmente herramientas de analítica web activas ni vídeos de YouTube incrustados. Los enlaces externos solo conectan con esos sitios cuando decides abrirlos.
        </p>
        <p>
          Más información sobre Google en su <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer noopener">política de privacidad</a>.
        </p>
      </section>

      <section>
        <h2>Cómo cambiar o retirar tu elección</h2>
        <p>
          Puedes aceptar o rechazar los servicios opcionales desde el aviso inicial. Después, puedes cambiar o retirar tu elección en cualquier momento con el enlace «Configurar cookies» del pie de página. El acceso a la web no depende de que aceptes los servicios opcionales.
        </p>
        <div className="cookie-buttons">
          <button className="btn reject" type="button" onClick={openCookieSettings}>
            Configurar cookies
          </button>
        </div>
      </section>

      <div className="legal-footer">Última actualización: 9 de octubre de 2026</div>
    </div>
  );
}
