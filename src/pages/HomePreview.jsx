import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  albumShelf,
  artistSpotlight,
  collections,
  firstPair,
  formatDate,
  genreGroups,
  kpopShelf,
  lyricsQuote,
  metricsFor,
  moodGroups,
  newReleases,
  postPath,
  popShelf,
  rapShelf,
  recentlyUpdated,
  releaseYear,
  rockShelf,
  songOfTheDay,
} from "../lib/content";
import { useAlbumColor } from "../lib/color";
import { themeFromColor } from "../lib/theme";
import { latestPopGundemi } from "../data/popGundemi";
import { albumPath, artistPath, collectionPath, discoverPath, genrePath, moodPath, popJournalPath } from "../lib/paths";
import { MobileTabBar, SiteFooter, SiteNav } from "../components/site/SiteShell";
import "../preview.css";
import "../site.css";

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function cleanHeroLine(value) {
  return String(value || "")
    .replace(/\s*\((?:mm[-\s]*|oh[-\s]*|ah[-\s]*)+\)\s*$/i, "")
    .trim();
}

function Hero({ posts, activeIndex, onSelect, onPauseChange }) {
  const post = posts[activeIndex];
  const rawPair = post.heroPair || firstPair(post);
  const pair = {
    en: cleanHeroLine(rawPair.en),
    tr: cleanHeroLine(rawPair.tr),
  };
  const titleClass = pair.tr.length > 64 ? "is-extra-long" : pair.tr.length > 40 ? "is-long" : "";
  const album = post.spotify?.albumName || post.categories?.[1] || "Tekli";
  const year = (post.spotify?.releaseDate || post.date || "").slice(0, 4);
  const spotifyUrl = post.spotify?.track?.url || post.spotify?.trackUrl;
  const previous = () => onSelect((activeIndex - 1 + posts.length) % posts.length);
  const next = () => onSelect((activeIndex + 1) % posts.length);

  return (
    <section
      className="acl-hero"
      onMouseEnter={() => onPauseChange(true)}
      onMouseLeave={() => onPauseChange(false)}
      onFocusCapture={() => onPauseChange(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onPauseChange(false);
      }}
    >
      <img key={`bg-${post.slug}`} className="acl-hero-bg" src={post.cover} alt="" aria-hidden />
      <div className="acl-hero-vignette" aria-hidden />
      <div key={`copy-${post.slug}`} className={`acl-hero-copy ${titleClass}`}>
        <div className="acl-kicker">
          <span>Haftanın Çevirisi</span>
          <i />
        </div>
        <h1 className="font-serif">{pair.tr || post.song}</h1>
        <p className="acl-original">“{pair.en || post.song}”</p>
        <p className="acl-meta">{post.artist} · {album}{year ? `, ${year}` : ""}</p>
        <div className="acl-hero-actions">
          <Link to={postPath(post)} className="acl-primary-btn">
            Çeviriyi oku
            <Arrow />
          </Link>
          {spotifyUrl && (
            <a className="acl-spotify-btn" href={spotifyUrl} target="_blank" rel="noopener noreferrer">
              <span><PlayIcon /></span>
              Dinle
            </a>
          )}
        </div>
      </div>
      <Link key={`art-${post.slug}`} to={postPath(post)} className="acl-hero-art" aria-label={`${post.artist} ${post.song}`}>
        <img src={post.cover} alt={`${post.artist} - ${post.song}`} />
      </Link>
      <div className="acl-hero-count" role="group" aria-label="Haftanın çevirisi slaytları">
        <button type="button" onClick={previous} aria-label="Önceki çeviri">
          <Arrow />
        </button>
        <span aria-live="polite">{activeIndex + 1}</span>
        <i />
        <span>{posts.length}</span>
        <button type="button" onClick={next} aria-label="Sonraki çeviri">
          <Arrow />
        </button>
      </div>
    </section>
  );
}

function SectionHead({ title, to = discoverPath() }) {
  return (
    <div className="acl-section-head">
      <h2>{title}</h2>
      <Link to={to}>Tümünü gör <Arrow /></Link>
    </div>
  );
}

