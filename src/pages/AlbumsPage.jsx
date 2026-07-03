import { useMemo, useState } from "react";
import { albumIndex, totalPosts } from "../lib/content";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Grid } from "../components/site/ui";
import { AlbumCard } from "../components/site/cards";

const SORTS = [
  { value: "newest", label: "En yeni" },
  { value: "tracks", label: "En çok çeviri" },
  { value: "alpha", label: "A–Z" },
  { value: "artist", label: "Sanatçı" },
];

function sortAlbums(albums, sort) {
  const arr = [...albums];
  switch (sort) {
    case "tracks":
      return arr.sort((a, b) => b.tracks.length - a.tracks.length || new Date(b.releaseDate) - new Date(a.releaseDate));
    case "alpha":
      return arr.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    case "artist":
      return arr.sort((a, b) => a.artist.localeCompare(b.artist, "tr") || new Date(b.releaseDate) - new Date(a.releaseDate));
    case "newest":
    default:
      return arr.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
  }
}

export default function AlbumsPage() {
  const [sort, setSort] = useState("newest");
  const albums = useMemo(() => sortAlbums(albumIndex, sort), [sort]);
  const translated = albumIndex.reduce((sum, a) => sum + a.tracks.length, 0);
  const collage = albumIndex.slice(0, 4).map((a) => a.cover);

  useSeo({
    title: "Albümler — Türkçe Şarkı Çevirileri | acupoflyrics",
    description: `Çevirisi bulunan ${albumIndex.length} albüm: kapaklar, çıkış yılları ve albümdeki tüm Türkçe çeviriler tek sayfada.`,
    path: "/albumler",
    image: collage[0],
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Albümler", path: "/albumler" },
    ],
  });

  return (
    <SiteShell theme={LIGHT_THEME} wide>
      <PageHero
        variant="topic"
        bg={collage[0]}
        collage={collage}
        kicker="Arşiv"
        title="Albümler"
        titleSerif
        description={`Bir şarkı asla tek başına gelmez. ${albumIndex.length} albüm, ${translated} çeviri — dönemleriyle, kapaklarıyla, bağlamıyla.`}
        stats={[
          { value: albumIndex.length, label: "albüm", icon: "disc" },
          { value: translated, label: "çeviri", icon: "note" },
          { value: totalPosts, label: "toplam arşiv", icon: "grid" },
        ]}
      />

      <div className="site-filters" role="group" aria-label="Sırala" style={{ margin: "6px 0 26px", display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SORTS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`site-filter ${sort === option.value ? "is-active" : ""}`}
            onClick={() => setSort(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Grid min={170}>
        {albums.map((album) => <AlbumCard key={album.slug} album={album} />)}
      </Grid>
    </SiteShell>
  );
}
