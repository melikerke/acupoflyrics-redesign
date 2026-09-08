import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { MobileTabBar, SiteFooter, SiteNav } from "../components/site/SiteShell";
import {
  allPosts,
  albumArtistFor,
  albumNameFor,
  albumSlugFor,
  annotationsFor,
  creditedArtistsFor,
  firstPair,
  formatDate,
  getPost,
  postPath,
  relatedTo,
} from "../lib/content";
import { albumPath, artistPath, canonical } from "../lib/paths";
import { addHistory } from "../lib/history";
import { trackEvent } from "../lib/analytics";
import { translationMetaDescription, translationMetaTitle } from "../lib/meta";
import { languageInfo, languagesFor, translationLabel } from "../lib/languages";
import { useSeo } from "../lib/seo";
import DetailLyricsTable from "../components/DetailLyricsTable";
import { MetaRow, DetailVideo, youtubeEmbedUrl } from "../components/DetailSongExtras";
import { copyForLanguage, interfaceLocaleFor } from "../lib/detailCopy";
import { languageAlternates } from "../lib/translationVariants";
import { isDark, rgb, shade, useAlbumColor, useAlbumPalette } from "../lib/color";

function detailMetaDescription(post, languages) {
  return translationMetaDescription(post);
}

function ArtistLinks({ artists }) {
  if (!artists?.length) return null;
  return (
    <span className="detail-artist-links">
      {artists.map((artist, index) => (
        <span key={artist.slug || artist.name} className="detail-artist-link-item">
          {index > 0 && <span className="detail-artist-separator">,</span>}
          <Link to={artist.slug ? artistPath(artist) : "/"}>{artist.name}</Link>
        </span>
      ))}
    </span>
  );
}

function lyricSections(blocks) {
  const out = [];
  let pendingOriginal = [];
  let pendingLabel = "";
  let verseCount = 0;
  let chorusCount = 0;
  let sectionCount = 0;
  const seenTranslations = new Map();

  const labelFor = (trLines) => {
    sectionCount += 1;
    const key = trLines.join(" / ").toLowerCase();
    const seen = seenTranslations.get(key) || 0;
    seenTranslations.set(key, seen + 1);
    if (seen > 0 || trLines.some((line) => /nakarat|chorus/i.test(line))) {
      chorusCount += 1;
      return chorusCount === 1 ? "Chorus" : `Chorus ${chorusCount}`;
    }
    if (sectionCount === 1 && trLines.length <= 4) return "Intro";
    if (sectionCount % 4 === 0) {
      chorusCount += 1;
      return chorusCount === 1 ? "Chorus" : `Chorus ${chorusCount}`;
    }
    if (sectionCount % 4 === 3) return "Pre-Chorus";
    verseCount += 1;
    return `Verse ${verseCount}`;
  };

  for (const block of Array.isArray(blocks) ? blocks : []) {
    const lines = Array.isArray(block.lines) ? block.lines : [];
    if (block.original) {
      pendingOriginal = lines.slice();
      pendingLabel = block.label || "";
      continue;
    }
    out.push({
      label: block.label || pendingLabel || labelFor(lines),
      original: pendingOriginal.filter(Boolean),
      translation: lines.filter(Boolean),
    });
    pendingOriginal = [];
    pendingLabel = "";
  }
  return out.filter((section) => section.original.length || section.translation.length);
}