function PopNewsBanner({ article }) {
  if (!article) return null;

  const highlight = article.summary?.[1] || article.excerpt;

  return (
    <section className="acl-news-banner-section" aria-label="Pop gündemi">
      <Link
        to={popJournalPath(article)}
        className="acl-news-banner"
        style={{ "--pop-accent": article.accent || "var(--acl-accent)" }}
      >
        <span className="acl-news-banner-image" aria-hidden>
          <img src={article.image} alt="" loading="lazy" />
        </span>
        <span className="acl-news-banner-copy">
          <span className="acl-news-banner-kicker">Şu an neler oluyor?</span>
          <strong>{article.shortTitle || article.title}</strong>
          <em>{highlight}</em>
        </span>
        <span className="acl-news-banner-action">
          Son durumu oku
          <Arrow />
        </span>
      </Link>
    </section>
  );
}

function RisingSongFeature({ post, article }) {
  if (!post) return null;

  const reason =
    article?.livePanel?.items?.[1]?.text ||
    article?.summary?.[0] ||
    "Dinleme listelerinde yeniden görünür olan şarkı, arama tarafında da yükselişe geçti.";

  return (
    <section className="acl-rising-section" aria-label="Günün yükselen şarkısı">
      <div className="acl-rising-card" style={{ "--pop-accent": article?.accent || "var(--acl-accent)" }}>
        <Link to={postPath(post)} className="acl-rising-cover" aria-label={`${post.artist} ${post.song} çevirisi`}>
          <img src={post.cover} alt={`${post.artist} - ${post.song}`} loading="lazy" />
        </Link>
        <div className="acl-rising-copy">
          <span className="acl-rising-kicker">Günün yükselen şarkısı</span>
          <h2>{post.song}</h2>
          <p>{post.artist} · {releaseYear(post)}</p>
        </div>
        <div className="acl-rising-reason">
          <span>Neden gündemde?</span>
          <p>{reason}</p>
          <div className="acl-rising-actions">
            <Link to={postPath(post)}>Çeviriye git <Arrow /></Link>
            {article && <Link to={popJournalPath(article)}>Gündemi oku</Link>}
          </div>
        </div>
      </div>
    </section>
  );
}

function TranslationCard({ post }) {
  const metrics = metricsFor(post);
  return (
    <Link to={postPath(post)} className="acl-cover-card">
      <img src={post.cover} alt={`${post.artist} - ${post.song}`} loading="lazy" />
      <strong>{post.song}</strong>
      <span>{post.artist}</span>
      <small>{metrics.readingTime} dk okuma · {releaseYear(post)}</small>
    </Link>
  );
}

function NewTranslations({ items }) {
  return (
    <section className="acl-section" id="new-translations">
      <SectionHead title="Yeni Çeviriler" />
      <div className="acl-cover-row">
        {items.map((post) => <TranslationCard key={post.slug} post={post} />)}
        <button className="acl-row-next" type="button" aria-label="Sonraki">
          <Arrow />
        </button>
      </div>
    </section>
  );
}

