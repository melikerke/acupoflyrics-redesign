import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchSpotifyTrack, fetchGeniusMatch, publishRecord, refreshCharts } from "../lib/api";
import musicLists from "../data/musicLists.json";
import { postPath } from "../lib/content";
import "../preview.css";

const PLACEHOLDER_COVER = "/covers/the-weeknd-hurry-up-tomorrow-turkce-ceviri.jpg";

// Read (and clear) any publish result stashed before the post-publish reload.
// Done once at module load — before React — so StrictMode's double-mount can't
// race the read against the clear.
const PENDING_PUBLISHED = (() => {
  try {
    const s = sessionStorage.getItem("apl_published");
    if (s) {
      sessionStorage.removeItem("apl_published");
      return JSON.parse(s);
    }
  } catch {
    /* ignore */
  }
  return null;
})();

function formatReleaseDate(date, precision) {
  if (!date) return "Henüz yok";
  if (precision === "day") {
    const d = new Date(date);
    if (!isNaN(d)) {
      return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(d);
    }
  }
  if (precision === "month") {
    const d = new Date(date + "-01");
    if (!isNaN(d)) {
      return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(d);
    }
  }
  return date; // year precision, or anything unexpected
}

// A small "open in Spotify" link — Spotify's developer terms require metadata
// and artwork to link back to the relevant Spotify page.
function SpotifyLink({ href, children = "Spotify’da aç" }) {
  if (!href) return null;
  return (
    <a className="admin-sp-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function Row({ label, children }) {
  return (
    <div className="admin-meta-row">
      <dt>{label}</dt>
      <dd>{children ?? "—"}</dd>
    </div>
  );
}

// Split raw lyrics into stanzas (blank-line separated). A leading "[Verse 1]" /
// "[Chorus]" style line becomes the stanza's section label.
function parseStanzas(text) {
  return (text || "")
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length)
    .map((lines) => {
      const m = lines[0].match(/^\[(.+)\]$/);
      if (m) return { section: m[1], lines: lines.slice(1) };
      return { section: null, lines };
    })
    .filter((s) => s.section || s.lines.length);
}

