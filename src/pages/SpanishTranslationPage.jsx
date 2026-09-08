import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import SpanishShell, { SpanishNav, SpanishFooter } from "../components/site/SpanishShell";
import DetailLyricsTable from "../components/DetailLyricsTable";
import { MetaRow, DetailVideo, youtubeEmbedUrl } from "../components/DetailSongExtras";
import { copyForLanguage } from "../lib/detailCopy";
import { translations, languageAlternates } from "../lib/translationVariants";
import { useSeo } from "../lib/seo";
import { useAlbumColor, useAlbumPalette, isDark, rgb, shade } from "../lib/color";
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
  const cardPalette = useAlbumPalette(entry?.cover, [accent, shade(accent, .72), shade(accent, .46)]);
  const readerRef = useRef(null);
  const [shared, setShared] = useState(false);
  const ui = copyForLanguage("es");
  const languages = { original: "en", translation: "es", annotations: "es" };
  const readerPost = useMemo(() => ({ ...entry, ...content?.sourceMetadata, date: entry?.translationDate }), [entry, content]);
  const sections = useMemo(() => content?.sections.map((section) => ({ label: section.label, original: section.original, translation: section.lines })) || [], [content]);
  const readTranslation = () => readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const share = async () => {
    const data = { title: entry.title, url: `https://www.acupoflyrics.com${entry.path}` };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); setShared(true); }
    } catch { /* Cancelling the native share sheet leaves the page unchanged. */ }
  };
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
    ...theme.vars, "--acl-accent": rgb(accent), "--acl-accent-soft": rgb(accent, .18), "--acl-glow": rgb(accent, .18), "--detail-accent": rgb(accent), "--detail-accent-soft": rgb(accent, .11),
    "--detail-accent-line": rgb(accent, .36), "--detail-accent-deep": rgb(shade(accent, !isDark(accent) ? .44 : .62)),
    "--detail-hero-top": rgb(shade(accent, !isDark(accent) ? .42 : .64)), "--detail-hero-bottom": rgb(shade(accent, !isDark(accent) ? .20 : .32)),
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
          <div className="detail-actions"><a href="#lyrics-reader" className="detail-primary-action">Leer traducción</a>{entry.spotifyUrl && <a className="detail-ghost-action" href={entry.spotifyUrl} target="_blank" rel="noopener noreferrer">Escuchar en Spotify</a>}<button type="button" className="detail-ghost-action" onClick={share}>↗ {shared ? ui.copied : ui.share}</button></div>
        </div>
      </div></div>
    </header>
    <DetailVideo post={readerPost} embedUrl={youtubeEmbedUrl(readerPost.youtubeUrl)} onRead={readTranslation} ui={ui} locale="es" />
    <main className="detail-reading-shell">
      <img src={entry.cover} alt="" aria-hidden="true" className="detail-reading-atmosphere" />
      <aside className="detail-info-panel">
        <h2 className="font-serif">{ui.songInfo}</h2>
        <MetaRow label={ui.artist} value={entry.artist} />
        <MetaRow label={ui.album} value={entry.album || ui.single} />
        <MetaRow label={ui.release} value={entry.releaseDate?.slice(0, 4)} />
        <MetaRow label={ui.composer} value={Array.isArray(readerPost.songwriters) ? readerPost.songwriters.join(", ") : readerPost.songwriters} />
        <MetaRow label={ui.duration} value={readerPost.spotify?.track?.duration} />
        <MetaRow label={ui.reading} value={`${entry.readingMinutes} ${ui.minutes}`} />
        <MetaRow label={ui.date} value={new Intl.DateTimeFormat("es", { dateStyle: "long", timeZone: "UTC" }).format(new Date(entry.translationDate))} />
        <Link to="/es">← Todas las traducciones</Link>
      </aside>
      <div className="detail-reader-column" id="lyrics-reader" ref={readerRef}>
        {!content && !error && <p role="status">Cargando traducción…</p>}
        {error && <div role="alert"><p>No se pudo cargar la traducción.</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Volver a intentar</button></div>}
        {content && <DetailLyricsTable post={readerPost} sections={sections} notes={{}} cardPalette={cardPalette} languages={languages} defaultView="both" />}
      <section className="spanish-related" aria-labelledby="mas-canciones"><h2 id="mas-canciones">Más canciones en español</h2><ul>{translations.filter((item) => item.slug !== slug).map((item) => <li key={item.slug}><Link to={item.path}>{item.song} — {item.artist}</Link></li>)}</ul></section>
      </div>
    </main>
    <SpanishFooter />
  </div>;
}
