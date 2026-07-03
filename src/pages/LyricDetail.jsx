import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { MobileTabBar, SiteFooter, SiteNav } from "../components/site/SiteShell";
import {
  allPosts,
  albumNameFor,
  albumSlugFor,
  annotationsFor,
  artistSlugFor,
  firstPair,
  formatDate,
  getPost,
  postPath,
  relatedTo,
} from "../lib/content";
import { albumPath } from "../lib/paths";
import { addHistory } from "../lib/history";
import { isDark, rgb, shade, useAlbumColor } from "../lib/color";

function prettyTag(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="detail-meta-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function lyricSections(blocks) {
  const out = [];
  let pendingEn = [];
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
      pendingEn = lines.slice();
      continue;
    }
    out.push({
      label: labelFor(lines),
      en: pendingEn.filter(Boolean),
      tr: lines.filter(Boolean),
    });
    pendingEn = [];
  }
  return out.filter((section) => section.en.length || section.tr.length);
}

function youtubeEmbedUrl(url) {
  if (!url) return null;
  const raw = String(url).trim();
  const id =
    raw.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/)?.[1] ||
    raw.match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1] ||
    raw.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/)?.[1] ||
    null;
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

function AnnotationPanel({ selected, count }) {
  return (
    <aside className="detail-annotation-panel">
      <div className="detail-side-title">
        <h2 className="font-serif">Çevirmenin Notu</h2>
        <span>✦</span>
      </div>
      {selected ? (
        <>
          <div className="detail-selected-label">Seçili ifade</div>
          <h3 className="font-serif">“{selected.key}”</h3>
          <p>{selected.note}</p>
          {selected.line && (
            <div className="detail-note-source">
              <span>satır</span>
              <em>“{selected.line}”</em>
            </div>
          )}
          <div className="detail-signature">
            <span aria-hidden />
            melike
          </div>
        </>
      ) : (
        <>
          <h3 className="font-serif">Satırın arkasındaki anlam</h3>
          <p>
            İşaretli bir kelimeye dokunduğunda çeviri tercihi, alternatif anlam
            ve küçük notlar burada açılır.
          </p>
          <div className="detail-note-source">
            <span>bu çeviride</span>
            <em>{count ? `${count} not var` : "notlar yakında"}</em>
          </div>
        </>
      )}
    </aside>
  );
}

