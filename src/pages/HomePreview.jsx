import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  albumShelf,
  artistSpotlight,
  collections,
  firstPair,
  formatDate,
  genreGroups,
  heroPost,
  kpopShelf,
  lyricsQuote,
  melikePicks,
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
  translatorNotes,
} from "../lib/content";
import upcoming from "../data/upcoming.json";
import { useAlbumColor } from "../lib/color";
import { themeFromColor } from "../lib/theme";
import { albumPath, artistPath, collectionPath, discoverPath, genrePath, moodPath } from "../lib/paths";
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

function Hero({ post }) {
  const pair = firstPair(post);
  const album = post.spotify?.albumName || post.categories?.[1] || "Tekli";
  const year = (post.spotify?.releaseDate || post.date || "").slice(0, 4);
  const spotifyUrl = post.spotify?.track?.url || post.spotify?.trackUrl;

  return (
    <section className="acl-hero">
      <img className="acl-hero-bg" src={post.cover} alt="" aria-hidden />
      <div className="acl-hero-vignette" aria-hidden />
      <div className="acl-hero-copy">
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
      <Link to={postPath(post)} className="acl-hero-art" aria-label={`${post.artist} ${post.song}`}>
        <img src={post.cover} alt={`${post.artist} - ${post.song}`} />
      </Link>
      <div className="acl-hero-count" aria-hidden>
        <span>1</span>
        <i />
        <span>5</span>
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

function PickCard({ item }) {
  const { p, note } = item;
  return (
    <Link to={postPath(p)} className="acl-pick-card">
      <span className="acl-quote-mark">“</span>
      <p>“{note}”</p>
      <div>
        <span className="acl-initial" aria-hidden>m</span>
        <span>melike · {p.artist}</span>
      </div>
    </Link>
  );
}

function EditorsPicks({ items }) {
  return (
    <section className="acl-section" id="editors-picks">
      <SectionHead title="Melike'nin Seçtikleri" />
      <div className="acl-pick-grid">
        {items.map((item) => <PickCard key={item.p.slug} item={item} />)}
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

// Upcoming translations — hand-maintained in src/data/upcoming.json.
function UpcomingSection({ items }) {
  if (!items?.length) return null;
  return (
    <section className="acl-section">
      <SectionHead title="Yakında Gelecek" to={discoverPath()} />
      <div className="acl-upcoming-grid">
        {items.map((item) => (
          <div className="acl-upcoming-card" key={`${item.artist}-${item.song}`}>
            <span className="acl-upcoming-date">{item.date}</span>
            <strong>{item.song}</strong>
            <span className="acl-upcoming-artist">{item.artist}</span>
          </div>
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
      <SectionHead title="Koleksiyonlar" to="/discover#collections" />
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

function DiarySection({ notes }) {
  return (
    <section className="acl-section">
      <SectionHead title="Çevirmen Günlüğü" />
      <div className="acl-diary-grid">
        {notes.slice(0, 3).map((note) => (
          <Link to={postPath(note.p)} className="acl-diary-card" key={`${note.p.slug}-${note.word}`}>
            <span>{note.word}</span>
            <p>{note.note}</p>
            <small>{note.p.artist} · {note.p.song}</small>
          </Link>
        ))}
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
  const color = useAlbumColor(heroPost.cover, [36, 22, 20]);
  const theme = useMemo(() => themeFromColor(color), [color]);
  const latest = useMemo(() => newReleases.slice(0, 8), []);
  const picks = useMemo(() => melikePicks.slice(0, 4), []);

  return (
    <div className={`acl-home ${theme.dark ? "is-dark" : "is-light"}`} style={theme.vars}>
      <SiteNav />
      <main className="acl-shell">
        <div className="acl-main-column" style={{ position: "relative" }}>
          <div className="hero-ambient-glow" />
          <div className="hero-ambient-glow-2" />
          <Hero post={heroPost} />
          <NewTranslations items={latest} />
          <RankedSection newest={newReleases} updated={recentlyUpdated} />
          <GenreFilterShelf />
          <AlbumShelf items={albumShelf} />
          <CollectionsSection items={collections} />
          <ArtistSpotlight artist={artistSpotlight} />
          <MagazineSplit quote={lyricsQuote} day={songOfTheDay} />
          <UpcomingSection items={upcoming} />
          <EditorsPicks items={picks} />
          <DiarySection notes={translatorNotes} />
          <ExploreGrid title="Mood'a Göre Keşfet" groups={moodGroups} type="mood" />
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
