import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import { variantsFor } from "../lib/translationVariants";
import "./TranslationLanguages.css";

export default function TranslationLanguages({ sourceSlug, locale = "tr" }) {
  const disclosure = useRef(null);
  useEffect(() => {
    const closeOutside = (event) => {
      if (!disclosure.current?.contains(event.target)) disclosure.current?.removeAttribute("open");
    };
    const closeOnEscape = (event) => {
      if (event.key !== "Escape" || !disclosure.current?.open) return;
      disclosure.current.removeAttribute("open");
      disclosure.current.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  const variants = variantsFor(sourceSlug);
  if (!variants.length) return null;
  const label = locale === "es" ? "Traducciones" : "Çeviriler";
  const languages = [{ locale: "tr", path: `/${sourceSlug}/`, label: "Türkçe" }, ...variants.map((item) => ({ ...item, label: "Español" }))];
  return <details className="translation-languages" ref={disclosure}>
    <summary>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 5h12M9 3v2M5 5c0 6 5 10 8 11M13 5c0 6-5 10-10 12M14 21l4-10 4 10M15.5 17h5" /></svg>
      <span>{label}</span>
      <svg className="translation-languages-chevron" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
    </summary>
    <nav aria-label={locale === "es" ? "Idioma de la traducción" : "Çeviri dili"}>
      {languages.map((item) => <Link key={item.path} to={item.path} lang={item.locale} hrefLang={item.locale} aria-current={locale === item.locale ? "page" : undefined} onClick={() => disclosure.current?.removeAttribute("open")}>
        {item.label}{locale === item.locale && <span aria-hidden="true">✓</span>}
      </Link>)}
    </nav>
  </details>;
}
