export const GA_MEASUREMENT_ID = "G-FNLLT3T2NN";
export const ANALYTICS_CONSENT_KEY = "acl_analytics_consent_v1";

export function readAnalyticsConsent() {
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function gtag(...args) {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === "function") window.gtag(...args);
  else window.dataLayer.push(args);
}

export function trackEvent(name, parameters = {}) {
  if (!name || window.location.pathname.startsWith("/admin")) return;
  gtag("event", name, {
    ...parameters,
    send_to: GA_MEASUREMENT_ID,
  });
}

export function trackPageView(path = window.location.pathname) {
  if (path.startsWith("/admin")) return;
  trackEvent("page_view", {
    page_location: window.location.href,
    page_path: path,
    page_title: document.title,
  });
}

export function setAnalyticsConsent(granted) {
  const value = granted ? "granted" : "denied";

  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // Consent still applies for the current page when storage is unavailable.
  }

  gtag("consent", "update", {
    analytics_storage: value,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  if (granted) {
    trackPageView(`${window.location.pathname}${window.location.search}`);
    trackEvent("consent_update", { analytics_consent: "granted" });
  }
}
