import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getMood, moodGroups, SORT_OPTIONS, sortPosts } from "../lib/content";
import { canonical, moodPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Breadcrumbs, FilterBar, Grid, Section } from "../components/site/ui";
import { MoodCard, SongCard } from "../components/site/cards";
import NotFound from "../components/site/NotFound";

const MOOD_SORTS = SORT_OPTIONS.filter((o) => o.value !== "mood");

export default function MoodPage() {
  const { slug } = useParams();
  const mood = useMemo(() => getMood(slug), [slug]);
  const [sort, setSort] = useState("newest");
  const sorted = useMemo(() => (mood ? sortPosts(mood.items, sort) : []), [mood, sort]);
  const others = useMemo(() => moodGroups.filter((m) => m.slug !== slug).slice(0, 8), [slug]);

  const path = moodPath(slug);
  useSeo({
    title: mood ? `${mood.name} Şarkıları — Mood'a Göre Türkçe Çeviriler | acupoflyrics` : "Mood bulunamadı",
    description: mood?.description,
    path,
    image: mood?.cover,
    breadcrumbs: mood
      ? [
          { name: "Ana sayfa", path: "/" },
          { name: "Keşfet", path: "/discover" },
          { name: mood.name, path },
        ]
      : [],
    jsonLd: mood
      ? { "@context": "https://schema.org", "@type": "CollectionPage", name: `${mood.name} mood`, description: mood.description, url: canonical(path) }
      : null,
  });

  if (!mood) return <NotFound theme={LIGHT_THEME} title="Mood bulunamadı." />;

  return (
    <SiteShell theme={LIGHT_THEME} wide>
      <Breadcrumbs items={[{ name: "Keşfet", path: "/discover" }, { name: mood.name, path }]} />

      <PageHero
        variant="topic"
        bg={mood.cover}
        collage={mood.covers}
        kicker="Mood"
        title={mood.name}
        titleSerif
        description={mood.description}
        stats={[
          { value: mood.count, label: "şarkı", icon: "note" },
          { value: `${mood.readingMinutes} dk`, label: "okuma", icon: "clock" },
        ]}
      />

      <Section id="songs">
        <div className="site-section-toolbar">
          <div>
            <span className="site-kicker">Playlist hissi</span>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 500 }}>Bu mood'daki şarkılar ({mood.count})</h2>
          </div>
          <FilterBar options={MOOD_SORTS} value={sort} onChange={setSort} />
        </div>
        <Grid min={180}>
          {sorted.map((post) => <SongCard key={post.slug} post={post} />)}
        </Grid>
      </Section>

      {others.length > 0 && (
        <Section title="Diğer mood'lar" to="/discover#moods">
          <Grid min={150}>
            {others.map((m) => <MoodCard key={m.slug} mood={m} />)}
          </Grid>
        </Section>
      )}
    </SiteShell>
  );
}
