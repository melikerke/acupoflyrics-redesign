import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import listsData from "../data/musicLists.json";
import { allPosts, formatDate, totalPosts } from "../lib/content";
import { searchPath, songPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import PageHero from "../components/site/PageHero";
import { Icon } from "../components/site/ui";

// Try to match a chart entry to a translation in the archive.
function findTranslation(entry) {
  const title = entry.title.toLowerCase();
  return allPosts.find(
    (p) =>
      p.song.toLowerCase() === title &&
      entry.artist.toLowerCase().includes(p.artist.toLowerCase().split(" ")[0]),
  ) || allPosts.find((p) => p.song.toLowerCase() === title);
}

export default function MusicListsPage() {
  const [activeId, setActiveId] = useState(listsData.lists[0].id);
  const active = listsData.lists.find((l) => l.id === activeId);

  const matches = useMemo(() => {
    const map = new Map();
    for (const list of listsData.lists) {
      for (const entry of list.entries) {
        map.set(`${list.id}-${entry.rank}`, findTranslation(entry));
      }
    }
    return map;
  }, []);

  const collage = useMemo(
    () => listsData.lists
      .flatMap((list) => list.entries.map((entry) => matches.get(`${list.id}-${entry.rank}`)?.cover || entry.cover))
      .filter(Boolean)
      .slice(0, 4),
    [matches],
  );

  useSeo({
    title: "Müzik Listeleri — Billboard, Circle Chart, Spotify | acupoflyrics",
    description: "Dünya genelindeki popüler müzik listelerini takip et; listedeki şarkıların Türkçe çevirilerini acupoflyrics arşivinde bul.",
    path: "/listeler",
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Müzik Listeleri", path: "/listeler" },
    ],
  });

  return (
    <SiteShell theme={LIGHT_THEME} wide>
      <PageHero
        variant="topic"
        bg={collage[0]}
        collage={collage}
        kicker="Global müzik listeleri · otomatik güncelleme"
        title="Müzik Listeleri"
        titleSerif
        description={`Dünya genelindeki en popüler şarkıları takip et; ${totalPosts} çevirilik arşivde karşılığını bul.`}
        stats={[
          { value: listsData.lists.length, label: "liste", icon: "note" },
          { value: listsData.lists.reduce((sum, l) => sum + l.entries.length, 0), label: "şarkı", icon: "disc" },
          { value: formatDate(listsData.updated), label: "son güncelleme", icon: "calendar" },
        ]}
      />

      <div className="site-filters" role="tablist" aria-label="Listeler" style={{ margin: "10px 0 26px", display: "flex", flexWrap: "wrap", gap: 8 }}>
        {listsData.lists.map((list) => (
          <button
            key={list.id}
            type="button"
            role="tab"
            aria-selected={activeId === list.id}
            className={`site-filter ${activeId === list.id ? "is-active" : ""}`}
            onClick={() => setActiveId(list.id)}
          >
            {list.name}
          </button>
        ))}
      </div>

      <section className="acl-section" aria-live="polite">
        <div className="acl-section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ margin: 0 }}>{active.name}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--acl-muted, #666)" }}>{active.description}</p>
          </div>
          <a href={active.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
            Resmi listeye git <Icon name="arrow" size={14} />
          </a>
        </div>

        <div className="site-rows" style={{ marginTop: 18 }}>
          {active.entries.map((entry) => {
            const post = matches.get(`${active.id}-${entry.rank}`);
            const cover = post?.cover || entry.cover;
            return (
              <div key={entry.rank} className="site-row" style={{ cursor: "default" }}>
                <span className="site-row-no">{String(entry.rank).padStart(2, "0")}</span>
                <span className="site-row-cover">
                  {cover && <img src={cover} alt="" loading="lazy" />}
                </span>
                <span className="site-row-main">
                  <span className="site-row-title">{entry.title}</span>
                  <span className="site-row-sub">{entry.artist}</span>
                </span>
                <span className="site-row-artist" />
                {post ? (
                  <Link to={songPath(post)} className="site-row-stat" style={{ whiteSpace: "nowrap" }}>
                    Çeviriyi oku →
                  </Link>
                ) : (
                  <Link to={searchPath(entry.title)} className="site-row-stat" style={{ whiteSpace: "nowrap", opacity: 0.7 }}>
                    Çeviri ara
                  </Link>
                )}
                <span className="site-row-arrow" />
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: 22, fontSize: 12, color: "var(--acl-faint, #999)" }}>
          Listeler kaynaklardan otomatik güncellenir · Son güncelleme: {formatDate(listsData.updated)}
        </p>
      </section>
    </SiteShell>
  );
}
