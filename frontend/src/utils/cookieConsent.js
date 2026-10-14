export const COOKIE_CONSENT_KEY = "bellumartis-cookie-consent-v1";
const CONSENT_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

export function readCookieConsent() {
  try {
    const saved = JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY) || "null");
    if (
      !saved ||
      saved.version !== 1 ||
      typeof saved.externalServices !== "boolean" ||
      !Number.isFinite(saved.expiresAt) ||
      saved.expiresAt <= Date.now()
    ) {
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

export function saveCookieConsent(externalServices) {
  const now = Date.now();
  const consent = {
    version: 1,
    necessary: true,
    externalServices: Boolean(externalServices),
    savedAt: now,
    expiresAt: now + CONSENT_DURATION_MS,
  };
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  return consent;
}
