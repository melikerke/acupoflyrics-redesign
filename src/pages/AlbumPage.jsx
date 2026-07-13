import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  formatDate,
  artistAlbums,
  getAlbum,
  moreFromArtist,
  readingMinutes,
} from "../lib/content";
import { albumPath, artistPath, canonical } from "../lib/paths";
import { useAlbumColor } from "../lib/color";
import { themeFromColor } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Breadcrumbs, Grid, Icon, Section, Shelf } from "../components/site/ui";
import { AlbumCard, SongCard, SongRow } from "../components/site/cards";
import NotFound from "../components/site/NotFound";

function AlbumEditorialPanel({ album }) {
  const minutes = readingMinutes(album.tracks);

  return (
    <section className="site-album-editorial" aria-label="Albüm özeti">
      <div className="site-album-note">
        <span className="site-kicker">Albüm Defteri</span>
        <h2 className="font-serif">{album.name} çeviri haritası</h2>
        <p>
          Bu sayfa albümde çevrilmiş parçaları tek yerde toplar. Kapak, albüm adı,
          çıkış tarihi ve Spotify bağlantıları ilgili Spotify sayfalarına bağlı
          kalacak şekilde gösterilir.
        </p>
        <div className="site-album-mini-stats">
          <span><strong>{album.tracks.length}</strong> çeviri</span>
          <span><strong>{album.year || "—"}</strong> yılı</span>
          <span><strong>{minutes} dk</strong> toplam okuma</span>
        </div>
      </div>

      <aside className="site-album-facts">
        <h3>Albüm Bilgisi</h3>
        <dl>
          <div><dt>Sanatçı</dt><dd>{album.artist}</dd></div>
          {album.year && <div><dt>Yıl</dt><dd>{album.year}</dd></div>}
          {album.typeLabel && <div><dt>Tip</dt><dd>{album.typeLabel}</dd></div>}
          {album.label && <div><dt>Label</dt><dd>{album.label}</dd></div>}
        </dl>
        {album.spotifyUrl && (
          <a className="site-album-source" href={album.spotifyUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="play" size={14} /> Spotify albüm sayfası
          </a>
        )}
      </aside>
    </section>
  );
}

export default function AlbumPage() {
  const { slug } = useParams();
  const album = useMemo(() => getAlbum(slug), [slug]);
  const color = useAlbumColor(album?.cover, [40, 30, 46]);
  const theme = useMemo(() => themeFromColor(color), [color]);

  const trackSlugs = useMemo(() => album?.tracks.map((t) => t.slug) || [], [album]);
  const related = useMemo(() => (album ? artistAlbums(album.artistSlug, album.slug).slice(0, 6) : []), [album]);
  const more = useMemo(() => (album ? moreFromArtist(album.artistSlug, trackSlugs, 6) : []), [album, trackSlugs]);

  const path = albumPath(slug);
  useSeo({
    title: album ? `${album.name} — ${album.artist} Albüm Çevirileri | acupoflyrics` : "Albüm bulunamadı",
    description: album?.description,
    path,
    image: album?.cover,
    type: "music.album",
    noindex: Boolean(album && album.tracks.length < 2),
    breadcrumbs: album
      ? [
          { name: "Ana sayfa", path: "/" },
          { name: "Keşfet", path: "/discover" },
          { name: album.artist, path: artistPath(album.artistSlug) },
          { name: album.name, path },
        ]
      : [],
    jsonLd: album
      ? {
          "@context": "https://schema.org",
          "@type": "MusicAlbum",
          name: album.name,
          byArtist: { "@type": "MusicGroup", name: album.artist },
          datePublished: album.releaseDate,
          image: album.cover,
          numTracks: album.tracks.length,
          url: canonical(path),
          track: album.tracks.map((t) => ({ "@type": "MusicRecording", name: t.song, url: canonical(`/${t.slug}/`) })),
        }
      : null,
  });

  if (!album) {
    return <NotFound theme={theme} title="Albüm bulunamadı." />;
  }

  return (
    <SiteShell theme={theme}>
      <Breadcrumbs
        items={[
          { name: "Keşfet", path: "/discover" },
          { name: album.artist, path: artistPath(album.artistSlug) },
          { name: album.name, path },
        ]}
      />

      <PageHero
        variant="album"
        bg={album.cover}
        cover={album.cover}
        kicker={album.typeLabel}
        title={album.name}
        titleSerif
        subtitle={<>
          <Link to={artistPath(album.artistSlug)}>{album.artist}</Link>
          {album.year ? ` · ${album.year}` : ""}
        </>}
        meta={[
          <><Icon name="calendar" size={14} /> {formatDate(album.releaseDate)}</>,
          <><Icon name="note" size={14} /> {album.tracks.length} çeviri</>,
          album.label ? <><Icon name="disc" size={14} /> {album.label}</> : null,
        ].filter(Boolean)}
        description={album.description}
        actions={<>
          {album.spotifyUrl && (
            <a className="site-btn-spotify" href={album.spotifyUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="play" size={15} /> Spotify'da aç
            </a>
          )}
          <Link className="site-btn-ghost" to={artistPath(album.artistSlug)}>
            <Icon name="user" size={15} /> {album.artist}
          </Link>
        </>}
      />

      <AlbumEditorialPanel album={album} />

      <Section title="Çeviriler" kicker="Albüm sırası" id="tracks">
        <div className="site-album-tracklist">
          {album.tracks.map((post, i) => <SongRow key={post.slug} post={post} index={i} />)}
        </div>
      </Section>

      {related.length > 0 && (
        <Section title={`${album.artist}'den daha fazla albüm`} to={artistPath(album.artistSlug)}>
          <Grid min={170}>
            {related.map((a) => <AlbumCard key={a.slug} album={a} />)}
          </Grid>
        </Section>
      )}

      {more.length > 0 && (
        <Section title={`${album.artist}'den dahası`} to={artistPath(album.artistSlug)} action="Sanatçı sayfası">
          <Shelf>
            {more.map((post) => <SongCard key={post.slug} post={post} />)}
          </Shelf>
        </Section>
      )}

    </SiteShell>
  );
}
