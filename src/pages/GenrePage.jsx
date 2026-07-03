import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { genreGroups, getGenre, SORT_OPTIONS, sortPosts } from "../lib/content";
import { canonical, genrePath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Breadcrumbs, FilterBar, Grid, Section, Shelf } from "../components/site/ui";
import { AlbumCard, ArtistCard, GenreCard, SongCard } from "../components/site/cards";
import NotFound from "../components/site/NotFound";

const GENRE_SORTS = SORT_OPTIONS.filter((o) => o.value !== "album");

export default function GenrePage() {
  const { slug } = useParams();
  const genre = useMemo(() => getGenre(slug), [slug]);
  const [sort, setSort] = useState("newest");
  const sorted = useMemo(() => (genre ? sortPosts(genre.items, sort) : []), [genre, sort]);
  const others = useMemo(() => genreGroups.filter((g) => g.slug !== slug).slice(0, 8), [slug]);

  const path = genrePath(slug);
  useSeo({
    title: genre ? `${genre.name} Şarkı Sözleri ve Türkçe Çevirileri | acupoflyrics` : "Tür bulunamadı",
    description: genre?.description,
    path,
    image: genre?.cover,
    breadcrumbs: genre
      ? [
          { name: "Ana sayfa", path: "/" },
          { name: "Keşfet", path: "/discover" },
          { name: genre.name, path },
        ]
      : [],
    jsonLd: genre
      ? { "@context": "https://schema.org", "@type": "CollectionPage", name: `${genre.name} çevirileri`, description: genre.description, url: canonical(path) }
      : null,
  });

  if (!genre) return <NotFound theme={LIGHT_THEME} title="Tür bulunamadı." />;

  return (
    <SiteShell theme={LIGHT_THEME} wide>
      <Breadcrumbs items={[{ name: "Keşfet", path: "/discover" }, { name: genre.name, path }]} />

      <PageHero
        variant="topic"
        bg={genre.cover}
        collage={genre.covers}
        kicker="Tür"
        title={genre.name}
        titleSerif
        description={genre.description}
        stats={[
          { value: genre.count, label: "şarkı", icon: "note" },
          { value: genre.featuredArtists.length, label: "sanatçı", icon: "user" },
          { value: genre.albums.length, label: "albüm", icon: "disc" },
        ]}
      />

      {genre.featuredArtists.length > 0 && (
        <Section title="Öne çıkan sanatçılar" kicker="Bu türde" id="artists">
          <Grid min={140}>
            {genre.featuredArtists.map((a) => <ArtistCard key={a.slug} artist={a} />)}
          </Grid>
        </Section>
      )}

      {genre.albums.length > 0 && (
        <Section title="Albümler" id="albums">
          <Shelf>
            {genre.albums.map((a) => (
              <div key={a.slug} style={{ minWidth: 168 }}><AlbumCard album={a} /></div>
            ))}
          </Shelf>
        </Section>
      )}

      <Section id="songs">
        <div className="site-section-toolbar">
          <div>
            <span className="site-kicker">Bütün liste</span>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 500 }}>{genre.name} çevirileri ({genre.count})</h2>
          </div>
          <FilterBar options={GENRE_SORTS} value={sort} onChange={setSort} />
        </div>
        <Grid min={180}>
          {sorted.map((post) => <SongCard key={post.slug} post={post} />)}
        </Grid>
      </Section>

      {others.length > 0 && (
        <Section title="Diğer türler" to="/discover#genres">
          <Grid min={150}>
            {others.map((g) => <GenreCard key={g.slug} genre={g} />)}
          </Grid>
        </Section>
      )}
    </SiteShell>
  );
}