function AnnotationDialog({ id, selected, onClose, annotationLanguage, theme }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const previousFocusRef = useRef(null);
  const copy = copyForLanguage(annotationLanguage);

  useEffect(() => {
    if (!selected) return undefined;
    previousFocusRef.current = selected.trigger || document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) || [])];
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const returnTarget = selected.trigger?.isConnected ? selected.trigger : previousFocusRef.current;
      returnTarget?.focus?.();
    };
  }, [selected, onClose]);

  if (!selected) return null;
  const titleId = `${id}-title`;
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  return createPortal((
    <div className="detail-note-modal" style={theme}>
      <div className="detail-note-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        id={id}
        className="detail-note-popover"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${labelId} ${titleId}`}
        aria-describedby={descriptionId}
        lang={annotationLanguage}
        tabIndex={-1}
      >
        <button ref={closeRef} type="button" className="detail-note-close" aria-label={copy.closeAnnotation} onClick={onClose}>×</button>
        <div>
          <div id={labelId} className="detail-selected-label">{copy.selectedPhrase}</div>
          <h3 id={titleId} className="font-serif" lang={selected.language}>“{selected.display || selected.key}”</h3>
          <p id={descriptionId} lang={annotationLanguage}>{selected.note}</p>
          {selected.line && (
            <div className="detail-note-source">
              <span>{copy.line}</span>
              <em lang={selected.language}>“{selected.line}”</em>
            </div>
          )}
          <div className="detail-signature">
            <span aria-hidden />
            melike
          </div>
        </div>
      </div>
    </div>
  ), document.body);
}

function LyricsSkeleton({ label }) {
  return (
    <div className="detail-lyrics-skeleton" aria-label={label}>
      {Array.from({ length: 8 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

// Suggestions go straight to the translator's inbox — no silent localStorage
// black hole.
function SuggestEdit({ post }) {
  const [text, setText] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    const subject = `Çeviri önerisi: ${post.artist} - ${post.song}`;
    const body = `${text.trim()}\n\n—\nŞarkı: ${post.artist} - ${post.song}\nSayfa: ${window.location.href}`;
    window.location.href = `mailto:acupoflyrics55@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="detail-suggest-edit">
      <div>
        <span lang="en">Community</span>
        <h2 className="font-serif">Düzeltme veya çeviri öner</h2>
        <p>Eksik, daha iyi çevrilebilir ya da açıklama isteyen bir yer varsa yaz — e-posta olarak bana ulaşır.</p>
      </div>
      <form onSubmit={submit}>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Örn. Chorus 2'de şu ifade daha doğal olabilir..." />
        <button type="submit">E-postayla gönder</button>
      </form>
    </section>
  );
}

