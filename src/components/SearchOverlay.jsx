import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { trackEvent } from "../lib/analytics";
import { search } from "../lib/content";
import { linesLoaded, loadSearchLines } from "../lib/searchLines";
import { albumPath, artistPath, collectionPath, genrePath, moodPath, searchPath, songPath } from "../lib/paths";

export default function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [linesReady, setLinesReady] = useState(linesLoaded());
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const prevFocus = useRef(null);
  const navigate = useNavigate();
  const results = useMemo(() => search(q), [q, linesReady]);

  // Line-level search data is lazy: fetch it the first time search opens.
  useEffect(() => {
    if (!open || linesReady) return;
    let cancelled = false;
    loadSearchLines().then(() => { if (!cancelled) setLinesReady(true); });
    return () => { cancelled = true; };
  }, [open, linesReady]);

  const go = (to, contentType = "search_result") => {
    trackEvent("select_content", {
      content_type: contentType,
      item_id: to,
    });
    onClose();
    navigate(to);
  };
  const seeAll = () => {
    trackEvent("view_search_results", {
      search_term_length: q.trim().length,
      result_count: results.total,
    });
    onClose();
    navigate(searchPath(q));
  };

  // Flatten grouped results into one navigable list (keeps render order).
  // Each result type resolves to its OWN destination — never the first song.
  const items = useMemo(() => {
    const arr = [];
    results.songs.forEach((p) => arr.push({ id: "opt-s-" + p.slug, run: () => go(songPath(p), "song") }));
    results.lines.forEach(({ post }, i) => arr.push({ id: "opt-l-" + i, run: () => go(songPath(post), "lyric_line") }));
    results.artists.forEach((a) => arr.push({ id: "opt-a-" + a.slug, run: () => go(artistPath(a), "artist") }));
    results.albums.forEach((a) => arr.push({ id: "opt-al-" + a.slug, run: () => go(albumPath(a), "album") }));
    results.collections.forEach((c) => arr.push({ id: "opt-c-" + c.slug, run: () => go(collectionPath(c), "collection") }));
    results.topics.forEach((t) => arr.push({ id: "opt-t-" + t.slug, run: () => go(t.kind === "mood" ? moodPath(t) : genrePath(t), t.kind) }));
    return arr;
  }, [results]);

  // Reset highlight whenever the query changes.
  useEffect(() => { setActive(0); setInteracted(false); }, [q]);

  // Open: reset, focus input, lock scroll, remember the element to restore to.
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    setQ("");
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus?.();
    };
  }, [open]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    const id = items[active]?.id;
    if (!id) return; // empty result list → no "#" selector crash
    const el = listRef.current?.querySelector(`#${CSS.escape(id)}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, items]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setInteracted(true); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setInteracted(true); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      // Default Enter opens the full results page; after arrowing, it follows
      // the highlighted result.
      if (interacted && items[active]) items[active].run();
      else if (q.trim()) seeAll();
    }
  };

  const hl = (text) => {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0 || !q) return text;
    return (<>{text.slice(0, i)}<mark style={{ background: "rgba(214,69,122,0.18)", color: "var(--color-seam-deep)", borderRadius: 3 }}>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>);
  };

  const songOff = 0;
  const lineOff = results.songs.length;
  const artistOff = results.songs.length + results.lines.length;
  const albumOff = artistOff + results.artists.length;
  const collectionOff = albumOff + results.albums.length;
  const topicOff = collectionOff + results.collections.length;
  const total = items.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh", background: "rgba(20,23,31,0.12)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label="Ara"
            initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(560px, 92vw)", background: "rgba(255,255,255,0.86)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 16, boxShadow: "0 30px 70px rgba(16,20,40,0.22), 0 2px 6px rgba(16,20,40,0.08)", overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "15px 18px", borderBottom: "1px solid rgba(20,23,31,0.07)" }}>
              <span aria-hidden style={{ display: "inline-block", width: 16, height: 16, border: "1.6px solid var(--color-muted)", borderRadius: "50%", position: "relative" }}>
                <span style={{ position: "absolute", right: -4, bottom: -3, width: 6, height: 1.6, borderRadius: 2, background: "var(--color-muted)", transform: "rotate(45deg)" }} />
              </span>
              <input
                ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
                role="combobox" aria-expanded={total > 0} aria-controls="search-listbox" aria-autocomplete="list"
                aria-activedescendant={total > 0 ? items[active]?.id : undefined}
                placeholder="şarkı, sanatçı ya da bir dize ara… (iki dilde)"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "var(--color-ink)", fontFamily: "var(--font-sans)" }} />
              <kbd style={{ fontSize: 9, color: "var(--color-faint)", border: "1px solid var(--color-line)", borderRadius: 5, padding: "2px 6px" }}>esc</kbd>
            </div>

            <div ref={listRef} id="search-listbox" role="listbox" aria-label="Sonuçlar" className="no-scrollbar" style={{ maxHeight: "46vh", overflowY: "auto", padding: "8px 0" }}>
              {!q && <Hint />}
              {q && <Group label="Şarkılar" show={results.songs.length}>
                {results.songs.map((p, i) => (
                  <Row key={p.slug} id={"opt-s-" + p.slug} active={active === songOff + i} onActivate={() => setActive(songOff + i)} onClick={() => go(songPath(p), "song")} cover={p.cover}
                    title={hl(p.song)} sub={p.artist} />
                ))}
              </Group>}
              {q && <Group label="Dizeler" show={results.lines.length}>
                {results.lines.map(({ line, post }, i) => (
                  <Row key={i} id={"opt-l-" + i} active={active === lineOff + i} onActivate={() => setActive(lineOff + i)} onClick={() => go(songPath(post), "lyric_line")} quote
                    title={<span className="font-serif" style={{ fontStyle: "italic" }}>“{hl(line)}”</span>} sub={`${post.artist} — ${post.song}`} />
                ))}
              </Group>}
              {q && <Group label="Sanatçılar" show={results.artists.length}>
                {results.artists.map((a, i) => (
                  <Row key={a.slug} id={"opt-a-" + a.slug} active={active === artistOff + i} onActivate={() => setActive(artistOff + i)} onClick={() => go(artistPath(a), "artist")} round cover={a.image}
                    title={a.name} sub={`${a.count} çeviri`} />
                ))}
              </Group>}
              {q && <Group label="Albümler" show={results.albums.length}>
                {results.albums.map((a, i) => (
                  <Row key={a.slug} id={"opt-al-" + a.slug} active={active === albumOff + i} onActivate={() => setActive(albumOff + i)} onClick={() => go(albumPath(a), "album")} cover={a.cover}
                    title={a.name} sub={`${a.artist} — ${a.tracks.length} çeviri`} />
                ))}
              </Group>}
              {q && <Group label="Koleksiyonlar" show={results.collections.length}>
                {results.collections.map((c, i) => (
                  <Row key={c.slug} id={"opt-c-" + c.slug} active={active === collectionOff + i} onActivate={() => setActive(collectionOff + i)} onClick={() => go(collectionPath(c), "collection")} quote
                    title={c.name} sub={`${c.items.length} çeviri`} />
                ))}
              </Group>}
              {q && <Group label="Mood ve Türler" show={results.topics.length}>
                {results.topics.map((t, i) => (
                  <Row key={t.slug} id={"opt-t-" + t.slug} active={active === topicOff + i} onActivate={() => setActive(topicOff + i)} onClick={() => go(t.kind === "mood" ? moodPath(t) : genrePath(t), t.kind)} cover={t.cover}
                    title={t.name} sub={`${t.items.length} öneri · ${t.kind === "mood" ? "Mood" : "Tür"}`} />
                ))}
              </Group>}
              {q && total === 0 && (
                <div style={{ padding: "28px 18px", textAlign: "center", fontSize: 13, color: "var(--color-muted)" }}>
                  <div className="font-serif" style={{ fontSize: 17, fontStyle: "italic", color: "var(--color-ink-soft)", marginBottom: 6 }}>“{q}”</div>
                  bu arama için bir çeviri bulunamadı.
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 18px", borderTop: "1px solid rgba(20,23,31,0.07)", fontSize: 10, color: "var(--color-muted)" }}>
              <span><Key>↑↓</Key> gez</span><span><Key>↵</Key> tüm sonuçlar</span>
              {q.trim() ? (
                <button type="button" onClick={seeAll} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none", cursor: "pointer", fontSize: 11, color: "var(--color-seam-deep)", fontFamily: "var(--font-sans)" }}>
                  “{q}” için tüm sonuçlar →
                </button>
              ) : (
                <span style={{ marginLeft: "auto" }}>her iki dilde arar</span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const Key = ({ children }) => <kbd style={{ border: "1px solid var(--color-line)", borderRadius: 4, padding: "1px 5px", fontFamily: "var(--font-sans)" }}>{children}</kbd>;

function Hint() {
  return <div style={{ padding: "20px 18px", fontSize: 12, color: "var(--color-muted)", lineHeight: 1.7 }}>
    Bir hisle başla — <span style={{ color: "var(--color-ink-soft)" }}>“ateş”, “özlem”, “gece”</span> — ya da sanatçı adıyla. Acupoflyrics hem orijinal sözlerde hem Türkçe çeviride arar.
  </div>;
}
function Group({ label, show, children }) {
  if (!show) return null;
  return <>
    <div style={{ fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-faint)", padding: "10px 18px 6px" }}>{label}</div>
    {children}
  </>;
}
function Row({ id, active, onActivate, onClick, cover, round, quote, title, sub }) {
  return (
    <button id={id} role="option" aria-selected={active} onClick={onClick} onMouseMove={onActivate}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "8px 18px", background: active ? "rgba(214,69,122,0.08)" : "none", border: "none", cursor: "pointer", textAlign: "left", boxShadow: active ? "inset 2px 0 0 var(--color-seam)" : "none" }}>
      {quote ? (
        <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: "#f1f3f8", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-faint)", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>”</span>
      ) : (
        <span style={{ width: 34, height: 34, borderRadius: round ? "50%" : 8, flexShrink: 0, overflow: "hidden", background: "#e7eaf1", boxShadow: "0 4px 12px rgba(16,20,40,0.12)" }}>
          {cover && <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </span>
      )}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, color: "var(--color-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        <span style={{ display: "block", fontSize: 11, color: "var(--color-muted)", marginTop: 1 }}>{sub}</span>
      </span>
    </button>
  );
}
