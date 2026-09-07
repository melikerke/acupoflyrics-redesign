import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import SpanishShell, { SpanishNav, SpanishFooter } from "../components/site/SpanishShell";
import TranslationLanguages from "../components/TranslationLanguages";
import { translations, languageAlternates } from "../lib/translationVariants";
import { useSeo } from "../lib/seo";
import { useAlbumColor, rgb, shade } from "../lib/color";
import { themeFromColor } from "../lib/theme";

export default function SpanishTranslationPage() {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const entry = translations.find((item) => item.slug === slug);
  const [content, setContent] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const accent = useAlbumColor(entry?.cover);
  const theme = themeFromColor(accent);
  useEffect(() => {
    if (!entry) return;
    const controller = new AbortController();
    setError(false);
    fetch(`/data/translations/es/${entry.slug}.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Translation unavailable"); return response.json(); })
      .then((data) => { if (data.slug !== entry.slug || !data.sections?.length) throw new Error("Invalid translation"); setContent(data); })
      .catch((failure) => { if (failure.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, [entry, attempt]);
  useSeo({
    title: entry?.title || "Traducción no encontrada | acupoflyrics", description: entry?.description || "No encontramos esta traducción. Explora las canciones disponibles en español.",
    path: entry?.path || pathname, image: entry?.cover, locale: "es", noindex: !entry,
    alternates: languageAlternates(entry?.sourceSlug),
    breadcrumbs: [{ name: "Inicio", path: "/es" }, ...(entry ? [{ name: entry.song, path: entry.path }] : [])],
  });
  if (!entry) return <SpanishShell><h1>Traducción no encontrada</h1><Link to="/es">Ver canciones en español</Link></SpanishShell>;
  const vars = {
    ...theme.vars, "--detail-accent": rgb(accent), "--detail-accent-soft": rgb(accent, .11),
    "--detail-accent-line": rgb(accent, .36), "--detail-accent-deep": rgb(shade(accent, .62)),
    "--detail-hero-top": rgb(shade(accent, .64)), "--detail-hero-bottom": rgb(shade(accent, .32)),
    "--color-ink": "#f7f3ec", "--color-ink-soft": "rgba(247,243,236,.78)", "--color-muted": "rgba(247,243,236,.64)",
    "--color-faint": "rgba(247,243,236,.48)", "--color-line": "rgba(255,255,255,.11)",
  };
  return <div className="lyric-detail-page spanish-translation-page" lang="es" style={vars}>
    <SpanishNav />
    <header className="detail-hero">
      <img src={entry.cover} alt="" aria-hidden="true" className="detail-hero-bg" /><div className="detail-hero-wash" aria-hidden="true" />
      <img src={entry.cover} alt="" aria-hidden="true" className="detail-hero-art" />
      <div className="detail-hero-inner"><div className="detail-hero-grid">
        <div className="detail-cover"><img src={entry.cover} alt={`Portada de ${entry.song} — ${entry.artist}`} width="300" height="300" fetchPriority="high" /></div>
        <div className="detail-hero-copy">
          <h1 className="font-serif">{entry.song}</h1><div className="detail-artist-line">{entry.artist}</div>
          <div className="detail-hero-meta"><span>Traducción al español</span>{entry.album && <span>◇ {entry.album}</span>}<span>◷ {entry.readingMinutes} min de lectura</span></div>
          {entry.vocals && <p>{entry.vocals}</p>}
          <div className="detail-actions"><a href="#lyrics-reader" className="detail-primary-action">Leer traducción</a>{entry.spotifyUrl && <a className="detail-ghost-action" href={entry.spotifyUrl} target="_blank" rel="noopener noreferrer">Escuchar en Spotify</a>}</div>
        </div>
      </div></div>
    </header>
    <main className="detail-reading-shell" id="lyrics-reader">
      <aside className="detail-info-panel">
        <h2>Esta canción</h2><p>{entry.artist}</p><p>{entry.album}</p>
        <Link to="/es">← Todas las traducciones</Link>
        {content && <details><summary>Secciones de la canción</summary><nav aria-label="Secciones de la canción"><ol>{content.sections.map((section, index) => <li key={index}><a href={`#seccion-${index + 1}`}>{section.label}</a></li>)}</ol></nav></details>}
      </aside>
      <div className="detail-reader-column"><div className="detail-lyrics-table">
        <TranslationLanguages sourceSlug={entry.sourceSlug} locale="es" />
        <div className="detail-reader-tools"><h2>Letra en español</h2></div>
        {!content && !error && <p role="status">Cargando traducción…</p>}
        {error && <div role="alert"><p>No se pudo cargar la traducción.</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Volver a intentar</button></div>}
        <div className="detail-lyric-sections">{content?.sections.map((section, index) => <section className="detail-lyric-section" id={`seccion-${index + 1}`} key={index}>
          <div className="detail-section-head"><h3 className="detail-section-pill" style={{ margin: 0 }}>{section.label}</h3></div>
          <div className="detail-section-copy" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="detail-section-col is-translation"><p className="detail-section-translation">{section.lines.join("\n")}</p></div></div>
        </section>)}</div>
      </div>
      <section className="spanish-related" aria-labelledby="mas-canciones"><h2 id="mas-canciones">Más canciones en español</h2><ul>{translations.filter((item) => item.slug !== slug).map((item) => <li key={item.slug}><Link to={item.path}>{item.song} — {item.artist}</Link></li>)}</ul></section>
      </div>
    </main>
    <SpanishFooter />
  </div>;
}
