import { useEffect, useState } from "react";
import {
  readAnalyticsConsent,
  setAnalyticsConsent,
} from "../lib/analytics";

export default function ConsentBanner() {
  const [open, setOpen] = useState(() => readAnalyticsConsent() === null);
  const isAdmin = window.location.pathname.startsWith("/admin");

  useEffect(() => {
    const showPreferences = () => setOpen(true);
    window.addEventListener("acupoflyrics:open-consent", showPreferences);
    return () => window.removeEventListener("acupoflyrics:open-consent", showPreferences);
  }, []);

  const choose = (granted) => {
    setAnalyticsConsent(granted);
    setOpen(false);
  };

  if (!open || isAdmin) return null;

  return (
    <section className="acl-consent" role="dialog" aria-label="Çerez tercihleri">
      <div className="acl-consent-copy">
        <span>Gizlilik tercihi</span>
        <p>
          Siteyi iyileştirmek için toplu kullanım verisi toplayabiliriz.
          Reklam kişiselleştirmesi kapalı kalır.
        </p>
      </div>
      <div className="acl-consent-actions">
        <button type="button" className="is-secondary" onClick={() => choose(false)}>
          Reddet
        </button>
        <button type="button" className="is-primary" onClick={() => choose(true)}>
          Analitiğe izin ver
        </button>
      </div>
    </section>
  );
}
