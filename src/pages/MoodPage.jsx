import { useMemo } from "react";
import { Link, Navigate, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { getMood, moodGroups, SORT_OPTIONS, sortPosts } from "../lib/content";
import { canonical, moodPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import { fitSeoTitle } from "../lib/meta";
import { collectionNoindex } from "../lib/collectionDescriptions";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Breadcrumbs, FilterBar, Grid, Section } from "../components/site/ui";
import { MoodCard, SongCard } from "../components/site/cards";
import NotFound from "../components/site/NotFound";
import { popularMoodPosts, moodPage, moodPagePath, moodPageTitle } from '../lib/moodCollections.js';

const MOOD_SORTS = [{ value: 'popular', label: 'Aramada öne çıkanlar' }, ...SORT_OPTIONS.filter((o) => o.value !== "mood")];

export default function MoodPage() {
  const { slug, page: pageParam } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mood = useMemo(() => getMood(slug), [slug]);
  const sort = MOOD_SORTS.some(o => o.value === params.get('sort')) ? params.get('sort') : 'popular';
  const sorted = useMemo(() => (mood ? (sort === 'popular' ? popularMoodPosts(mood.items, mood) : sortPosts(mood.items, sort)) : []), [mood, sort]);
  const pagination = moodPage(sorted, pageParam || 1);
  const { page, pageCount, valid, start, items } = pagination;
  const others = useMemo(() => moodGroups.filter((m) => m.slug !== mood?.slug).slice(0, 8), [mood]);

  const path = mood ? moodPagePath(mood, valid ? page : 1) : moodPath(slug);
  const pageLink = number => `${moodPagePath(mood, number)}${sort === 'popular' ? '' : `?sort=${sort}`}#songs`;
  const setSort = value => navigate(`${moodPagePath(mood)}${value === 'popular' ? '' : `?sort=${value}`}#songs`);
  useSeo({
    title: mood ? fitSeoTitle([moodPageTitle(mood, valid ? page : 1)]) : "Mood bulunamadı",
    description: mood?.description,
    noindex: !valid || page > 1 || sort !== 'popular' || collectionNoindex(mood?.items),
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
      ? { "@context": "https://schema.org", "@type": "CollectionPage", name: mood.name, description: mood.description, url: canonical(path) }
      : null,
  });

  if (!mood || !valid) return <NotFound theme={LIGHT_THEME} title="Mood sayfası bulunamadı." />;
  if (slug !== mood.slug || pageParam === '1') return <Navigate to={pageLink(page)} replace />;

  return (
    <SiteShell theme={LIGHT_THEME} wide>
      <Breadcrumbs items={[{ name: "Keşfet", path: "/discover" }, { name: mood.name, path }]} />

      <PageHero
        variant="topic"
        bg={mood.cover}
        collage={mood.covers}
        kicker="Mood"
        title={page === 1 ? mood.name : `${mood.name} · Sayfa ${page}`}
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
        <p aria-live="polite">{start + 1}–{start + items.length} / {mood.count} şarkı · Sayfa {page} / {pageCount}</p>
        <Grid min={180}>
          {items.map((post) => <SongCard key={post.slug} post={post} />)}
        </Grid>
        {pageCount > 1 && <nav className="site-pagination mood-pagination" aria-label={`${mood.name} sayfaları`}>
          {page > 1 && <Link className="site-pagination-edge" rel="prev" to={pageLink(page - 1)}>← Önceki</Link>}
          <div>{Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <Link key={number} to={pageLink(number)} className={number === page ? 'is-active' : ''} aria-current={number === page ? 'page' : undefined} aria-label={`Sayfa ${number}`}>{number}</Link>)}</div>
          {page < pageCount && <Link className="site-pagination-edge" rel="next" to={pageLink(page + 1)}>Sonraki →</Link>}
        </nav>}
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
