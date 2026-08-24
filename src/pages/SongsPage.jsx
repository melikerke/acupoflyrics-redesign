import { Link, Navigate, useParams } from "react-router-dom";
import { allPosts, totalPosts } from "../lib/content";
import { songsPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Breadcrumbs, Grid, Section } from "../components/site/ui";
import { SongCard } from "../components/site/cards";

export const SONGS_PER_PAGE = 48;

export default function SongsPage() {
  const { page: pageParam } = useParams();
  const requestedPage = pageParam ? Number(pageParam) : 1;
  const pageCount = Math.max(1, Math.ceil(totalPosts / SONGS_PER_PAGE));
  const validPage = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= pageCount;
  const page = validPage ? requestedPage : 1;
  const start = (page - 1) * SONGS_PER_PAGE;
  const items = allPosts.slice(start, start + SONGS_PER_PAGE);
  const path = songsPath(page);
  const collage = allPosts.slice(start, start + 6).map((post) => post.cover).filter(Boolean);

  useSeo({
    title: page === 1 ? "Tüm Şarkı Çevirileri | acupoflyrics" : `Şarkı Çevirileri — Sayfa ${page} | acupoflyrics`,
    description: `acupoflyrics arşivindeki ${totalPosts} şarkı çevirisini sayfalı arşivde keşfet. Bu sayfada ${items.length} şarkı bulunuyor.`,
    path,
    image: collage[0],
    noindex: !validPage,
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Tüm şarkılar", path: songsPath() },
      ...(page > 1 ? [{ name: `Sayfa ${page}`, path }] : []),
    ],
  });

  if (!validPage || pageParam === "1") return <Navigate to={songsPath()} replace />;

  return (
    <SiteShell theme={LIGHT_THEME} wide>
      <Breadcrumbs items={[
        { name: "Ana sayfa", path: "/" },
        { name: "Tüm şarkılar", path: songsPath() },
        ...(page > 1 ? [{ name: `Sayfa ${page}`, path }] : []),
      ]} />

      <PageHero
        variant="topic"
        bg={collage[0]}
        collage={collage}
        kicker="Şarkı arşivi"
        title={page === 1 ? "Tüm şarkılar" : `Tüm şarkılar · ${page}`}
        titleSerif
        description={`${totalPosts} çeviri; en yeni eklenenlerden arşivin derinliklerine, tüm şarkılar burada sayfalar hâlinde bir arada.`}
        stats={[
          { value: totalPosts, label: "çeviri", icon: "note" },
          { value: page, label: "sayfa", icon: "grid" },
          { value: pageCount, label: "toplam sayfa", icon: "disc" },
        ]}
      />

      <Section title={page === 1 ? "Arşiv" : `Arşiv · Sayfa ${page}`} kicker={`${start + 1}–${start + items.length}`}>
        <Grid min={170}>
          {items.map((post) => <SongCard key={post.slug} post={post} />)}
        </Grid>
      </Section>

      <nav className="site-pagination" aria-label="Şarkı arşivi sayfaları">
        {page > 1 && <Link className="site-pagination-edge" rel="prev" to={songsPath(page - 1)}>← Önceki</Link>}
        <div>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
            <Link
              key={number}
              to={songsPath(number)}
              className={number === page ? "is-active" : ""}
              aria-current={number === page ? "page" : undefined}
            >
              {number}
            </Link>
          ))}
        </div>
        {page < pageCount && <Link className="site-pagination-edge" rel="next" to={songsPath(page + 1)}>Sonraki →</Link>}
      </nav>
    </SiteShell>
  );
}
