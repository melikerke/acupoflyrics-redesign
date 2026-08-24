import { allArtists, getArtist, totalPosts } from "../lib/content";
import { artistsPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Breadcrumbs, Grid, Section } from "../components/site/ui";
import { ArtistCard } from "../components/site/cards";

const artists = allArtists
  .map((artist) => getArtist(artist.slug))
  .filter((artist) => artist.count > 0)
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"));

export default function ArtistsPage() {
  const collage = artists.map((artist) => artist.image).filter(Boolean).slice(0, 6);

  useSeo({
    title: "Tüm Sanatçılar — Şarkı Çeviri Arşivi | acupoflyrics",
    description: `${artists.length} sanatçıya ait ${totalPosts} şarkı çevirisini sanatçı sayfalarından keşfet; albümlere ve tüm şarkılara doğrudan ulaş.`,
    path: artistsPath(),
    image: collage[0],
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Sanatçılar", path: artistsPath() },
    ],
  });

  return (
    <SiteShell theme={LIGHT_THEME} wide>
      <Breadcrumbs items={[{ name: "Ana sayfa", path: "/" }, { name: "Sanatçılar", path: artistsPath() }]} />
      <PageHero
        variant="topic"
        bg={collage[0]}
        collage={collage}
        kicker="Sanatçı arşivi"
        title="Tüm sanatçılar"
        titleSerif
        description={`${artists.length} sanatçı sayfası; her sanatçının tüm çevirileri ve albümleri tek bir dizinde.`}
        stats={[
          { value: artists.length, label: "sanatçı", icon: "user" },
          { value: totalPosts, label: "çeviri", icon: "note" },
        ]}
      />
      <Section title="Sanatçılar" kicker="A–Z ve arşiv bağlantıları">
        <Grid min={140}>
          {artists.map((artist) => <ArtistCard key={artist.slug} artist={artist} />)}
        </Grid>
      </Section>
    </SiteShell>
  );
}
