import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  artistFingerprint,
  genreFor,
  getArtist,
  moodFor,
  relatedArtists,
  releaseYear,
  SORT_OPTIONS,
  sortPosts,
} from "../lib/content";
import { artistPath, canonical } from "../lib/paths";
import { useAlbumColor } from "../lib/color";
import { themeFromColor } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Breadcrumbs, FilterBar, Grid, Icon, Section, Shelf } from "../components/site/ui";
import { AlbumCard, ArtistCard, SongCard } from "../components/site/cards";
import NotFound from "../components/site/NotFound";

export default function ArtistPage() {
  const { slug } = useParams();
  const artist = useMemo(() => getArtist(slug), [slug]);
  const color = useAlbumColor(artist?.image || artist?.posts?.[0]?.cover, [44, 34, 52]);
  const theme = useMemo(() => themeFromColor(color), [color]);
  const [sort, setSort] = useState("newest");

  const words = useMemo(() => (artist.posts.length ? artistFingerprint(artist.posts) : []), [artist]);
  const sorted = useMemo(() => sortPosts(artist.posts, sort), [artist.posts, sort]);
  const related = useMemo(() => (artist.posts.length ? relatedArtists(slug) : []), [slug, artist.posts.length]);

  const topGenre = artist.posts.length ? genreFor(artist.posts[0]) : "";
  const topMood = artist.posts.length ? moodFor(artist.posts[0]) : "";
  const bio = artist.posts.length
    ? `${artist.name}, acupoflyrics arşivinde ${artist.count} çeviriyle yer alıyor — ağırlıkla ${topGenre} tınılı, ${topMood.toLowerCase()} hisli parçalar. ${artist.albums.length ? `${artist.albums.length} albüm/EP'den` : "Çeşitli dönemlerden"} şarkılar, sözlerin altındaki anlam ve mecazlarla birlikte tek tek Türkçeye taşındı.`
    : "";

  const path = artistPath(slug);
  useSeo({
    title: artist.posts.length ? `${artist.name} Şarkı Sözleri ve Türkçe Çevirileri | acupoflyrics` : "Sanatçı bulunamadı",
    description: bio,
    path,
    image: artist.image,
    type: "profile",
    breadcrumbs: artist.posts.length
      ? [
          { name: "Ana sayfa", path: "/" },
          { name: "Keşfet", path: "/discover" },
          { name: artist.name, path },
        ]
      : [],
    jsonLd: artist.posts.length
      ? {
          "@context": "https://schema.org",
          "@type": "MusicGroup",
          name: artist.name,
          image: artist.image,
          url: canonical(path),
          ...(artist.spotifyUrl ? { sameAs: [artist.spotifyUrl] } : {}),
        }
      : null,
  });

  if (!artist.posts.length) {
    return <NotFound theme={theme} title="Sanatçı bulunamadı." />;
  }

  return (
    <SiteShell theme={theme}>
      <Breadcrumbs items={[{ name: "Keşfet", path: "/discover" }, { name: artist.name, path }]} />

      <PageHero
        variant="artist"
        bg={artist.image || artist.posts[0].cover}
        portrait={artist.image || artist.posts[0].cover}
        kicker="Sanatçı"
        title={artist.name}
        titleSerif
        description={bio}
        actions={artist.spotifyUrl ? (
          <a className="site-btn-spotify" href={artist.spotifyUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="play" size={15} /> Spotify'da dinle
          </a>
        ) : null}
        stats={[
          { value: artist.count, label: "çeviri", icon: "note" },
          { value: artist.albums.length, label: "albüm", icon: "disc" },
          artist.latestRelease ? { value: releaseYear(artist.latestRelease), label: "son çıkış", icon: "calendar" } : null,
        ].filter(Boolean)}
      />

      {words.length > 0 && (
        <Section title="Dönüp durduğu kelimeler" kicker="Söz parmak izi">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline" }}>
            {words.map((w) => (
              <span key={w.word} className="font-serif" style={{ fontStyle: "italic", fontSize: `${Math.min(34, 16 + w.count)}px`, color: "var(--acl-text)" }}>
                {w.word}
                <sup style={{ fontFamily: "var(--font-sans)", fontStyle: "normal", fontSize: 10, color: "var(--acl-faint)", marginLeft: 3 }}>{w.count}</sup>
              </span>
            ))}
          </div>
        </Section>
      )}

      {artist.albums.length > 0 && (
        <Section title="Albümler" id="albums">
          <Shelf>
            {artist.albums.map((a) => (
              <div key={a.slug} style={{ minWidth: 168 }}><AlbumCard album={a} /></div>
            ))}
          </Shelf>
        </Section>
      )}

      <Section id="songs">
        <div className="site-section-toolbar">
          <div>
            <span className="site-kicker">Bütün katalog</span>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 500 }}>Tüm çeviriler ({artist.count})</h2>
          </div>
          <FilterBar options={SORT_OPTIONS} value={sort} onChange={setSort} />
        </div>
        <Grid min={180}>
          {sorted.map((post) => <SongCard key={post.slug} post={post} showArtist={false} />)}
        </Grid>
      </Section>

      {related.length > 0 && (
        <Section title="İlgili sanatçılar" to="/discover#artists">
          <Grid min={140}>
            {related.map((a) => <ArtistCard key={a.slug} artist={a} />)}
          </Grid>
        </Section>
      )}
    </SiteShell>
  );
}