// Real, date-based lists — no invented view counts or trend scores.
function RankedSection({ newest, updated }) {
  const [activeTab, setActiveTab] = useState("newest");
  const items = activeTab === "newest" ? newest : updated;

  return (
    <section className="acl-section">
      <div className="acl-section-head" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h2>Arşivden</h2>
        <div className="site-filters" style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={`site-filter ${activeTab === "newest" ? "is-active" : ""}`}
            onClick={() => setActiveTab("newest")}
          >
            En Yeniler
          </button>
          <button
            type="button"
            className={`site-filter ${activeTab === "updated" ? "is-active" : ""}`}
            onClick={() => setActiveTab("updated")}
          >
            Son Güncellenenler
          </button>
        </div>
      </div>

      <div className="acl-rank-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
        {items.slice(0, 6).map((p, index) => (
          <Link to={postPath(p)} className="acl-rank-card" key={p.slug} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "12px", border: "1px solid var(--acl-border)", background: "var(--acl-card)", textDecoration: "none", color: "inherit", transition: "transform 0.2s" }}>
            <span style={{ fontSize: "16px", fontWeight: "400", color: "var(--acl-accent)", minWidth: "36px", textAlign: "center", whiteSpace: "nowrap" }}>#{index + 1}</span>
            <img src={p.cover} alt="" loading="lazy" style={{ width: "52px", height: "52px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: "14px", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.song}</strong>
              <span style={{ display: "block", fontSize: "12px", color: "var(--acl-muted)", marginTop: "2px" }}>{p.artist}</span>
              <small style={{ display: "block", fontSize: "11px", color: "var(--acl-faint)", marginTop: "4px" }}>{formatDate(activeTab === "newest" ? p.date : metricsFor(p).updatedDate)}</small>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function GenreFilterShelf() {
  const [activeGenre, setActiveGenre] = useState("Pop");
  
  const items = useMemo(() => {
    if (activeGenre === "Pop") return popShelf;
    if (activeGenre === "Hip Hop") return rapShelf;
    if (activeGenre === "K-pop") return kpopShelf;
    if (activeGenre === "Rock") return rockShelf;
    return [];
  }, [activeGenre]);

  return (
    <section className="acl-section">
      <div className="acl-section-head" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <h2>Türe Göre Çeviriler</h2>
        <div className="site-filters">
          {["Pop", "Hip Hop", "K-pop", "Rock"].map((genre) => (
            <button
              key={genre}
              type="button"
              className={`site-filter ${activeGenre === genre ? "is-active" : ""}`}
              onClick={() => setActiveGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>
      <div className="acl-cover-row">
        {items.slice(0, 8).map((post) => (
          <TranslationCard key={post.slug} post={post} />
        ))}
      </div>
    </section>
  );
}

function Shelf({ title, items, compact = false }) {
  if (!items?.length) return null;
  return (
    <section className={`acl-section ${compact ? "acl-section-compact" : ""}`}>
      <SectionHead title={title} />
      <div className="acl-cover-row">
        {items.slice(0, compact ? 6 : 10).map((post) => <TranslationCard key={post.slug} post={post} />)}
      </div>
    </section>
  );
}

function AlbumShelf({ items }) {
  if (!items?.length) return null;
  return (
    <section className="acl-section" id="albums">
      <SectionHead title="Albümler" to="/albumler" />
      <div className="acl-album-row">
        {items.slice(0, 8).map((album) => (
          <Link to={albumPath(album)} className="acl-album-card" key={album.slug}>
            <img src={album.cover} alt="" loading="lazy" />
            <div>
              <strong>{album.name}</strong>
              <span>{album.artist}</span>
              <small>{album.tracks.length} çeviri · {releaseYear(album.tracks[0])}</small>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CollectionsSection({ items }) {
  return (
    <section className="acl-section">
      <SectionHead title="Yıllara Göre" to="/discover#collections" />
      <div className="acl-collection-grid">
        {items.slice(0, 12).map((collection) => (
          <Link to={collectionPath(collection)} className="acl-collection-card" key={collection.slug}>
            <div className="acl-collection-covers">
              {collection.items.slice(0, 4).map((post) => <img key={post.slug} src={post.cover} alt="" loading="lazy" />)}
            </div>
            <strong>{collection.name}</strong>
            <span>{collection.count || collection.items.length} çeviri</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ArtistSpotlight({ artist }) {
  if (!artist?.posts?.length) return null;
  const main = artist.posts[0];
  return (
    <section className="acl-section">
      <div className="acl-spotlight">
        <img className="acl-spotlight-bg" src={main.cover} alt="" aria-hidden />
        <div className="acl-spotlight-copy">
          <span>Artist Spotlight</span>
          <h2 className="font-serif">{artist.name}</h2>
          <p>{artist.bio}</p>
          <Link to={artistPath(artist)}>Sanatçı sayfası <Arrow /></Link>
        </div>
        <div className="acl-spotlight-songs">
          {artist.posts.slice(0, 4).map((post) => (
            <Link key={post.slug} to={postPath(post)}>
              <img src={post.cover} alt="" loading="lazy" />
              <span>{post.song}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function MagazineSplit({ quote, day }) {
  return (
    <section className="acl-section">
      <div className="acl-magazine-split">
        <Link to={postPath(day)} className="acl-day-card">
          <img src={day.cover} alt="" loading="lazy" />
          <div>
            <span>Günün Şarkısı</span>
            <h2 className="font-serif">{day.song}</h2>
            <p>{day.artist} · {metricsFor(day).readingTime} dk okuma</p>
          </div>
        </Link>
        <Link to={postPath(quote.post)} className="acl-quote-feature">
          <span>Lyrics Quote</span>
          <blockquote className="font-serif">“{quote.line}”</blockquote>
          <p>{quote.post.artist} · {quote.post.song}</p>
          <small>No. {quote.post.no} · {formatDate(quote.post.date)}</small>
        </Link>
      </div>
    </section>
  );
}

function ExploreGrid({ title, groups, type }) {
  if (!groups?.length) return null;
  const to = type === "mood" ? "/discover#moods" : "/discover#genres";
  const pathFor = type === "mood" ? moodPath : genrePath;
  return (
    <section className="acl-section">
      <SectionHead title={title} to={to} />
      <div className="acl-chip-grid">
        {groups.slice(0, 10).map((group) => (
          <Link to={pathFor(group)} className="acl-chip-card" key={group.slug}>
            {group.cover && <img src={group.cover} alt="" loading="lazy" />}
            <span>{group.name}</span>
            <small>{group.items.length} çeviri</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ArtistGrid({ items }) {
  if (!items?.length) return null;
  return (
    <section className="acl-section" id="artists">
      <SectionHead title="Sanatçılar" to="/discover#artists" />
      <div className="acl-artist-grid">
        {items.slice(0, 10).map((artist) => (
          <Link to={artistPath(artist)} className="acl-artist-card" key={artist.slug}>
            <img src={artist.cover} alt="" loading="lazy" />
            <strong>{artist.name}</strong>
            <span>{artist.count} çeviri</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomePreview() {
  const heroPosts = useMemo(() => newReleases.slice(0, 5), []);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const activeHero = heroPosts[heroIndex] || heroPosts[0];
  const color = useAlbumColor(activeHero?.cover, [36, 22, 20]);
  const theme = useMemo(() => themeFromColor(color), [color]);
  const latest = useMemo(() => newReleases.slice(0, 8), []);
  const risingPost = useMemo(
    () => newReleases.find((post) => post.slug === "oasis-wonderwall-turkce-ceviri") || latest[0],
    [latest],
  );

  useEffect(() => {
    if (heroPaused || heroPosts.length < 2) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroPosts.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [heroPaused, heroPosts.length]);

  return (
    <div className={`acl-home ${theme.dark ? "is-dark" : "is-light"}`} style={theme.vars}>
      <SiteNav />
      <main className="acl-shell">
        <div className="acl-main-column" style={{ position: "relative" }}>
          <div className="hero-ambient-glow" />
          <div className="hero-ambient-glow-2" />
          <Hero
            posts={heroPosts}
            activeIndex={heroIndex}
            onSelect={setHeroIndex}
            onPauseChange={setHeroPaused}
          />
          <PopNewsBanner article={latestPopGundemi} />
          <RisingSongFeature post={risingPost} article={latestPopGundemi} />
          <NewTranslations items={latest} />
          <RankedSection newest={newReleases} updated={recentlyUpdated} />
          <GenreFilterShelf />
          <AlbumShelf items={albumShelf} />
          <CollectionsSection items={collections} />
          <ArtistSpotlight artist={artistSpotlight} />
          <MagazineSplit quote={lyricsQuote} day={songOfTheDay} />
          <ExploreGrid title="Mood'a Göre Keşfet" groups={moodGroups} type="mood" />
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