function normaliseSection(section) {
  return (section || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseNoteLine(line) {
  const raw = line.replace(/^\s*\|\|\|\s*/, "").trim();
  const colon = raw.indexOf(":");
  if (colon < 0) return { word: "", text: raw };
  return {
    word: raw.slice(0, colon).trim().replace(/^["“”']+|["“”']+$/g, ""),
    text: raw.slice(colon + 1).trim(),
  };
}

function parseTranslationBlocks(text) {
  const blocks = [];
  let current = null;

  for (const rawLine of (text || "").split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^\[(.+?)\]$/);
    if (heading) {
      current = { section: heading[1].trim(), lines: [], notes: [] };
      blocks.push(current);
      continue;
    }
    if (!current) {
      if (!line) continue;
      current = { section: null, lines: [], notes: [] };
      blocks.push(current);
    }
    if (line.startsWith("|||")) {
      current.notes.push(parseNoteLine(line));
    } else {
      current.lines.push(rawLine.replace(/\s+$/g, ""));
    }
  }

  return blocks
    .map((block) => ({
      ...block,
      lines: block.lines.join("\n").trim(),
      notes: block.notes.filter((note) => note.text),
    }))
    .filter((block) => block.section || block.lines || block.notes.length);
}

// ---- /listeler yönetimi: tek tuşla Billboard + Circle + Apple + Spotify güncellemesi.
// Dosya yazılınca Vite sayfayı yeniler ve yeni veriler görünür.
function ChartsPanel() {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const run = async () => {
    setRunning(true);
    setError("");
    setSummary(null);
    try {
      const result = await refreshCharts();
      setSummary(result);
    } catch (e) {
      setError(e.message || "Güncelleme başarısız.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="admin-preview-panel admin-charts-panel">
      <div className="admin-preview-panel-head">
        <span className="admin-preview-step">♪</span>
        <div>
          <h2>Müzik listeleri</h2>
          <p>
            Billboard Hot 100, Billboard 200, Circle Chart, Apple Music ve Spotify Global 50
            tek tuşla güncellenir.
          </p>
        </div>
      </div>
      <div className="admin-charts-actions">
        <button className="admin-preview-save" type="button" onClick={run} disabled={running}>
          {running ? "Listeler çekiliyor…" : "Listeleri şimdi güncelle"}
        </button>
        <span className="admin-charts-updated">
          Son güncelleme: {summary?.updated || musicLists.updated}
        </span>
      </div>
      {error && <p className="admin-status admin-status-error admin-charts-status">{error}</p>}
      {summary && (
        <ul className="admin-charts-summary">
          {summary.lists.map((list) => (
            <li key={list.id} className={list.ok ? "is-ok" : "is-fail"}>
              <span aria-hidden>{list.ok ? "✓" : "—"}</span>
              <strong>{list.name}:</strong>
              <span>{list.ok ? `${list.count} şarkı güncellendi` : list.error}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [data, setData] = useState(null); // Spotify bundle
  const [spLoading, setSpLoading] = useState(false);
  const [spError, setSpError] = useState("");

  const [genius, setGenius] = useState(null);
  const [gnLoading, setGnLoading] = useState(false);
  const [gnError, setGnError] = useState("");

  const [translatorNote, setTranslatorNote] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [lyrics, setLyrics] = useState(""); // editable original lyrics (from Genius)
  const [bulkTranslation, setBulkTranslation] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  // Stanza-by-stanza translation editor (built from `lyrics`).
  // Each: { section, original: string[], translation, hasNote, noteWord, noteText }
  const [stanzas, setStanzas] = useState([]);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // Writing posts.json triggers a Vite full reload that resets this page, so the
  // success result is stashed in sessionStorage and re-read on the next mount.
  const [published, setPublished] = useState(PENDING_PUBLISHED);
  const [publishError, setPublishError] = useState("");

  const track = data?.track;
  const artist = data?.artist;
  const album = data?.album;

  // Build the stanza editor from lyrics text, preserving any translations/notes
  // the user already typed (matched by the stanza's original lines).
  const buildStanzas = (textArg) => {
    const parsed = parseStanzas(textArg ?? lyrics);
    setStanzas((prev) => {
      const byKey = new Map(prev.map((s) => [s.original.join("\n"), s]));
      return parsed.map((p) => {
        const old = byKey.get(p.lines.join("\n"));
        return old
          ? { ...old, section: p.section, original: p.lines }
          : { section: p.section, original: p.lines, translation: "", hasNote: false, noteWord: "", noteText: "" };
      });
    });
  };

  const updateStanza = (i, patch) =>
    setStanzas((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const applyBulkTranslation = () => {
    const blocks = parseTranslationBlocks(bulkTranslation);
    if (!blocks.length) {
      setBulkStatus("Yapıştırılan metinde çeviri bloğu bulamadım.");
      return;
    }
    if (!stanzas.length) {
      setBulkStatus("Önce Genius sözlerini çekip kıtalara böl.");
      return;
    }

    const bySection = new Map();
    blocks.forEach((block, index) => {
      const key = normaliseSection(block.section);
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(index);
    });

    const used = new Set();
    let matched = 0;
    let notes = 0;
    const nextStanzas = stanzas.map((stanza) => {
      const key = normaliseSection(stanza.section);
      let blockIndex = bySection.get(key)?.find((index) => !used.has(index)) ?? -1;
      if (blockIndex < 0) blockIndex = blocks.findIndex((_, index) => !used.has(index));
      if (blockIndex < 0) return stanza;

      const block = blocks[blockIndex];
      used.add(blockIndex);
      matched += 1;
      const firstNote = block.notes[0];
      if (firstNote) notes += 1;
      return {
        ...stanza,
        translation: block.lines || stanza.translation,
        hasNote: firstNote ? true : stanza.hasNote,
        noteWord: firstNote ? firstNote.word : stanza.noteWord,
        noteText: firstNote
          ? block.notes.map((note) => note.word ? `${note.word}: ${note.text}` : note.text).join("\n\n")
          : stanza.noteText,
      };
    });

    setStanzas(nextStanzas);

    const unmatched = blocks.length - used.size;
    setBulkStatus(`${matched} kıta yerleştirildi${notes ? `, ${notes} açıklama eklendi` : ""}${unmatched ? `, ${unmatched} blok eşleşmedi` : ""}.`);
  };

  const runGenius = async (artistName, title) => {
    setGnLoading(true);
    setGnError("");
    try {
      const result = await fetchGeniusMatch(artistName, title);
      setGenius(result);
      if (result?.lyrics) {
        setLyrics(result.lyrics);
        buildStanzas(result.lyrics);
      }
    } catch (e) {
      setGnError(e.message);
      setGenius(null);
    } finally {
      setGnLoading(false);
    }
  };

  const loadSpotify = async () => {
    if (!spotifyUrl.trim()) return;
    setSpLoading(true);
    setSpError("");
    setGenius(null);
    setGnError("");
    try {
      const bundle = await fetchSpotifyTrack(spotifyUrl.trim());
      setData(bundle);
      // Chain straight into Genius using the freshly fetched names.
      runGenius(bundle.artist?.name, bundle.track?.name);
    } catch (e) {
      setSpError(e.message);
      setData(null);
    } finally {
      setSpLoading(false);
    }
  };

  // Progress: Spotify fetched · lyrics present · share of stanzas translated.
  const translatedCount = stanzas.filter((s) => s.translation.trim()).length;
  const missingTranslationCount = stanzas.filter((s) => !s.translation.trim()).length;
  const trProgress = stanzas.length ? translatedCount / stanzas.length : 0;
  const completion = Math.round((((data ? 1 : 0) + (lyrics.trim() ? 1 : 0) + trProgress) / 3) * 100);
  const readyToPublish = Boolean(data && stanzas.length > 0 && missingTranslationCount === 0);
  const nextTarget = !data
    ? "spotify-step"
    : !lyrics.trim()
      ? "lyrics-step"
      : !stanzas.length || missingTranslationCount > 0
        ? "translation-step"
        : "publish-step";
  const nextAction = !data
    ? "Spotify şarkı linkini yapıştırıp bilgileri çek."
    : !lyrics.trim()
      ? "Genius eşleşmesini kontrol et veya sözleri manuel yapıştır."
      : !stanzas.length
        ? "Sözleri paragraflara böl."
        : missingTranslationCount > 0
          ? `${missingTranslationCount} kıtanın Türkçe çevirisini tamamla.`
          : "Her şey hazır; çeviriyi siteye ekleyebilirsin.";
  const workflow = [
    { label: "Spotify", done: Boolean(data), detail: data ? `${artist?.name} - ${track?.name}` : "Link bekliyor" },
    { label: "Sözler", done: Boolean(lyrics.trim()), detail: lyrics.trim() ? `${parseStanzas(lyrics).length || stanzas.length} kıta bulundu` : "Genius veya manuel giriş" },
    { label: "Çeviri", done: stanzas.length > 0 && missingTranslationCount === 0, detail: stanzas.length ? `${translatedCount}/${stanzas.length} kıta` : "Bölme bekliyor" },
    { label: "Yayın", done: Boolean(published), detail: readyToPublish ? "Hazır" : "Eksikler var" },
  ];

  const coverPreview = album?.cover || PLACEHOLDER_COVER;
  const titlePreview = track?.name || "Şarkı adı";
  const artistPreview = artist?.name || "Sanatçı";

  // The exported record — stanza-aligned original/translation pairs plus an
  // optional per-stanza note, ready to render on the site.
  const buildRecord = () => ({
    song: track?.name || null,
    artist: artist?.name || null,
    spotify: data,
    genius: genius
      ? { url: genius.song?.url, songId: genius.song?.id, description: genius.description }
      : null,
    stanzas: stanzas.map((s) => ({
      section: s.section || null,
      original: s.original,
      translation: s.translation.split("\n"),
      note: s.hasNote && s.noteText.trim() ? { word: s.noteWord.trim() || null, text: s.noteText.trim() } : null,
    })),
    youtubeUrl: youtubeUrl.trim() || null,
    translatorNote: translatorNote.trim() || null,
    savedAt: new Date().toISOString(),
  });

  const recordJson = () => JSON.stringify(buildRecord(), null, 2);

  const saveDraft = () => {
    if (!data) return;
    const blob = new Blob([recordJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = (artist?.name + "-" + track.name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    a.href = url;
    a.download = `${slug || "ceviri"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(recordJson());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const publish = async () => {
    if (!readyToPublish) return;
    setPublishing(true);
    setPublishError("");
    setPublished(null);
    try {
      const result = await publishRecord(buildRecord());
      try {
        sessionStorage.setItem("apl_published", JSON.stringify(result));
      } catch {
        /* ignore */
      }
      setPublished(result);
    } catch (e) {
      setPublishError(e.message);
    } finally {
      setPublishing(false);
    }
  };

  const jumpTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetFlow = () => {
    setSpotifyUrl("");
    setData(null);
    setSpError("");
    setGenius(null);
    setGnError("");
    setTranslatorNote("");
    setYoutubeUrl("");
    setLyrics("");
    setBulkTranslation("");
    setBulkStatus("");
    setStanzas([]);
    setShowJson(false);
    setCopied(false);
    setPublished(null);
    setPublishError("");
  };

  return (
    <main className="admin-preview-page">
      <nav className="admin-preview-topbar">
        <Link to="/" className="admin-preview-brand font-serif">acupoflyrics</Link>
        <div className="admin-preview-topbar-actions">
          <Link to="/" className="admin-preview-topbar-link">Siteyi gör</Link>
          <Link to="/discover" className="admin-preview-topbar-link">Keşfet</Link>
          <Link to="/listeler" className="admin-preview-topbar-link">Listeler</Link>
        </div>
      </nav>

      <header className="admin-preview-header">
        <div>
          <p className="admin-preview-kicker">acupoflyrics admin</p>
          <h1 className="admin-preview-title">Çeviri akışı</h1>
        </div>
        <div className="admin-preview-header-actions">
          <div className="admin-preview-progress" aria-label={`Taslak yüzde ${completion} hazır`}>
            <span style={{ width: `${completion}%` }} />
          </div>
          <button className="admin-preview-save" type="button" onClick={saveDraft} disabled={!data}>
            Taslağı dışa aktar
          </button>
        </div>
      </header>

      <section className="admin-preview-stats">
        <div className="admin-preview-stat">
          <span>Durum</span>
          <strong>{readyToPublish ? "Yayına hazır" : data ? "Hazırlanıyor" : "Taslak"}</strong>
        </div>
        <div className="admin-preview-stat">
          <span>Hazırlık</span>
          <strong>{completion}%</strong>
        </div>
        <div className="admin-preview-stat">
          <span>Çeviri</span>
          <strong>{stanzas.length ? `${translatedCount}/${stanzas.length} kıta` : "Henüz yok"}</strong>
        </div>
      </section>

      <section className="admin-workbench" aria-label="Admin çalışma durumu">
        <div className="admin-next-card">
          <span>Sıradaki adım</span>
          <strong>{nextAction}</strong>
          <div className="admin-next-actions">
            <button className="admin-preview-save" type="button" onClick={() => jumpTo(nextTarget)}>
              Sıradaki alanı aç
            </button>
            <button className="admin-ghost-btn" type="button" onClick={resetFlow}>
              Yeni çeviri
            </button>
          </div>
        </div>
        <ol className="admin-workflow-list">
          {workflow.map((item, index) => (
            <li key={item.label} className={item.done ? "is-done" : ""}>
              <span>{index + 1}</span>
              <div>
                <strong>{item.label}</strong>
                <em>{item.detail}</em>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="admin-charts-section">
        <ChartsPanel />
      </section>

      <section className="admin-preview-grid">
        <div className="admin-preview-stack">
          {/* ---- 01 · Spotify ---- */}
          <div className="admin-preview-panel" id="spotify-step">
            <div className="admin-preview-panel-head">
              <span className="admin-preview-step">01</span>
              <div>
                <h2>Spotify meta verisi</h2>
                <p>Track linkini yapıştır; şarkı, sanatçı, albüm ve tüm metadata otomatik çekilsin.</p>
              </div>
            </div>

            <label className="admin-preview-field">
              <span>Spotify şarkı linki</span>
              <input
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadSpotify()}
                placeholder="https://open.spotify.com/track/..."
              />
            </label>

            <button className="admin-preview-action" type="button" onClick={loadSpotify} disabled={spLoading}>
              {spLoading ? "Çekiliyor…" : "Spotify’dan bilgileri çek"}
            </button>

            {spError && <p className="admin-status admin-status-error">{spError}</p>}

            {data && (
              <div className="admin-sp-result">
                {/* Track */}
                <div className="admin-sp-section">
                  <div className="admin-sp-section-head">
                    <h3>Şarkı</h3>
                    <SpotifyLink href={track.url} />
                  </div>
                  <dl className="admin-meta-grid">
                    <Row label="Track adı">{track.name}</Row>
                    <Row label="Spotify ID">{track.id}</Row>
                    <Row label="ISRC">{track.isrc}</Row>
                    <Row label="Süre">{track.duration}</Row>
                    <Row label="Explicit">
                      {track.explicit ? <span className="admin-badge admin-badge-explicit">E · Explicit</span> : "Hayır"}
                    </Row>
                    <Row label="Popülerlik">{track.popularity != null ? `${track.popularity}/100` : "—"}</Row>
                  </dl>
                </div>

                {/* Artist */}
                <div className="admin-sp-section">
                  <div className="admin-sp-section-head">
                    <h3>Sanatçı</h3>
                    <SpotifyLink href={artist.url} />
                  </div>
                  <div className="admin-artist-row">
                    {artist.image && (
                      <a href={artist.url} target="_blank" rel="noopener noreferrer">
                        <img className="admin-artist-img" src={artist.image} alt={artist.name} />
                      </a>
                    )}
                    <div className="admin-artist-meta">
                      <strong>{artist.name}</strong>
                      <span className="admin-dim">ID: {artist.id || "—"}</span>
                      <span className="admin-dim">
                        Popülerlik: {artist.popularity != null ? `${artist.popularity}/100` : "—"}
                      </span>
                      {artist.genres?.length > 0 && (
                        <div className="admin-genres">
                          {artist.genres.map((g) => (
                            <span key={g} className="admin-genre">{g}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Album */}
                <div className="admin-sp-section">
                  <div className="admin-sp-section-head">
                    <h3>Albüm</h3>
                    <SpotifyLink href={album.url} />
                  </div>
                  <div className="admin-album-row">
                    {album.cover && (
                      <a href={album.url} target="_blank" rel="noopener noreferrer">
                        <img className="admin-album-cover" src={album.cover} alt={album.name} />
                      </a>
                    )}
                    <dl className="admin-meta-grid admin-meta-grid-tight">
                      <Row label="Albüm">{album.name}</Row>
                      <Row label="Tip">{album.albumType}</Row>
                      <Row label="Çıkış">{formatReleaseDate(album.releaseDate, album.releaseDatePrecision)}</Row>
                      <Row label="Label">{album.label}</Row>
                    </dl>
                  </div>
                  {album.copyrights?.length > 0 && (
                    <div className="admin-copyright">
                      {album.copyrights.map((c, i) => {
                        const sym = c.type === "P" ? "℗" : c.type === "C" ? "©" : "";
                        const alreadyHasSym = /^\s*[©℗]/.test(c.text);
                        return (
                          <p key={i}>
                            {sym && !alreadyHasSym && <span className="admin-copyright-type">{sym}</span>}
                            {c.text}
                          </p>
                        );
                      })}
                    </div>
                  )}

                  {album.tracks?.length > 0 && (
                    <div className="admin-tracklist">
                      <div className="admin-tracklist-head">Albümdeki diğer şarkılar · {album.totalTracks}</div>
                      <ol>
                        {album.tracks.map((t) => (
                          <li key={t.id} className={t.isCurrent ? "admin-track is-current" : "admin-track"}>
                            <span className="admin-track-no">{t.trackNumber}</span>
                            <a className="admin-track-name" href={t.url} target="_blank" rel="noopener noreferrer">
                              {t.name}
                              {t.explicit && <span className="admin-badge-mini">E</span>}
                            </a>
                            <span className="admin-track-dur">{t.duration}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {(track.popularity == null || artist.genres?.length === 0 || !album.label) && (
                  <p className="admin-status admin-status-warn">
                    Not: Popülerlik, sanatçı türleri ve label alanları şu anda Spotify tarafından bu
                    uygulamaya döndürülmüyor (API erişim seviyesi kısıtı). Diğer tüm veriler canlı çekiliyor.
                  </p>
                )}

                <p className="admin-attr">
                  Tüm görseller ve metadata{" "}
                  <a href={track.url} target="_blank" rel="noopener noreferrer">Spotify</a>{" "}
                  tarafından sağlanmıştır.
                </p>
              </div>
            )}
          </div>

          {/* ---- 02 · Genius ---- */}
          <div className="admin-preview-panel" id="lyrics-step">
            <div className="admin-preview-panel-head">
              <span className="admin-preview-step">02</span>
              <div>
                <h2>Genius sözleri</h2>
                <p>Spotify’dan gelen şarkı ve sanatçı adıyla Genius’ta otomatik arama yapılır.</p>
              </div>
            </div>

            <button
              className="admin-preview-action"
              type="button"
              onClick={() => runGenius(artist?.name, track?.name)}
              disabled={!data || gnLoading}
            >
              {gnLoading ? "Aranıyor…" : data ? "Genius’ta tekrar ara" : "Önce Spotify verisini çek"}
            </button>

            {gnError && <p className="admin-status admin-status-error">{gnError}</p>}

            {genius?.matched && (
              <div className="admin-genius-meta">
                <div className="admin-sp-section-head">
                  <h3>
                    Eşleşme: {genius.song.fullTitle || `${genius.song.artist} – ${genius.song.title}`}
                  </h3>
                  <SpotifyLink href={genius.song.url}>Genius’ta aç</SpotifyLink>
                </div>
                {genius.lyricsError && (
                  <p className="admin-status admin-status-warn">
                    Sözler otomatik çekilemedi ({genius.lyricsError}). Genius linkinden manuel kopyalayabilirsin.
                  </p>
                )}
                {genius.description && (
                  <details className="admin-desc">
                    <summary>Genius açıklaması</summary>
                    <p>{genius.description}</p>
                  </details>
                )}
              </div>
            )}

            {genius && !genius.matched && (
              <p className="admin-status admin-status-warn">Genius’ta eşleşen şarkı bulunamadı.</p>
            )}

            <label className="admin-preview-field">
              <span>Orijinal sözler {genius?.lyrics ? "(Genius’tan)" : ""}</span>
              <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={12} placeholder="Sözler burada görünecek…" />
            </label>
          </div>
        </div>

        {/* ---- Live preview ---- */}
        <aside className="admin-preview-live">
          <div className="admin-preview-live-card">
            <div className="admin-preview-live-cover">
              {album?.url ? (
                <a href={album.url} target="_blank" rel="noopener noreferrer">
                  <img src={coverPreview} alt={album?.name || ""} />
                </a>
              ) : (
                <img src={coverPreview} alt="" />
              )}
            </div>
            <div className="admin-preview-live-meta">
              <span>Canlı önizleme</span>
              <h2>{titlePreview}</h2>
              <p>{artistPreview}</p>
            </div>
            <dl className="admin-preview-live-list">
              <div>
                <dt>Albüm</dt>
                <dd>{album?.name || "Henüz yok"}</dd>
              </div>
              <div>
                <dt>Süre</dt>
                <dd>{track?.duration || "Henüz yok"}</dd>
              </div>
              <div>
                <dt>Çıkış</dt>
                <dd>{album ? formatReleaseDate(album.releaseDate, album.releaseDatePrecision) : "Henüz yok"}</dd>
              </div>
              <div>
                <dt>Popülerlik</dt>
                <dd>{track && track.popularity != null ? `${track.popularity}/100` : "Henüz yok"}</dd>
              </div>
            </dl>
          </div>
        </aside>

        {/* ---- 03 · Stanza-by-stanza translation ---- */}
        <div className="admin-preview-panel admin-preview-panel-wide" id="translation-step">
          <div className="admin-preview-panel-head">
            <span className="admin-preview-step">03</span>
            <div>
              <h2>Paragraf paragraf çeviri</h2>
              <p>Her kıtanın orijinalini görerek Türkçesini gir; istersen o kıtaya bir açıklama ekle.</p>
            </div>
          </div>

          <div className="admin-stanza-tools">
            <button
              className="admin-ghost-btn"
              type="button"
              onClick={() => buildStanzas()}
              disabled={!lyrics.trim()}
            >
              {stanzas.length ? "Sözlerden yeniden böl" : "Sözleri paragraflara böl"}
            </button>
            {stanzas.length > 0 && (
              <span className={`admin-stanza-count ${missingTranslationCount ? "is-warn" : "is-ok"}`}>
                {stanzas.length} kıta · {translatedCount} çevrildi
                {missingTranslationCount ? ` · ${missingTranslationCount} eksik` : " · tamam"}
              </span>
            )}
          </div>

          <div className="admin-bulk-translation">
            <label className="admin-preview-field">
              <span>Toplu çeviriyi yapıştır</span>
              <textarea
                value={bulkTranslation}
                onChange={(e) => {
                  setBulkTranslation(e.target.value);
                  setBulkStatus("");
                }}
                rows={8}
                placeholder={"[Verse 1]\nÇeviri satırları...\n||| “kelime”: açıklama\n\n[Chorus]\nÇeviri satırları..."}
              />
            </label>
            <div className="admin-bulk-actions">
              <button
                className="admin-preview-action"
                type="button"
                onClick={applyBulkTranslation}
                disabled={!bulkTranslation.trim() || !stanzas.length}
              >
                Çeviriyi kıtalara dağıt
              </button>
              {bulkStatus && <p className="admin-status admin-status-warn">{bulkStatus}</p>}
            </div>
          </div>

          {stanzas.length === 0 ? (
            <p className="admin-stanza-empty">
              Önce 02’den Genius sözlerini çek (otomatik bölünür) veya sözleri yapıştırıp{" "}
              <strong>“Sözleri paragraflara böl”</strong>e bas.
            </p>
          ) : (
            <div className="admin-stanzas">
              {stanzas.map((s, i) => (
                <div className="admin-stanza" key={i}>
                  {s.section && <div className="admin-stanza-section">{s.section}</div>}
                  <div className="admin-stanza-grid">
                    <div className="admin-stanza-original">
                      {s.original.length ? (
                        s.original.map((line, j) => <p key={j}>{line}</p>)
                      ) : (
                        <p className="admin-dim">(sözsüz kıta)</p>
                      )}
                    </div>
                    <label className="admin-preview-field">
                      <span>Türkçe çeviri</span>
                      <textarea
                        value={s.translation}
                        onChange={(e) => updateStanza(i, { translation: e.target.value })}
                        rows={Math.max(2, s.original.length)}
                        placeholder="Bu kıtanın Türkçesi…"
                      />
                    </label>
                  </div>

                  {s.hasNote ? (
                    <div className="admin-stanza-note">
                      <div className="admin-stanza-note-grid">
                        <label className="admin-preview-field">
                          <span>İlgili söz (opsiyonel)</span>
                          <input
                            value={s.noteWord}
                            onChange={(e) => updateStanza(i, { noteWord: e.target.value })}
                            placeholder="ör. “günah”"
                          />
                        </label>
                        <label className="admin-preview-field">
                          <span>Açıklama</span>
                          <textarea
                            value={s.noteText}
                            onChange={(e) => updateStanza(i, { noteText: e.target.value })}
                            rows={2}
                            placeholder="Çevirmen notu…"
                          />
                        </label>
                      </div>
                      <button
                        className="admin-stanza-note-toggle is-remove"
                        type="button"
                        onClick={() => updateStanza(i, { hasNote: false })}
                      >
                        Açıklamayı kaldır
                      </button>
                    </div>
                  ) : (
                    <button
                      className="admin-stanza-note-toggle"
                      type="button"
                      onClick={() => updateStanza(i, { hasNote: true })}
                    >
                      + Açıklama ekle
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <label className="admin-preview-field admin-stanza-globalnote">
            <span>YouTube linki (opsiyonel)</span>
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>

          <label className="admin-preview-field admin-stanza-globalnote">
            <span>Genel çevirmen notu (opsiyonel)</span>
            <textarea value={translatorNote} onChange={(e) => setTranslatorNote(e.target.value)} rows={3} />
          </label>

          {/* Publish + JSON output */}
          <div className="admin-json-bar" id="publish-step">
            <button className="admin-publish-btn" type="button" onClick={publish} disabled={!readyToPublish || publishing}>
              {publishing ? "Ekleniyor…" : "Siteye ekle"}
            </button>
            <button
              className="admin-ghost-btn"
              type="button"
              onClick={() => setShowJson((v) => !v)}
              disabled={!data}
            >
              {showJson ? "JSON’u gizle" : "JSON’u göster"}
            </button>
            <button className="admin-ghost-btn" type="button" onClick={copyJson} disabled={!data}>
              {copied ? "Kopyalandı ✓" : "JSON’u kopyala"}
            </button>
          </div>

          {data && !readyToPublish && (
            <p className="admin-status admin-status-warn">
              Siteye eklemek için sözleri paragraflara bölüp her kıtaya Türkçe çeviri girmen gerekiyor.
            </p>
          )}
          {publishError && <p className="admin-status admin-status-error">{publishError}</p>}
          {published && (
            <p className="admin-status admin-status-ok">
              {published.updated ? "Güncellendi" : "Siteye eklendi"} ·{" "}
              <Link to={postPath(published.slug)}>Çeviriyi sitede aç →</Link>
            </p>
          )}

          {showJson && data && <pre className="admin-json">{recordJson()}</pre>}
        </div>
      </section>
    </main>
  );
}
