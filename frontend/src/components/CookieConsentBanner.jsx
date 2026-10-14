import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { saveCookieConsent } from "../utils/cookieConsent";
import "./CookieConsentBanner.css";

const OPEN_SETTINGS_EVENT = "bellumartis:open-cookie-settings";

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

export default function CookieConsentBanner({ consent, onConsentChange, onVisibilityChange }) {
  const [isOpen, setIsOpen] = useState(!consent);
  const [showPreferences, setShowPreferences] = useState(false);
  const [externalServices, setExternalServices] = useState(Boolean(consent?.externalServices));

  useEffect(() => {
    setExternalServices(Boolean(consent?.externalServices));
  }, [consent]);

  useEffect(() => {
    onVisibilityChange(isOpen);
  }, [isOpen, onVisibilityChange]);

  useEffect(() => {
    const openPreferences = () => {
      setExternalServices(Boolean(consent?.externalServices));
      setShowPreferences(true);
      setIsOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, openPreferences);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, openPreferences);
  }, [consent]);

  const storeChoice = (allowExternalServices) => {
    const saved = saveCookieConsent(allowExternalServices);
    onConsentChange(saved);
    setIsOpen(false);
    setShowPreferences(false);
    // Reload applies a changed choice to services that may already be loaded.
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <section className="cookie-consent-banner" aria-label="Preferencias de cookies" role="region">
      <div className="cookie-consent-copy">
        <p className="cookie-consent-title">Tu privacidad importa</p>
        {showPreferences ? (
          <div className="cookie-consent-preferences">
            <div className="cookie-consent-category">
              <div>
                <strong>Necesarias</strong>
                <p>Se usan para recordar estas preferencias y mantener las funciones básicas del sitio.</p>
              </div>
              <span className="cookie-consent-always-on">Siempre activas</span>
            </div>
            <label className="cookie-consent-category cookie-consent-toggle">
              <span>
                <strong>Servicios externos</strong>
                <p>Permite cargar Google Identity Services para iniciar sesión con Google.</p>
              </span>
              <input
                type="checkbox"
                checked={externalServices}
                onChange={(event) => setExternalServices(event.target.checked)}
              />
            </label>
          </div>
        ) : (
          <p>
            Usamos almacenamiento necesario para el funcionamiento. Google Identity Services solo se carga si lo autorizas. No tenemos herramientas de analítica activas. Puedes aceptar, rechazar o configurar estos servicios. Consulta la <NavLink to="/cookies">política de cookies</NavLink>.
          </p>
        )}
      </div>

      <div className="cookie-consent-actions">
        {showPreferences ? (
          <>
            {consent && (
              <button type="button" className="cookie-consent-button cookie-consent-secondary" onClick={() => setIsOpen(false)}>
                Cerrar
              </button>
            )}
            <button type="button" className="cookie-consent-button cookie-consent-reject" onClick={() => storeChoice(false)}>
              Rechazar opcionales
            </button>
            <button type="button" className="cookie-consent-button cookie-consent-primary" onClick={() => storeChoice(externalServices)}>
              Guardar preferencias
            </button>
            <button type="button" className="cookie-consent-button cookie-consent-primary" onClick={() => storeChoice(true)}>
              Aceptar todas
            </button>
          </>
        ) : (
          <>
            <button type="button" className="cookie-consent-button cookie-consent-reject" onClick={() => storeChoice(false)}>
              Rechazar opcionales
            </button>
            <button type="button" className="cookie-consent-button cookie-consent-secondary" onClick={() => setShowPreferences(true)}>
              Configurar
            </button>
            <button type="button" className="cookie-consent-button cookie-consent-primary" onClick={() => storeChoice(true)}>
              Aceptar todas
            </button>
          </>
        )}
      </div>
    </section>
  );
}