function DetailLyricsTable({ post, sections, notes, selectedKey, onSelect }) {
  const [viewMode, setViewMode] = useState("both");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [shareStatus, setShareStatus] = useState("");
  const keys = Object.keys(notes);
  const findKey = (line) => line ? keys.find((key) => line.includes(key)) : undefined;
  const normalizedQuery = query.trim().toLowerCase();
  const activeSection = sections[activeIndex] || sections[0];

  useEffect(() => {
    const onScroll = () => {
      const nodes = [...document.querySelectorAll("[data-lyric-section]")];
      if (!nodes.length) return;
      const current = nodes.reduce((best, node, index) => {
        const distance = Math.abs(node.getBoundingClientRect().top - 138);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Infinity });
      setActiveIndex(current.index);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  const jumpToSection = (index) => {
    document.getElementById(`lyric-section-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const shareSection = async (section) => {
    const text = `${post.artist} - ${post.song}\n${section.label}\n\n${section.tr.join("\n")}\n\nacupoflyrics`;
    try {
      if (navigator.share) await navigator.share({ title: `${post.song} - ${section.label}`, text, url: window.location.href });
      else await navigator.clipboard.writeText(text);
      setShareStatus(`${section.label} paylaşıma hazır`);
      setTimeout(() => setShareStatus(""), 1800);
    } catch {
      /* user cancelled */
    }
  };

  const visibleSections = sections.map((section, index) => ({ section, index })).filter(({ section }) => {
    if (!normalizedQuery) return true;
    return [section.label, ...section.en, ...section.tr].join(" ").toLowerCase().includes(normalizedQuery);
  });

  const renderLine = (line, id) => {
    const key = findKey(line);
    if (!key) return line || "—";
    const [before, after] = line.split(key);
    return (
      <button
        type="button"
        className="detail-lyric-annot"
        onClick={() => onSelect({ key, note: notes[key], line })}
        aria-pressed={selectedKey === key}
      >
        {before}
        <span>{key}</span>
        {after}
      </button>
    );
  };

  return (
    <div className="detail-lyrics-table">
      {shareStatus && <div className="detail-share-toast">{shareStatus}</div>}
      <div className="detail-reader-tools">
        <label>
          <span>Satır ara</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kelime, bölüm veya çeviri ara"
          />
        </label>
        <div className="detail-smart-seek" aria-label="Bölümler">
          {sections.map((section, index) => (
            <button
              key={`${section.label}-${index}`}
              type="button"
              className={activeIndex === index ? "is-active" : ""}
              onClick={() => jumpToSection(index)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
      <div className="detail-lyric-sections">
        {visibleSections.map(({ section, index }) => {
          const enText = section.en.join("\n");
          const trText = section.tr.join("\n");
          const enKey = findKey(enText);
          const trKey = findKey(trText);
          const key = trKey || enKey;
          const active = key && selectedKey === key;
          return (
            <article
              className={`detail-lyric-section${active ? " is-active" : ""}`}
              key={`${section.label}-${index}`}
              id={`lyric-section-${index}`}
              data-lyric-section
            >
              <header className="detail-section-head">
                <span className="detail-section-pill">{section.label}</span>
                <i aria-hidden />
                <button type="button" onClick={() => shareSection(section)}>Lyric card</button>
              </header>
              <div className={`detail-section-copy is-${viewMode}`}>
                {viewMode !== "tr" && (
                  <div className="detail-section-col is-en">
                    <span className="detail-col-tag">ORİJİNAL</span>
                    <p className="detail-section-en">{renderLine(enText, `en-${index}`)}</p>
                  </div>
                )}
                {viewMode !== "en" && (
                  <div className="detail-section-col is-tr">
                    <span className="detail-col-tag">TÜRKÇE</span>
                    <p className="detail-section-tr">{renderLine(trText, `tr-${index}`)}</p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="detail-floating-lyrics">
        <span>Görünüm</span>
        <div className="detail-view-mode-tabs">
          <button type="button" className={viewMode === "both" ? "is-active" : ""} onClick={() => setViewMode("both")}>İkisi</button>
          <button type="button" className={viewMode === "en" ? "is-active" : ""} onClick={() => setViewMode("en")}>EN</button>
          <button type="button" className={viewMode === "tr" ? "is-active" : ""} onClick={() => setViewMode("tr")}>TR</button>
        </div>
      </div>
    </div>
  );
}

function LyricsSkeleton() {
  return (
    <div className="detail-lyrics-skeleton" aria-label="Sözler yükleniyor">
      {Array.from({ length: 8 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function DetailVideo({ post, embedUrl, onRead }) {
  if (!embedUrl) return null;
  return (
    <section className="detail-video-section" aria-label="Video ve çeviri">
      <div className="detail-video-copy">
        <span>Video</span>
        <h2 className="font-serif">{post.song}</h2>
        <p>Videoyu izlerken çeviriye tek dokunuşla geç.</p>
        <button type="button" onClick={onRead}>Çeviriyi oku</button>
      </div>
      <div className="detail-video-frame">
        <iframe
          src={embedUrl}
          title={`${post.artist} - ${post.song} video`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
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
        <span>Community</span>
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

export default function LyricDetail() {
  const { slug } = useParams();
  const cleanSlug = (slug || "").replace(/\/$/, "");
  const indexedPost = getPost(cleanSlug);
  const [fullPost, setFullPost] = useState(null);
  const post = indexedPost ? { ...indexedPost, ...fullPost, song: indexedPost.song, no: indexedPost.no, voice: indexedPost.voice } : null;
  const accent = useAlbumColor(post?.cover);
  const readerRef = useRef(null);
  const [shared, setShared] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [readProgress, setReadProgress] = useState(0);

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

  const notes = useMemo(() => (post ? annotationsFor(post.slug) : {}), [post]);
  const noteKeys = useMemo(() => Object.keys(notes), [notes]);

  useEffect(() => {
    if (post) addHistory(post.slug);
  }, [post, slug]);

  useEffect(() => {
    if (!noteKeys.length) {
      setSelectedNote(null);
      return;
    }
    const key = noteKeys[0];
    setSelectedNote({ key, note: notes[key] });
  }, [noteKeys, notes, slug]);

  const sharePost = async () => {
    const url = window.location.href;
    const title = post ? `${post.artist} - ${post.song} | Türkçe çeviri` : "acupoflyrics";
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
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
  const related = sameArtistRelated.length >= 4
    ? sameArtistRelated
    : [
        ...sameArtistRelated,
        ...allPosts.filter((candidate) => (
          candidate.slug !== post.slug &&
          !sameArtistRelated.some((item) => item.slug === candidate.slug) &&
          candidate.category_slugs?.some((slug) => post.category_slugs?.includes(slug))
        )),
        ...allPosts.filter((candidate) => (
          candidate.slug !== post.slug &&
          !sameArtistRelated.some((item) => item.slug === candidate.slug)
        )),
  ].slice(0, 4);
  const artistSlug = artistSlugFor(post);
  const sections = lyricSections(post.blocks);
  const isLyricsLoading = indexedPost && fullPost === null;
  const parsedYear = new Date(post.date).getFullYear();
  const year = Number.isNaN(parsedYear) ? "" : parsedYear;
  const light = !isDark(accent);
  const top = shade(accent, light ? 0.42 : 0.64);
  const bottom = shade(accent, light ? 0.20 : 0.32);
  const tags = post.category_slugs.filter((s) => s !== artistSlug).slice(0, 3);
  const videoEmbedUrl = youtubeEmbedUrl(post.youtubeUrl || post.youtube?.url);
  const scrollToReader = () => readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const albumName = albumNameFor(post);
  const hasAlbum = albumName && albumName !== "Tekli";
  const albumSlug = hasAlbum ? albumSlugFor(`${post.artist}-${albumName}`) : "";

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

            <div className="detail-hero-copy">
              <h1 className="font-serif">{post.song}</h1>
              <div className="detail-artist-line">
                <Link to={artistSlug ? `/sanatci/${artistSlug}` : "/"}>{post.artist}</Link>
              </div>

              <div className="detail-hero-meta">
                <span>◉ Türkçe Çeviri</span>
                {hasAlbum && (
                  <Link to={albumPath(albumSlug)} className="detail-hero-album-link">
                    ◇ {albumName}
                  </Link>
                )}
                {post.reading_time && <span>◷ {post.reading_time} dk okuma</span>}
                {year && <span>▣ {year}</span>}
              </div>

              <div className="detail-actions">
                <button type="button" className="detail-primary-action" onClick={scrollToReader}>
                  Çeviriyi oku
                </button>
                <button type="button" className="detail-ghost-action" onClick={sharePost}>
                  ↗ {shared ? "Kopyalandı" : "Paylaş"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <DetailVideo post={post} embedUrl={videoEmbedUrl} onRead={scrollToReader} />

      <section className={`detail-reading-shell${noteKeys.length > 0 ? " has-notes" : ""}`}>
        <aside className="detail-info-panel">
          <h2 className="font-serif">Şarkı Bilgisi</h2>
          <MetaRow label="Sanatçı" value={post.artist} />
          <MetaRow label="Yayın" value={year ? String(year) : ""} />
          <MetaRow label="Okuma" value={post.reading_time ? `${post.reading_time} dk` : ""} />
          <MetaRow label="Çeviri" value={`No. ${post.no}`} />
          <MetaRow label="Tarih" value={formatDate(post.date)} />
          <div className="detail-tag-block">
            <span>Etiketler</span>
            <div>
              {tags.length ? tags.map((tag) => <b key={tag}>{prettyTag(tag)}</b>) : <b>Türkçe Çeviri</b>}
            </div>
          </div>
          <div className="detail-translator">
            <span aria-hidden />
            <div>
              <strong>melike</strong>
              <small>çeviri ve notlar</small>
            </div>
          </div>
        </aside>

        <div className="detail-reader-column" ref={readerRef}>
          {isLyricsLoading ? (
            <LyricsSkeleton />
          ) : (
            <DetailLyricsTable post={post} sections={sections} notes={notes} selectedKey={selectedNote?.key} onSelect={setSelectedNote} />
          )}

          <div className="detail-reader-signoff" style={{ display: "flex", justifyContent: "flex-end", paddingRight: "16px" }}>
            <time>{formatDate(post.date)}</time>
          </div>
        </div>

        {noteKeys.length > 0 && <AnnotationPanel selected={selectedNote} count={noteKeys.length} />}
      </section>

      <section className="detail-related">
        {related.length > 0 && (
          <>
            <div className="detail-section-heading">
              <h2 className="font-serif">Önerilen çeviriler</h2>
              <span>{sameArtistRelated.length ? `${post.artist} ve aynı dünyadan` : "okumaya devam et"}</span>
            </div>
            <div className="detail-related-grid">
              {related.map((p) => {
                const pr = firstPair(p);
                return (
                  <Link key={p.slug} to={postPath(p)} className="detail-related-card">
                    <img src={p.cover} alt="" loading="lazy" />
                    <span>
                      <strong className="font-serif">{p.song}</strong>
                      <em>“{pr.tr}”</em>
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>

      <SuggestEdit post={post} />

      <button type="button" className="detail-floating-reader-cta" onClick={scrollToReader}>
        Çeviriyi oku
      </button>
      <SiteFooter />
      <MobileTabBar />
    </motion.main>
  );
}