function Stars({ value, onChange, disabled = false }) {
  return (
    <div className="detail-stars" aria-label={`${value} yıldız`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? "is-active" : ""}
          onClick={() => onChange?.(star)}
          disabled={disabled}
          aria-label={`${star} yıldız`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function CommentsSection({ post }) {
  const [comments, setComments] = useState([]);
  const [form, setForm] = useState({ name: "", body: "", rating: 5, website: "" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("");
    fetch(`/api/comments?slug=${encodeURIComponent(post.slug)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Yorumlar yüklenemedi.");
        return data;
      })
      .then((data) => {
        if (!cancelled) setComments(Array.isArray(data.comments) ? data.comments : []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => { cancelled = true; };
  }, [post.slug]);

  const average = comments.length
    ? (comments.reduce((sum, comment) => sum + Number(comment.rating || 0), 0) / comments.length).toFixed(1)
    : "";

  const update = (key, value) => {
    setStatus("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, slug: post.slug }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Yorum eklenemedi.");
      setComments((current) => [data.comment, ...current]);
      setForm({ name: "", body: "", rating: 5, website: "" });
      setStatus("Yorumun eklendi.");
      trackEvent("comment_submit", {
        content_type: "translation",
        item_id: post.slug,
        rating: Number(form.rating) || 0,
      });
    } catch (error) {
      setStatus(error.message || "Yorum eklenemedi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="detail-comments" aria-label="Yorumlar">
      <div className="detail-comments-head">
        <div>
          <span>Okur yorumları</span>
          <h2 className="font-serif">Bu çeviri sende nasıl kaldı?</h2>
        </div>
        {average && (
          <div className="detail-rating-summary">
            <strong>{average}</strong>
            <span>{comments.length} yorum</span>
          </div>
        )}
      </div>

      <form onSubmit={submit}>
        <input
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="İsim"
          maxLength={48}
          required
        />
        <Stars value={form.rating} onChange={(rating) => update("rating", rating)} />
        <textarea
          value={form.body}
          onChange={(event) => update("body", event.target.value)}
          placeholder="Yorumunu yaz..."
          maxLength={900}
          required
        />
        <input
          className="detail-comment-honeypot"
          value={form.website}
          onChange={(event) => update("website", event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <button type="submit" disabled={busy}>{busy ? "Ekleniyor" : "Yorum yap"}</button>
        {status && <p className="detail-comment-status">{status}</p>}
      </form>

      <div className="detail-comment-list">
        {comments.length ? comments.map((comment) => (
          <article key={comment.id} className="detail-comment-card">
            <header>
              <strong>{comment.name}</strong>
              <Stars value={Number(comment.rating) || 0} disabled />
            </header>
            <p>{comment.body}</p>
            {comment.createdAt && <time>{formatDate(comment.createdAt)}</time>}
          </article>
        )) : (
          <p className="detail-comment-empty">İlk yorum senden gelsin.</p>
        )}
      </div>
    </section>
  );
}

export default function LyricDetail() {
  const { slug } = useParams();
  const cleanSlug = (slug || "").replace(/\/$/, "");
  const indexedPost = getPost(cleanSlug);
  const [fullPost, setFullPost] = useState(null);
  const post = indexedPost ? { ...indexedPost, ...fullPost, song: indexedPost.song, no: indexedPost.no, voice: indexedPost.voice } : null;
  const languages = languagesFor(post);
  const interfaceLocale = interfaceLocaleFor(languages);
  const ui = copyForLanguage(interfaceLocale);
  const pageTranslationLabel = translationLabel(post, interfaceLocale);
  const accent = useAlbumColor(post?.cover);
  const cardPalette = useAlbumPalette(post?.cover, [accent, shade(accent, 0.72), shade(accent, 0.46)]);
  const readerRef = useRef(null);
  const annotationDialogId = useId();
  const [shared, setShared] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [readProgress, setReadProgress] = useState(0);
  const closeAnnotation = useCallback(() => setSelectedNote(null), []);

  useEffect(() => {
    if (!indexedPost) return;
    let cancelled = false;
    setFullPost(null);
    // Per-song JSON — no need to download the whole archive for one lyric.
    fetch(`/data/posts/${indexedPost.slug}.json`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("post yüklenemedi"))))
      .then((item) => {
        if (!cancelled) setFullPost(item || {});
      })
      .catch(() => {
        if (!cancelled) setFullPost({});
      });
    return () => { cancelled = true; };
  }, [indexedPost]);

  useEffect(() => {
    const onScroll = () => {
      const el = readerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalHeight = rect.height - window.innerHeight;
      if (totalHeight <= 0) {
        setReadProgress(0);
        return;
      }
      const currentProgress = Math.min(Math.max(0, -rect.top / totalHeight), 1);
      setReadProgress(currentProgress);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const notes = useMemo(() => (post ? { ...annotationsFor(post.slug), ...(post.annotations || {}) } : {}), [post]);

  useEffect(() => {
    if (post) addHistory(post.slug, post);
  }, [post?.slug]);

  useEffect(() => {
    setSelectedNote(null);
  }, [slug]);

  const canonicalPath = post ? postPath(post) : `/${cleanSlug}/`;
  const metaArtist = post ? creditedArtistsFor(post)[0] : null;
  const metaAlbum = post ? albumNameFor(post) : "";
  useSeo({
    title: post ? translationMetaTitle(post) : "Çeviri bulunamadı | acupoflyrics",
    description: detailMetaDescription(post, languages),
    path: canonicalPath,
    image: post?.cover,
    type: "music.song",
    locale: languages.translation === "en" ? "en" : "tr",
    alternates: languageAlternates(post?.slug),
    noindex: !post,
    breadcrumbs: post
      ? [
          { name: "Ana sayfa", path: "/" },
          ...(metaArtist ? [{ name: metaArtist.name, path: artistPath(metaArtist) }] : []),
          { name: post.song, path: canonicalPath },
        ]
      : [],
    jsonLd: post
      ? {
          "@context": "https://schema.org",
          "@type": "MusicRecording",
          name: post.song,
          byArtist: { "@type": "MusicGroup", name: post.artist },
          ...(metaAlbum && metaAlbum !== "Tekli" ? { inAlbum: { "@type": "MusicAlbum", name: metaAlbum } } : {}),
          image: post.cover,
          url: canonical(canonicalPath),
          ...(post.spotify?.track?.isrc || post.spotify?.isrc ? { isrcCode: post.spotify?.track?.isrc || post.spotify?.isrc } : {}),
          sameAs: [post.spotify?.track?.url || post.spotify?.trackUrl].filter(Boolean),
        }
      : null,
  });

  const sharePost = async () => {
    const url = window.location.href;
    const title = post ? `${post.artist} - ${post.song} | ${pageTranslationLabel}` : "acupoflyrics";
    try {
      const method = navigator.share ? "web_share" : "clipboard";
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
      trackEvent("share", {
        method,
        content_type: "translation",
        item_id: post?.slug,
      });
    } catch {
      /* user cancelled */
    }
  };

  if (!post) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p className="font-serif" style={{ fontSize: 22, fontStyle: "italic" }}>Çeviri bulunamadı.</p>
          <Link to="/" style={{ color: "var(--color-muted)" }}>← ana sayfa</Link>
        </div>
      </main>
    );
  }

  const sameArtistRelated = relatedTo(post, 4);
  const archiveIndex = allPosts.findIndex((candidate) => candidate.slug === post.slug);
  const previousPost = archiveIndex > 0 ? allPosts[archiveIndex - 1] : null;
  const nextPost = archiveIndex >= 0 && archiveIndex < allPosts.length - 1 ? allPosts[archiveIndex + 1] : null;
  const sameAlbumRelated = allPosts.filter((candidate) => (
    candidate.slug !== post.slug
    && albumArtistFor(candidate) === albumArtistFor(post)
    && albumNameFor(candidate) === albumNameFor(post)
    && albumNameFor(post) !== "Tekli"
  ));
  const related = sameAlbumRelated.length >= 4
    ? sameAlbumRelated.slice(0, 4)
    : sameArtistRelated.length >= 4
      ? sameArtistRelated
    : [
        ...sameAlbumRelated,
        ...sameArtistRelated,
        ...allPosts.filter((candidate) => (
          candidate.slug !== post.slug &&
          !sameAlbumRelated.some((item) => item.slug === candidate.slug) &&
          !sameArtistRelated.some((item) => item.slug === candidate.slug) &&
          candidate.category_slugs?.some((slug) => post.category_slugs?.includes(slug))
        )),
        ...allPosts.filter((candidate) => (
          candidate.slug !== post.slug &&
          !sameArtistRelated.some((item) => item.slug === candidate.slug)
        )),
      ].filter((candidate, index, items) => items.findIndex((item) => item.slug === candidate.slug) === index).slice(0, 4);
  const artistLinks = creditedArtistsFor(post);
  const sections = lyricSections(post.blocks);
  const isLyricsLoading = indexedPost && fullPost === null;
  const parsedYear = new Date(post.spotify?.album?.releaseDate || post.date).getFullYear();
  const year = Number.isNaN(parsedYear) ? "" : parsedYear;
  const light = !isDark(accent);
  const top = shade(accent, light ? 0.42 : 0.64);
  const bottom = shade(accent, light ? 0.20 : 0.32);
  const genres = post.spotify?.artist?.genres?.filter(Boolean).slice(0, 3) || [];
  const tags = (genres.length ? genres : [post.artist, post.song]).filter(Boolean);
  const videoEmbedUrl = youtubeEmbedUrl(post.youtubeUrl || post.youtube?.url);
  const scrollToReader = () => {
    trackEvent("select_content", {
      content_type: "translation_reader",
      item_id: post.slug,
    });
    window.requestAnimationFrame(() => {
      (readerRef.current || document.getElementById("lyrics-reader"))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const albumName = albumNameFor(post);
  const hasAlbum = albumName && albumName !== "Tekli";
  const albumSlug = hasAlbum ? albumSlugFor(`${albumArtistFor(post)}-${albumName}`) : "";
  const songwriterSource = post.songwriters || post.composers || post.credits?.songwriters || post.credits?.composers;
  const songwriters = Array.isArray(songwriterSource) ? songwriterSource.join(", ") : songwriterSource || "";

  const cssVars = {
    "--detail-accent": rgb(accent),
    "--detail-accent-soft": rgb(accent, 0.11),
    "--detail-accent-line": rgb(accent, 0.36),
    "--detail-accent-deep": rgb(shade(accent, light ? 0.44 : 0.62)),
    "--detail-hero-top": rgb(top),
    "--detail-hero-bottom": rgb(bottom),
    "--acl-bg": "#071012",
    "--acl-bg-soft": "#0b1518",
    "--acl-surface": "rgba(16, 24, 28, 0.72)",
    "--acl-card": "rgba(22, 30, 35, 0.66)",
    "--acl-text": "#f7f3ec",
    "--acl-muted": "rgba(247, 243, 236, 0.70)",
    "--acl-faint": "rgba(247, 243, 236, 0.52)",
    "--acl-border": "rgba(255, 255, 255, 0.09)",
    "--acl-accent": rgb(accent),
    "--acl-accent-soft": rgb(accent, 0.18),
    "--acl-glow": rgb(accent, 0.18),
    "--acl-shadow": "rgba(0, 0, 0, 0.34)",
    "--color-ink": "#f7f3ec",
    "--color-ink-soft": "rgba(247, 243, 236, 0.78)",
    "--color-muted": "rgba(247, 243, 236, 0.64)",
    "--color-faint": "rgba(247, 243, 236, 0.48)",
    "--color-line": "rgba(255, 255, 255, 0.11)",
  };
  const annotationTheme = {
    "--detail-accent": cssVars["--detail-accent"],
    "--detail-accent-soft": cssVars["--detail-accent-soft"],
    "--detail-accent-line": cssVars["--detail-accent-line"],
    "--detail-accent-deep": cssVars["--detail-accent-deep"],
  };

  return (
    <motion.main
      className="lyric-detail-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={cssVars}
    >
      <SiteNav />
      <div className="detail-ambient" aria-hidden>
        <img src={post.cover} alt="" />
        <span className="detail-ambient-glow is-one" />
        <span className="detail-ambient-glow is-two" />
      </div>
      <div className="detail-reading-progress" aria-hidden>
        <span style={{ transform: `scaleX(${readProgress})`, background: "var(--detail-accent)" }} />
      </div>
      <header className="detail-hero">
        <img src={post.cover} alt="" aria-hidden className="detail-hero-bg" />
        <div className="detail-hero-wash" aria-hidden />
        <img src={post.cover} alt="" aria-hidden className="detail-hero-art" />

        <div className="detail-hero-inner">
          <div className="detail-hero-grid">
            <motion.div className="detail-cover">
              <img src={post.cover} alt={`${post.artist} - ${post.song}`} />
            </motion.div>

            <div className="detail-hero-copy" lang={interfaceLocale}>
              <h1 className="font-serif">{post.song}</h1>
              <div className="detail-artist-line">
                <ArtistLinks artists={artistLinks} />
              </div>

              <div className="detail-hero-meta">
                <span>◉ {pageTranslationLabel}</span>
                {post.releaseStatus && <span>◷ {post.releaseStatus}</span>}
                {hasAlbum && (
                  <Link to={albumPath(albumSlug)} className="detail-hero-album-link">
                    ◇ {albumName}
                  </Link>
                )}
                {post.reading_time && <span>◷ {post.reading_time} {ui.readingBadge}</span>}
                {year && <span>▣ {year}</span>}
              </div>

              <div className="detail-actions">
                <a href="#lyrics-reader" className="detail-primary-action" onClick={scrollToReader}>
                  {ui.readTranslation}
                </a>
                {post.spotify?.track?.url || post.spotify?.trackUrl ? (
                  <a
                    className="detail-ghost-action"
                    href={post.spotify?.track?.url || post.spotify?.trackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ui.listenSpotify}
                  </a>
                ) : null}
                {!post.spotify?.track?.url && !post.spotify?.trackUrl && post.appleMusicUrl ? (
                  <a
                    className="detail-ghost-action"
                    href={post.appleMusicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ui.preAddApple}
                  </a>
                ) : null}
                <button type="button" className="detail-ghost-action" onClick={sharePost}>
                  ↗ {shared ? ui.copied : ui.share}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <DetailVideo post={post} embedUrl={videoEmbedUrl} onRead={scrollToReader} ui={ui} locale={interfaceLocale} />

      <section className="detail-reading-shell">
        <img src={post.cover} alt="" aria-hidden className="detail-reading-atmosphere" />
        <aside className="detail-info-panel" lang={interfaceLocale}>
          <h2 className="font-serif">{ui.songInfo}</h2>
          <MetaRow label={ui.artist} value={<ArtistLinks artists={artistLinks} />} />
          <MetaRow label={ui.album} value={hasAlbum ? albumName : ui.single} />
          <MetaRow label={ui.status} value={post.releaseStatus || ""} />
          <MetaRow label={ui.firstPerformance} value={post.performanceSource || ""} />
          <MetaRow label={ui.release} value={year ? String(year) : ""} />
          <MetaRow label={ui.genre} value={genres.join(", ")} />
          <MetaRow label={ui.composer} value={songwriters} />
          <MetaRow label={ui.duration} value={post.spotify?.track?.duration || ""} />
          <MetaRow label={ui.reading} value={post.reading_time ? `${post.reading_time} ${ui.minutes}` : ""} />
          <MetaRow label={ui.date} value={formatDate(post.date)} />
          <div className="detail-tag-block">
            <span>{ui.tags}</span>
            <div>
              {tags.length ? tags.map((tag) => <b key={tag}>{tag}</b>) : <b>{pageTranslationLabel}</b>}
            </div>
          </div>
          <div className="detail-translator">
            <span aria-hidden />
            <div>
              <strong>melike</strong>
              <small>{ui.translationAndNotes}</small>
            </div>
          </div>
        </aside>

        <div className="detail-reader-column" id="lyrics-reader" ref={readerRef}>
          {isLyricsLoading ? (
            <LyricsSkeleton label={ui.loadingLyrics} />
          ) : (
            <DetailLyricsTable
              post={post}
              sections={sections}
              notes={notes}
              selectedKey={selectedNote?.key}
              onSelect={setSelectedNote}
              cardPalette={cardPalette}
              languages={languages}
              annotationDialogId={annotationDialogId}
            />
          )}

          <div className="detail-reader-signoff" style={{ display: "flex", justifyContent: "flex-end", paddingRight: "16px" }}>
            <time>{formatDate(post.date)}</time>
          </div>
        </div>

      </section>

      <AnnotationDialog
        id={annotationDialogId}
        selected={selectedNote}
        onClose={closeAnnotation}
        annotationLanguage={languages.annotations}
        theme={annotationTheme}
      />

      <section className="detail-related" lang={interfaceLocale}>
        {(previousPost || nextPost) && (
          <nav className="detail-sequence" aria-label={interfaceLocale === "en" ? "Browse songs" : "Şarkılar arasında gezin"}>
            {previousPost ? (
              <Link rel="prev" to={postPath(previousPost)}>
                <small>{interfaceLocale === "en" ? "Previous song" : "Önceki şarkı"}</small>
                <strong>{previousPost.artist} — {previousPost.song}</strong>
              </Link>
            ) : <span />}
            {nextPost && (
              <Link rel="next" to={postPath(nextPost)}>
                <small>{interfaceLocale === "en" ? "Next song" : "Sonraki şarkı"}</small>
                <strong>{nextPost.artist} — {nextPost.song}</strong>
              </Link>
            )}
          </nav>
        )}
        {related.length > 0 && (
          <>
            <div className="detail-section-heading">
              <h2 className="font-serif">
                {sameAlbumRelated.length
                  ? (interfaceLocale === "en" ? `${ui.fromAlbum} ${albumName}` : `${albumName} ${ui.fromAlbum}`)
                  : ui.recommended}
              </h2>
              {sameAlbumRelated.length ? (
                <Link to={albumPath(albumSlug)}>{ui.allAlbumTranslations}</Link>
              ) : (
                <span>{sameArtistRelated.length ? `${post.artist} ${ui.sameWorld}` : ui.keepReading}</span>
              )}
            </div>
            <div className="detail-related-grid">
              {related.map((p) => {
                const pr = firstPair(p);
                return (
                  <Link key={p.slug} to={postPath(p)} className="detail-related-card">
                    <img src={p.cover} alt="" loading="lazy" />
                    <span>
                      <strong className="font-serif">{p.song}</strong>
                      <em lang={languagesFor(p).translation}>“{pr.tr}”</em>
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>

      <SuggestEdit post={post} />
      <CommentsSection post={post} />

      <SiteFooter />
      <MobileTabBar />
    </motion.main>
  );
}
