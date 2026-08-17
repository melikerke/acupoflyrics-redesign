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

// Keep outbound music-platform clicks as their own GA4 events. The listener is
// installed once at app level, so links added to new translations, album pages
// and cards are measured without per-component wiring.
export function installOutboundClickTracking() {
  const onClick = (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!anchor) return;

    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch {
      return;
    }

    const common = {
      link_url: url.href,
      link_text: anchor.textContent?.trim().slice(0, 100) || "",
      page_path: window.location.pathname,
    };

    if (url.hostname === "open.spotify.com") {
      trackEvent("spotify_click", common);
    } else if (["youtube.com", "www.youtube.com", "youtu.be", "music.youtube.com"].includes(url.hostname)) {
      trackEvent("youtube_click", common);
    }
  };

  document.addEventListener("click", onClick, { capture: true });
  return () => document.removeEventListener("click", onClick, { capture: true });
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
    // Analytics is deliberately kept out of the critical rendering path.
    // The queued consent/page-view events are delivered once GTM is ready.
    window.aclLoadAnalytics?.();
    trackPageView(`${window.location.pathname}${window.location.search}`);
    trackEvent("consent_update", { analytics_consent: "granted" });
  }
}
