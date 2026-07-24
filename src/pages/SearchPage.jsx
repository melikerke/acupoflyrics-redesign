import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { allPosts, searchAll } from "../lib/content";
import { trackEvent } from "../lib/analytics";
import { loadSearchLines } from "../lib/searchLines";
import { searchPath, songPath } from "../lib/paths";
import { LIGHT_THEME } from "../lib/theme";
import { useSeo } from "../lib/seo";
import SiteShell from "../components/site/SiteShell";
import { Grid, Icon, Section } from "../components/site/ui";
import { AlbumCard, ArtistCard, CollectionCard, GenreCard, MoodCard, SongCard } from "../components/site/cards";

function highlight(text, q) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="site-search-mark">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [term, setTerm] = useState(q);
  const [fullLines, setFullLines] = useState([]);

  // Keep the URL (?q=) in sync so results are shareable, without spamming history.
  useEffect(() => {
    const id = setTimeout(() => {
      if (term !== q) setParams(term ? { q: term } : {}, { replace: true });
    }, 200);
    return () => clearTimeout(id);
  }, [term]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => searchAll(q), [q]);
  const lineResults = fullLines.length ? fullLines : results.lines;
  const visibleTotal = results.total - results.lines.length + lineResults.length;

  useEffect(() => {
    if (!q.trim()) {
      setFullLines([]);
      return;
    }
    let cancelled = false;
    // Lazy line data: slug → all lyric lines (much lighter than posts.json).
    loadSearchLines()
      .then((linesMap) => {
        if (cancelled) return;
        const query = q.toLowerCase();
        const lines = [];
        for (const post of allPosts) {
          if (lines.length >= 24) break;
          const hit = (linesMap[post.slug] || []).find((line) => line.toLowerCase().includes(query));
          if (hit) lines.push({ line: hit, post });
        }
        setFullLines(lines);
      })
      .catch(() => {
        if (!cancelled) setFullLines(results.lines);
      });
    return () => { cancelled = true; };
  }, [q, results.lines]);

  useSeo({
    title: q ? `“${q}” için arama sonuçları | acupoflyrics` : "Arama | acupoflyrics",
    description: q
      ? `“${q}” aramasıyla eşleşen şarkılar, sanatçılar, albümler, koleksiyonlar, türler ve mood'lar.`
      : "Şarkı, sanatçı, albüm, koleksiyon, tür ya da bir dize ara — iki dilde.",
    path: searchPath(q),
    noindex: true,
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Arama", path: searchPath() },
    ],
  });

  return (
    <SiteShell theme={LIGHT_THEME} wide>
      <div style={{ paddingTop: 28 }}>
        <span className="site-kicker">Arama</span>
        <h1 className="font-serif" style={{ margin: "0 0 18px", fontSize: "clamp(34px,5vw,58px)", fontWeight: 300 }}>
          Ne arıyorsun?
        </h1>
        <form
          className="site-search-form"
          onSubmit={(e) => {
            e.preventDefault();
            const cleaned = term.trim();
            if (cleaned) {
              trackEvent("view_search_results", {
                search_term_length: cleaned.length,
                result_count: visibleTotal,
              });
            }
            setParams(cleaned ? { q: cleaned } : {});
          }}
        >
          <Icon name="search" size={18} />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="şarkı, sanatçı, albüm ya da bir dize…"
            aria-label="Ara"
          />
        </form>
        {q && <p className="site-search-count">{visibleTotal} sonuç · “{q}”</p>}
      </div>

      {q && visibleTotal === 0 && (
        <div className="site-empty">
          <p className="font-serif">“{q}” için sonuç yok.</p>
          <span>Başka bir kelime ya da bir his dene — “gece”, “özlem”, “aşk”.</span>
        </div>
      )}

      {results.songs.length > 0 && (
        <Section title={`Şarkılar (${results.songs.length})`}>
          <Grid min={180}>{results.songs.map((p) => <SongCard key={p.slug} post={p} />)}</Grid>
        </Section>
      )}

      {results.artists.length > 0 && (
        <Section title={`Sanatçılar (${results.artists.length})`}>
          <Grid min={140}>{results.artists.map((a) => <ArtistCard key={a.slug} artist={a} />)}</Grid>
        </Section>
      )}

      {results.albums.length > 0 && (
        <Section title={`Albümler (${results.albums.length})`}>
          <Grid min={170}>{results.albums.map((a) => <AlbumCard key={a.slug} album={a} />)}</Grid>
        </Section>
      )}

      {results.collections.length > 0 && (
        <Section title={`Koleksiyonlar (${results.collections.length})`}>
          <Grid min={220}>{results.collections.map((c) => <CollectionCard key={c.slug} collection={c} />)}</Grid>
        </Section>
      )}

      {results.genres.length > 0 && (
        <Section title={`Türler (${results.genres.length})`}>
          <Grid min={150}>{results.genres.map((g) => <GenreCard key={g.slug} genre={g} />)}</Grid>
        </Section>
      )}

      {results.moods.length > 0 && (
        <Section title={`Mood'lar (${results.moods.length})`}>
          <Grid min={150}>{results.moods.map((m) => <MoodCard key={m.slug} mood={m} />)}</Grid>
        </Section>
      )}

      {lineResults.length > 0 && (
        <Section title={`Dizeler (${lineResults.length})`}>
          <div className="site-rows">
            {lineResults.map(({ line, post }, i) => (
              <Link key={`${post.slug}-${i}`} to={songPath(post)} className="site-row">
                <span className="site-row-no">”</span>
                <span className="site-row-cover"><img src={post.cover} alt="" loading="lazy" /></span>
                <span className="site-row-main">
                  <span className="site-row-sub font-serif" style={{ fontStyle: "italic", whiteSpace: "normal" }}>“{highlight(line, q)}”</span>
                </span>
                <span className="site-row-artist">{post.artist}</span>
                <span className="site-row-stat">{post.song}</span>
                <span className="site-row-stat" />
                <span className="site-row-arrow"><Icon name="arrow" size={15} /></span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {!q && (
        <div className="site-empty" style={{ paddingTop: 30 }}>
          <span>Bir hisle başla — Acupoflyrics hem orijinal sözlerde hem Türkçe çeviride arar.</span>
        </div>
      )}
    </SiteShell>
  );
}
