import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { collections, getCollection } from "../lib/content";
import { canonical, collectionPath } from "../lib/paths";
import { themeFromColor } from "../lib/theme";
import { useAlbumColor } from "../lib/color";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Breadcrumbs, Grid, Icon, Section } from "../components/site/ui";
import { CollectionCard, QuoteCard } from "../components/site/cards";
import NotFound from "../components/site/NotFound";

function CollectionEditorialPanel({ collection }) {
  const sample = collection.items.slice(0, 5);
  return (
    <section className="site-collection-editorial" aria-label="Yıl arşivi özeti">
      <div>
        <span className="site-kicker">Yıl Arşivi</span>
        <h2 className="font-serif">O yılın çevirileri</h2>
        <p>{collection.description}</p>
      </div>
      <div className="site-collection-strip" aria-hidden>
        {sample.map((post) => <img key={post.slug} src={post.cover} alt="" loading="lazy" />)}
      </div>
    </section>
  );
}

export default function CollectionPage() {
  const { slug } = useParams();
  const collection = useMemo(() => getCollection(slug), [slug]);
  const color = useAlbumColor(collection?.cover, [214, 69, 122]);
  const theme = useMemo(() => themeFromColor(color), [color]);
  const others = useMemo(() => collections.filter((c) => c.slug !== slug).slice(0, 8), [slug]);

  const path = collectionPath(slug);
  useSeo({
    title: collection ? `${collection.name} — Türkçe Şarkı Çevirileri | acupoflyrics` : "Yıl arşivi bulunamadı",
    description: collection?.description,
    path,
    image: collection?.cover,
    breadcrumbs: collection
      ? [
          { name: "Ana sayfa", path: "/" },
          { name: "Keşfet", path: "/discover" },
          { name: collection.name, path },
        ]
      : [],
    jsonLd: collection
      ? {
          "@context": "https://schema.org",
          "@type": "MusicPlaylist",
          name: collection.name,
          description: collection.description,
          numTracks: collection.count,
          url: canonical(path),
        }
      : null,
  });

  if (!collection) return <NotFound theme={theme} title="Yıl arşivi bulunamadı." />;

  return (
    <SiteShell theme={theme} wide>
      <Breadcrumbs items={[{ name: "Keşfet", path: "/discover" }, { name: collection.name, path }]} />

      <PageHero
        variant="collection"
        bg={collection.cover}
        collage={collection.covers}
        kicker="Yıl Arşivi"
        title={collection.name}
        titleSerif
        meta={["Çıkış yılına göre", "Türkçe çeviri arşivi"]}
        description={collection.description}
        stats={[
          { value: collection.count, label: "şarkı", icon: "note" },
          { value: `${collection.readingMinutes} dk`, label: "okuma", icon: "clock" },
        ]}
      />

      <CollectionEditorialPanel collection={collection} />

      <Section title="Bu yıldaki çeviriler" kicker="Satır satır">
        <div className="site-masonry">
          {collection.items.map((post) => <QuoteCard key={post.slug} post={post} />)}
        </div>
      </Section>

      {others.length > 0 && (
        <Section title="Diğer yıllar" to="/discover#collections">
          <Grid min={220}>
            {others.map((c) => <CollectionCard key={c.slug} collection={c} />)}
          </Grid>
        </Section>
      )}
    </SiteShell>
  );
}
