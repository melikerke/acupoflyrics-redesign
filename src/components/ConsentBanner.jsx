import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  readAnalyticsConsent,
  setAnalyticsConsent,
} from "../lib/analytics";

export default function ConsentBanner() {
  const { pathname } = useLocation();
  const spanish = pathname === "/es" || pathname.startsWith("/es/");
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
    <section className="acl-consent" role="dialog" aria-label={spanish ? "Preferencias de cookies" : "Çerez tercihleri"}>
      <div className="acl-consent-copy">
        <span>{spanish ? "Tu privacidad" : "Gizlilik tercihi"}</span>
        <p>
          {spanish ? "Podemos recopilar datos de uso agregados para mejorar el sitio. La personalización de anuncios permanece desactivada." : "Siteyi iyileştirmek için toplu kullanım verisi toplayabiliriz. Reklam kişiselleştirmesi kapalı kalır."}
        </p>
      </div>
      <div className="acl-consent-actions">
        <button type="button" className="is-secondary" onClick={() => choose(false)}>
          {spanish ? "Rechazar" : "Reddet"}
        </button>
        <button type="button" className="is-primary" onClick={() => choose(true)}>
          {spanish ? "Permitir analítica" : "Analitiğe izin ver"}
        </button>
      </div>
    </section>
  );
}
