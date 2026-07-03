import { Link } from "react-router-dom";
import { firstPair, formatDate, metricsFor, releaseYear } from "../../lib/content";
import { albumPath, artistPath, collectionPath, genrePath, moodPath, songPath } from "../../lib/paths";
import { Icon } from "./ui";

// SONG → song page. The everyday cover card (cover, song, artist, meta).
export function SongCard({ post, showArtist = true }) {
  const m = metricsFor(post);
  return (
    <Link to={songPath(post)} className="acl-cover-card">
      <img src={post.cover} alt={`${post.artist} — ${post.song}`} loading="lazy" />
      <strong>{post.song}</strong>
      {showArtist && <span>{post.artist}</span>}
      <small>{m.readingTime} dk okuma · {releaseYear(post)}</small>
    </Link>
  );
}

// SONG (rich) → for album track lists. Cover, song, reading time, views, date.
export function TrackCard({ post, index }) {
  const m = metricsFor(post);
  return (
    <Link to={songPath(post)} className="site-track-card">
      <div className="site-track-cover">
        {typeof index === "number" && <span className="site-track-no">{index + 1}</span>}
        <img src={post.cover} alt={`${post.artist} — ${post.song}`} loading="lazy" />
        <span className="site-track-play"><Icon name="play" size={16} /></span>
      </div>
      <strong>{post.song}</strong>
      <span className="site-track-artist">{post.artist}</span>
      <div className="site-track-meta">
        <span><Icon name="clock" size={12} /> {m.readingTime} dk</span>
      </div>
      <time>{formatDate(post.date)}</time>
    </Link>
  );
}

// SONG (row) → compact list line with rank, cover, title, meta.
export function SongRow({ post, index }) {
  const m = metricsFor(post);
  const pair = firstPair(post);
  return (
    <Link to={songPath(post)} className="site-row">
      <span className="site-row-no">{typeof index === "number" ? String(index + 1).padStart(2, "0") : `No. ${post.no}`}</span>
      <span className="site-row-cover"><img src={post.cover} alt="" loading="lazy" /></span>
      <span className="site-row-main">
        <span className="site-row-title">{post.song}</span>
        <span className="site-row-sub font-serif">“{(pair.tr || "").slice(0, 54)}{(pair.tr || "").length > 54 ? "…" : ""}”</span>
      </span>
      <span className="site-row-artist">{post.artist}</span>
      <span className="site-row-stat">{formatDate(post.date)}</span>
      <span className="site-row-stat">{m.readingTime} dk</span>
      <span className="site-row-arrow"><Icon name="arrow" size={15} /></span>
    </Link>
  );
}

// SONG (editorial) → masonry tile: cover + the song's first Turkish line.
// Variable quote length gives the grid organic, masonry-like heights.
export function QuoteCard({ post }) {
  const pair = firstPair(post);
  return (
    <Link to={songPath(post)} className="site-quote-card">
      <div className="site-quote-cover"><img src={post.cover} alt="" loading="lazy" /></div>
      <p className="font-serif">“{pair.tr || pair.en || post.song}”</p>
      <strong>{post.song}</strong>
      <span>{post.artist}</span>
    </Link>
  );
}

// ALBUM → album page. Vertical cover card.
export function AlbumCard({ album }) {
  return (
    <Link to={albumPath(album)} className="site-album-card">
      <div className="site-album-cover">
        <img src={album.cover} alt={`${album.artist} — ${album.name}`} loading="lazy" />
      </div>
      <strong>{album.name}</strong>
      <span>{album.artist}</span>
      <small>{album.tracks.length} çeviri{album.year ? ` · ${album.year}` : ""}</small>
    </Link>
  );
}

// ARTIST → artist page. Round portrait.
export function ArtistCard({ artist }) {
  return (
    <Link to={artistPath(artist)} className="acl-artist-card">
      <img src={artist.image || artist.cover} alt={artist.name} loading="lazy" />
      <strong>{artist.name}</strong>
      <span>{artist.count} çeviri</span>
    </Link>
  );
}

// COLLECTION → collection page. 4-cover collage.
export function CollectionCard({ collection }) {
  const covers = collection.covers || collection.items?.slice(0, 4).map((p) => p.cover) || [];
  return (
    <Link to={collectionPath(collection)} className="acl-collection-card">
      <div className="acl-collection-covers">
        {covers.slice(0, 4).map((c, i) => <img key={i} src={c} alt="" loading="lazy" />)}
      </div>
      <strong>{collection.name}</strong>
      <span>{collection.count ?? collection.items?.length} çeviri</span>
    </Link>
  );
}

// MOOD → mood page. Bleeding image chip.
export function MoodCard({ mood }) {
  return (
    <Link to={moodPath(mood)} className="acl-chip-card">
      {mood.cover && <img src={mood.cover} alt="" loading="lazy" />}
      <span>{mood.name}</span>
      <small>{mood.count ?? mood.items?.length} çeviri</small>
    </Link>
  );
}

// GENRE → genre page. Bleeding image chip.
export function GenreCard({ genre }) {
  return (
    <Link to={genrePath(genre)} className="acl-chip-card">
      {genre.cover && <img src={genre.cover} alt="" loading="lazy" />}
      <span>{genre.name}</span>
      <small>{genre.count ?? genre.items?.length} çeviri</small>
    </Link>
  );
}
