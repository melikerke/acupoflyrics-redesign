import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { MobileTabBar, SiteFooter, SiteNav } from "../components/site/SiteShell";
import {
  allPosts,
  albumNameFor,
  albumSlugFor,
  annotationsFor,
  creditedArtistsFor,
  firstPair,
  formatDate,
  getPost,
  postPath,
  relatedTo,
} from "../lib/content";
import { albumPath } from "../lib/paths";
import { addHistory } from "../lib/history";
import { isDark, rgb, shade, useAlbumColor, useAlbumPalette } from "../lib/color";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="detail-meta-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ArtistLinks({ artists }) {
  if (!artists?.length) return null;
  return (
    <span className="detail-artist-links">
      {artists.map((artist, index) => (
        <span key={artist.slug || artist.name} className="detail-artist-link-item">
          {index > 0 && <span className="detail-artist-separator">,</span>}
          <Link to={artist.slug ? `/sanatci/${artist.slug}` : "/"}>{artist.name}</Link>
        </span>
      ))}
    </span>
  );
}

function lyricSections(blocks) {
  const out = [];
  let pendingEn = [];
  let pendingLabel = "";
  let verseCount = 0;
  let chorusCount = 0;
  let sectionCount = 0;
  const seenTranslations = new Map();

  const labelFor = (trLines) => {
    sectionCount += 1;
    const key = trLines.join(" / ").toLowerCase();
    const seen = seenTranslations.get(key) || 0;
    seenTranslations.set(key, seen + 1);
    if (seen > 0 || trLines.some((line) => /nakarat|chorus/i.test(line))) {
      chorusCount += 1;
      return chorusCount === 1 ? "Chorus" : `Chorus ${chorusCount}`;
    }
    if (sectionCount === 1 && trLines.length <= 4) return "Intro";
    if (sectionCount % 4 === 0) {
      chorusCount += 1;
      return chorusCount === 1 ? "Chorus" : `Chorus ${chorusCount}`;
    }
    if (sectionCount % 4 === 3) return "Pre-Chorus";
    verseCount += 1;
    return `Verse ${verseCount}`;
  };

  for (const block of Array.isArray(blocks) ? blocks : []) {
    const lines = Array.isArray(block.lines) ? block.lines : [];
    if (block.original) {
      pendingEn = lines.slice();
      pendingLabel = block.label || "";
      continue;
    }
    out.push({
      label: block.label || pendingLabel || labelFor(lines),
      en: pendingEn.filter(Boolean),
      tr: lines.filter(Boolean),
    });
    pendingEn = [];
    pendingLabel = "";
  }
  return out.filter((section) => section.en.length || section.tr.length);
}

function youtubeEmbedUrl(url) {
  if (!url) return null;
  const raw = String(url).trim();
  const id =
    raw.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/)?.[1] ||
    raw.match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1] ||
    raw.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/)?.[1] ||
    null;
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

function AnnotationDialog({ selected, onClose }) {
  if (!selected) return null;
  return (
    <div className="detail-note-modal" role="dialog" aria-modal="true" aria-label="Kelime açıklaması">
      <button type="button" className="detail-note-backdrop" aria-label="Açıklamayı kapat" onClick={onClose} />
      <div className="detail-note-popover">
        <button type="button" className="detail-note-close" aria-label="Açıklamayı kapat" onClick={onClose}>×</button>
        <div>
          <div className="detail-selected-label">Seçili ifade</div>
          <h3 className="font-serif">“{selected.display || selected.key}”</h3>
          <p>{selected.note}</p>
          {selected.line && (
            <div className="detail-note-source">
              <span>satır</span>
              <em>“{selected.line}”</em>
            </div>
          )}
          <div className="detail-signature">
            <span aria-hidden />
            melike
          </div>
        </div>
      </div>
    </div>
  );
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const CARD_MAX_LINES = 3;

function cardLanguageLabel(language) {
  return language === "tr" ? "Türkçe" : "Original";
}

function lyricCardFilename(post, card) {
  return `${post.artist}-${post.song}-${card.section.label}-${card.language}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "lyric-card";
}

function cssRgb(color) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function mixColor(from, to, amount) {
  return from.map((value, index) => Math.round(value + (to[index] - value) * amount));
}

function cardThemeColors(color) {
  const base = mixColor(color, [9, 10, 14], 0.68);
  const shadow = shade(base, 0.46);
  const glow = mixColor(color, [245, 238, 226], 0.12);
  const stroke = mixColor(color, [255, 244, 224], 0.22);
  return { base, shadow, glow, stroke };
}

function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCover(ctx, image, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 26);
  ctx.clip();
  if (image) ctx.drawImage(image, x, y, size, size);
  else {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

function drawNoise(ctx, width, height) {
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  ctx.save();
  for (let i = 0; i < 1600; i += 1) {
    const alpha = random() * 0.045;
    const light = random() > 0.45;
    ctx.fillStyle = light ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(random() * width, random() * height, 1.2, 1.2);
  }
  ctx.restore();
}

async function createLyricCardBlob({ post, card }) {
  const selectedLines = card.selectedLines.length ? card.selectedLines : ["..."];
  const cover = await loadCanvasImage(post.cover);
  const color = card.color || [218, 60, 120];
  const theme = cardThemeColors(color);
  const scale = 2;
  const designWidth = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = designWidth;
  let ctx = canvas.getContext("2d");
  await document.fonts?.load?.("620 42px Hanken Grotesk");
  await document.fonts?.load?.("850 30px Hanken Grotesk");
  const sans = "Hanken Grotesk, Inter, Helvetica Neue, Arial, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
  ctx.font = `620 42px ${sans}`;
  const lyricLines = selectedLines.flatMap((selectedLine, index) => {
    const lines = wrapCanvasText(ctx, selectedLine, 820).slice(0, 3);
    return index < selectedLines.length - 1 ? [...lines, ""] : lines;
  });
  while (lyricLines[lyricLines.length - 1] === "") lyricLines.pop();
  const lineHeight = 55;
  const blockHeight = lyricLines.reduce((height, line) => height + (line ? lineHeight : 18), 0);
  const designHeight = Math.min(1180, Math.max(760, blockHeight + 600));
  canvas.width = designWidth * scale;
  canvas.height = designHeight * scale;
  ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const bg = ctx.createLinearGradient(0, 0, designWidth, designHeight);
  bg.addColorStop(0, cssRgb(theme.base));
  bg.addColorStop(1, cssRgb(theme.shadow));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, designWidth, designHeight);

  const glowY = designHeight * 0.68;
  const glow = ctx.createRadialGradient(780, glowY, 20, 780, glowY, 640);
  glow.addColorStop(0, `rgba(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]}, 0.34)`);
  glow.addColorStop(0.48, `rgba(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]}, 0.13)`);
  glow.addColorStop(1, `rgba(${theme.shadow[0]}, ${theme.shadow[1]}, ${theme.shadow[2]}, 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, designWidth, designHeight);

  const vignette = ctx.createRadialGradient(540, designHeight * 0.5, 120, 540, designHeight * 0.5, 780);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, designWidth, designHeight);
  drawNoise(ctx, designWidth, designHeight);

  ctx.fillStyle = "#f7f3ec";
  ctx.font = `850 30px ${sans}`;
  ctx.fillText("acupoflyrics", 112, 132);

  ctx.fillStyle = "#f7f3ec";
  ctx.font = "700 82px Georgia, serif";
  ctx.fillText("“", 112, 278);

  ctx.font = `620 42px ${sans}`;
  const lyricAreaTop = 330;
  const lyricAreaBottom = designHeight - 330;
  let y = Math.round(lyricAreaTop + Math.max(0, lyricAreaBottom - lyricAreaTop - blockHeight) / 2) + 36;
  const firstLyricLine = lyricLines.find(Boolean);
  for (const line of lyricLines) {
    if (!line) {
      y += 18;
      continue;
    }
    ctx.font = line === firstLyricLine ? `720 42px ${sans}` : `560 42px ${sans}`;
    ctx.fillText(line, 112, y);
    y += lineHeight;
  }

  const metaRuleY = designHeight - 202;
  const metaGradient = ctx.createLinearGradient(112, 0, 660, 0);
  metaGradient.addColorStop(0, `rgba(${theme.stroke[0]}, ${theme.stroke[1]}, ${theme.stroke[2]}, 0.48)`);
  metaGradient.addColorStop(1, "rgba(247,243,236,0)");
  ctx.strokeStyle = metaGradient;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(112, metaRuleY);
  ctx.lineTo(660, metaRuleY);
  ctx.stroke();

  drawCover(ctx, cover, 748, designHeight - 330, 300);

  ctx.fillStyle = "#f7f3ec";
  ctx.font = `820 31px ${sans}`;
  ctx.fillText(post.song, 112, designHeight - 154);
  ctx.fillStyle = "rgba(247,243,236,0.66)";
  ctx.font = `650 23px ${sans}`;
  ctx.fillText(post.artist, 112, designHeight - 119);
  const albumMeta = post.spotify?.album?.name ? `${new Date(post.spotify?.album?.releaseDate || post.date).getFullYear()} • ${post.spotify.album.name}` : "";
  if (albumMeta && !albumMeta.includes("NaN")) {
    ctx.fillStyle = "rgba(247,243,236,0.48)";
    ctx.font = `650 18px ${sans}`;
    ctx.fillText(albumMeta, 112, designHeight - 88);
  }

  ctx.strokeStyle = "rgba(247,243,236,0.16)";
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, 968, designHeight - 112);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.96);
  });
}

function DetailLyricsTable({ post, sections, notes, selectedKey, onSelect, cardPalette }) {
  const [viewMode, setViewMode] = useState("both");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardDraft, setCardDraft] = useState(null);
  const [cardStatus, setCardStatus] = useState("");
  const [cardBusy, setCardBusy] = useState(false);
  const keys = Object.keys(notes);
  const findKey = (line) => {
    if (!line) return undefined;
    const normalizedLine = line.toLocaleLowerCase("tr-TR");
    return keys.find((key) => normalizedLine.includes(key.toLocaleLowerCase("tr-TR")));
  };
  const normalizedQuery = query.trim().toLowerCase();
  const activeSection = sections[activeIndex] || sections[0];

  useEffect(() => {
    const onScroll = () => {
      const nodes = [...document.querySelectorAll("[data-lyric-section]")];
      if (!nodes.length) return;
      const current = nodes.reduce((best, node, index) => {
        const distance = Math.abs(node.getBoundingClientRect().top - 138);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Infinity });
      setActiveIndex(current.index);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  const jumpToSection = (index) => {
    document.getElementById(`lyric-section-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCard = (section, language) => {
    const lines = section[language].filter(Boolean);
    setCardStatus("");
    setCardDraft({
      section,
      language,
      colorIndex: 0,
      selected: lines.slice(0, CARD_MAX_LINES).map((_, index) => index),
    });
  };

  const setCardLanguage = (language) => {
    setCardStatus("");
    setCardDraft((draft) => {
      if (!draft) return draft;
      const lines = draft.section[language].filter(Boolean);
      return {
        ...draft,
        language,
        selected: lines.slice(0, CARD_MAX_LINES).map((_, index) => index),
      };
    });
  };

  const toggleCardLine = (index) => {
    setCardStatus("");
    setCardDraft((draft) => {
      if (!draft) return draft;
      if (draft.selected.includes(index)) {
        return { ...draft, selected: draft.selected.filter((item) => item !== index) };
      }
      if (draft.selected.length >= CARD_MAX_LINES) {
        setCardStatus("En fazla 3 satır seçebilirsin.");
        return draft;
      }
      return { ...draft, selected: [...draft.selected, index].sort((a, b) => a - b) };
    });
  };

  const setCardColor = (colorIndex) => {
    setCardStatus("");
    setCardDraft((draft) => (draft ? { ...draft, colorIndex } : draft));
  };

  const buildCard = (draft) => {
    if (!draft) return null;
    const lines = draft.section[draft.language].filter(Boolean);
    const selectedLines = draft.selected.map((index) => lines[index]).filter(Boolean);
    const palette = cardPalette?.length ? cardPalette : [[218, 60, 120], [30, 215, 96], [38, 40, 56]];
    const colorIndex = Math.min(draft.colorIndex || 0, palette.length - 1);
    return {
      ...draft,
      colorIndex,
      color: palette[colorIndex],
      lines,
      palette,
      selectedLines,
    };
  };

  const shareCard = async () => {
    const card = buildCard(cardDraft);
    if (!card) return;
    const text = `${post.artist} - ${post.song}\n${card.section.label} · ${cardLanguageLabel(card.language)}\n\n${card.selectedLines.join("\n")}\n\nacupoflyrics`;
    setCardBusy(true);
    setCardStatus("");
    try {
      const blob = await createLyricCardBlob({ post, card });
      const file = new File([blob], `${lyricCardFilename(post, card)}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${post.song} - ${card.section.label}`, text });
      } else if (navigator.share) {
        await navigator.share({ title: `${post.song} - ${card.section.label}`, text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
        setCardStatus("Kart metni kopyalandı.");
      }
    } catch {
      /* user cancelled or sharing unavailable */
    } finally {
      setCardBusy(false);
    }
  };

  const downloadCard = async () => {
    const card = buildCard(cardDraft);
    if (!card) return;
    setCardBusy(true);
    setCardStatus("");
    try {
      const blob = await createLyricCardBlob({ post, card });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${lyricCardFilename(post, card)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setCardStatus("PNG indirildi.");
    } finally {
      setCardBusy(false);
    }
  };

  const visibleSections = sections.map((section, index) => ({ section, index })).filter(({ section }) => {
    if (!normalizedQuery) return true;
    return [section.label, ...section.en, ...section.tr].join(" ").toLowerCase().includes(normalizedQuery);
  });

  const renderLine = (line, id) => {
    const key = findKey(line);
    if (!key) return line || "—";
    const match = line.match(new RegExp(escapeRegExp(key), "i"));
    if (!match || match.index == null) return line || "—";
    const before = line.slice(0, match.index);
    const marked = line.slice(match.index, match.index + match[0].length);
    const after = line.slice(match.index + match[0].length);
    return (
      <button
        type="button"
        className="detail-lyric-annot"
        onClick={() => onSelect({ key, display: marked, note: notes[key], line })}
        aria-pressed={selectedKey === key}
      >
        {before}
        <span>{marked}</span>
        {after}
      </button>
    );
  };

  return (
    <div className="detail-lyrics-table">
      <div className="detail-reader-tools">
        <label>
          <span>Satır ara</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Kelime, bölüm veya çeviri ara"
          />
        </label>
        <div className="detail-smart-seek" aria-label="Bölümler">
          {sections.map((section, index) => (
            <button
              key={`${section.label}-${index}`}
              type="button"
              className={activeIndex === index ? "is-active" : ""}
              onClick={() => jumpToSection(index)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
      <div className="detail-lyric-sections">
        {visibleSections.map(({ section, index }) => {
          const enText = section.en.join("\n");
          const trText = section.tr.join("\n");
          const enKey = findKey(enText);
          const trKey = findKey(trText);
          const key = trKey || enKey;
          const active = key && selectedKey === key;
          const hasEn = section.en.some(Boolean);
          const hasTr = section.tr.some(Boolean);
          return (
            <article
              className={`detail-lyric-section${active ? " is-active" : ""}`}
              key={`${section.label}-${index}`}
              id={`lyric-section-${index}`}
              data-lyric-section
            >
              <header className="detail-section-head">
                <span className="detail-section-pill">{section.label}</span>
                <i aria-hidden />
              </header>
              <div className={`detail-section-copy is-${viewMode}`}>
                {viewMode !== "tr" && (
                  <div className="detail-section-col is-en">
                    <div className="detail-col-head">
                      <span className="detail-col-tag">ORİJİNAL</span>
                      {hasEn && <button type="button" onClick={() => openCard(section, "en")}>Lyric card</button>}
                    </div>
                    <p className="detail-section-en">{renderLine(enText, `en-${index}`)}</p>
                  </div>
                )}
                {viewMode !== "en" && (
                  <div className="detail-section-col is-tr">
                    <div className="detail-col-head">
                      <span className="detail-col-tag">TÜRKÇE</span>
                      {hasTr && <button type="button" onClick={() => openCard(section, "tr")}>Lyric card</button>}
                    </div>
                    <p className="detail-section-tr">{renderLine(trText, `tr-${index}`)}</p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="detail-floating-lyrics">
        <span>Görünüm</span>
        <div className="detail-view-mode-tabs">
          <button type="button" className={viewMode === "both" ? "is-active" : ""} onClick={() => setViewMode("both")}>İkisi</button>
          <button type="button" className={viewMode === "en" ? "is-active" : ""} onClick={() => setViewMode("en")}>EN</button>
          <button type="button" className={viewMode === "tr" ? "is-active" : ""} onClick={() => setViewMode("tr")}>TR</button>
        </div>
      </div>
      {cardDraft && (() => {
        const card = buildCard(cardDraft);
        if (!card) return null;
        const previewHeight = Math.min(540, Math.max(380, 318 + card.selectedLines.join(" ").length * 1.05));
        const previewTheme = cardThemeColors(card.color);
        const albumMeta = post.spotify?.album?.name
          ? `${new Date(post.spotify?.album?.releaseDate || post.date).getFullYear()} • ${post.spotify.album.name}`
          : "";
        return (
        <div className="detail-card-modal" role="dialog" aria-modal="true" aria-label="Lyric card önizleme">
          <button className="detail-card-backdrop" type="button" aria-label="Kapat" onClick={() => setCardDraft(null)} />
          <div className="detail-card-dialog">
            <div className="detail-card-language-switch" aria-label="Kart dili">
              <button type="button" className={card.language === "tr" ? "is-active" : ""} onClick={() => setCardLanguage("tr")}>TR</button>
              <button type="button" className={card.language === "en" ? "is-active" : ""} onClick={() => setCardLanguage("en")}>EN</button>
            </div>
            <div className="detail-card-swatches" aria-label="Kart rengi">
              {card.palette.map((color, colorIndex) => (
                <button
                  key={color.join("-")}
                  type="button"
                  className={card.colorIndex === colorIndex ? "is-active" : ""}
                  style={{ background: rgb(color) }}
                  onClick={() => setCardColor(colorIndex)}
                  aria-label={`Renk ${colorIndex + 1}`}
                />
              ))}
            </div>
            <div
              className={`detail-card-preview is-${card.language}`}
              style={{
                "--card-tone": rgb(card.color),
                "--card-bg": rgb(previewTheme.base),
                "--card-shadow": rgb(previewTheme.shadow),
                "--card-shadow-deep": rgb(previewTheme.shadow, 0.58),
                "--card-glow": rgb(previewTheme.glow, 0.34),
                "--card-glow-soft": rgb(previewTheme.glow, 0.13),
                "--card-stroke": rgb(previewTheme.stroke),
                "--card-stroke-soft": rgb(previewTheme.stroke, 0.38),
                "--card-preview-height": `${previewHeight}px`,
              }}
            >
              <div className="detail-card-brand">
                <span>acupoflyrics</span>
              </div>
              <img src={post.cover} alt="" className="detail-card-cover" />
              <div className="detail-card-lines">
                {card.selectedLines.map((line, lineIndex) => (
                  <p key={`${line}-${lineIndex}`}>{line}</p>
                ))}
              </div>
              <strong>{post.song}<em>{post.artist}</em>{albumMeta && !albumMeta.includes("NaN") ? <small>{albumMeta}</small> : null}</strong>
            </div>
            <div className="detail-card-line-picker" aria-label="Kart satırları">
              {card.lines.map((line, lineIndex) => (
                <button
                  key={`${line}-${lineIndex}`}
                  type="button"
                  className={card.selected.includes(lineIndex) ? "is-selected" : ""}
                  onClick={() => toggleCardLine(lineIndex)}
                >
                  {line}
                </button>
              ))}
            </div>
            <div className="detail-card-actions">
              <button type="button" onClick={downloadCard} disabled={cardBusy || !card.selectedLines.length}>
                PNG indir
              </button>
              <button type="button" onClick={shareCard} disabled={cardBusy || !card.selectedLines.length}>
                Paylaş
              </button>
              <button type="button" className="is-ghost" onClick={() => setCardDraft(null)}>
                Kapat
              </button>
            </div>
            {cardStatus && <p className="detail-card-status">{cardStatus}</p>}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function LyricsSkeleton() {
  return (
    <div className="detail-lyrics-skeleton" aria-label="Sözler yükleniyor">
      {Array.from({ length: 8 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function DetailVideo({ post, embedUrl, onRead }) {
  if (!embedUrl) return null;
  return (
    <section className="detail-video-section" aria-label="Video ve çeviri">
      <div className="detail-video-copy">
        <span>Video</span>
        <h2 className="font-serif">{post.song}</h2>
        <p>Videoyu izlerken çeviriye tek dokunuşla geç.</p>
        <button type="button" onClick={onRead}>Çeviriyi oku</button>
      </div>
      <div className="detail-video-frame">
        <iframe
          src={embedUrl}
          title={`${post.artist} - ${post.song} video`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}

// Suggestions go straight to the translator's inbox — no silent localStorage
// black hole.
function SuggestEdit({ post }) {
  const [text, setText] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    const subject = `Çeviri önerisi: ${post.artist} - ${post.song}`;
    const body = `${text.trim()}\n\n—\nŞarkı: ${post.artist} - ${post.song}\nSayfa: ${window.location.href}`;
    window.location.href = `mailto:acupoflyrics55@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section className="detail-suggest-edit">
      <div>
        <span>Community</span>
        <h2 className="font-serif">Düzeltme veya çeviri öner</h2>
        <p>Eksik, daha iyi çevrilebilir ya da açıklama isteyen bir yer varsa yaz — e-posta olarak bana ulaşır.</p>
      </div>
      <form onSubmit={submit}>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Örn. Chorus 2'de şu ifade daha doğal olabilir..." />
        <button type="submit">E-postayla gönder</button>
      </form>
    </section>
  );
}

function Stars({ value, onChange, disabled = false }) {
  return (
    <div className="detail-stars" aria-label={`${value} yıldız`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? "is-active" : ""}
          onClick={() => onChange?.(star)}
          disabled={disabled}
          aria-label={`${star} yıldız`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function CommentsSection({ post }) {
  const [comments, setComments] = useState([]);
  const [form, setForm] = useState({ name: "", body: "", rating: 5, website: "" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("");
    fetch(`/api/comments?slug=${encodeURIComponent(post.slug)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Yorumlar yüklenemedi.");
        return data;
      })
      .then((data) => {
        if (!cancelled) setComments(Array.isArray(data.comments) ? data.comments : []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => { cancelled = true; };
  }, [post.slug]);

  const average = comments.length
    ? (comments.reduce((sum, comment) => sum + Number(comment.rating || 0), 0) / comments.length).toFixed(1)
    : "";

  const update = (key, value) => {
    setStatus("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, slug: post.slug }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Yorum eklenemedi.");
      setComments((current) => [data.comment, ...current]);
      setForm({ name: "", body: "", rating: 5, website: "" });
      setStatus("Yorumun eklendi.");
    } catch (error) {
      setStatus(error.message || "Yorum eklenemedi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="detail-comments" aria-label="Yorumlar">
      <div className="detail-comments-head">
        <div>
          <span>Okur yorumları</span>
          <h2 className="font-serif">Bu çeviri sende nasıl kaldı?</h2>
        </div>
        {average && (
          <div className="detail-rating-summary">
            <strong>{average}</strong>
            <span>{comments.length} yorum</span>
          </div>
        )}
      </div>

      <form onSubmit={submit}>
        <input
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="İsim"
          maxLength={48}
          required
        />
        <Stars value={form.rating} onChange={(rating) => update("rating", rating)} />
        <textarea
          value={form.body}
          onChange={(event) => update("body", event.target.value)}
          placeholder="Yorumunu yaz..."
          maxLength={900}
          required
        />
        <input
          className="detail-comment-honeypot"
          value={form.website}
          onChange={(event) => update("website", event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <button type="submit" disabled={busy}>{busy ? "Ekleniyor" : "Yorum yap"}</button>
        {status && <p className="detail-comment-status">{status}</p>}
      </form>

      <div className="detail-comment-list">
        {comments.length ? comments.map((comment) => (
          <article key={comment.id} className="detail-comment-card">
            <header>
              <strong>{comment.name}</strong>
              <Stars value={Number(comment.rating) || 0} disabled />
            </header>
            <p>{comment.body}</p>
            {comment.createdAt && <time>{formatDate(comment.createdAt)}</time>}
          </article>
        )) : (
          <p className="detail-comment-empty">İlk yorum senden gelsin.</p>
        )}
      </div>
    </section>
  );
}

export default function LyricDetail() {
  const { slug } = useParams();
  const cleanSlug = (slug || "").replace(/\/$/, "");
  const indexedPost = getPost(cleanSlug);
  const [fullPost, setFullPost] = useState(null);
  const post = indexedPost ? { ...indexedPost, ...fullPost, song: indexedPost.song, no: indexedPost.no, voice: indexedPost.voice } : null;
  const accent = useAlbumColor(post?.cover);
  const cardPalette = useAlbumPalette(post?.cover, [accent, shade(accent, 0.72), shade(accent, 0.46)]);
  const readerRef = useRef(null);
  const [shared, setShared] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    if (!indexedPost) return;
    let cancelled = false;
    setFullPost(null);
    // Per-song JSON — no need to download the whole archive for one lyric.
    fetch(`/data/posts/${indexedPost.slug}.json`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("post yüklenemedi"))))
      .then((item) => {
        if (!cancelled) setFullPost(item || {});
      })
      .catch(() => {
        if (!cancelled) setFullPost({});
      });
    return () => { cancelled = true; };
  }, [indexedPost]);

  useEffect(() => {
    const onScroll = () => {
      const el = readerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalHeight = rect.height - window.innerHeight;
      if (totalHeight <= 0) {
        setReadProgress(0);
        return;
      }
      const currentProgress = Math.min(Math.max(0, -rect.top / totalHeight), 1);
      setReadProgress(currentProgress);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const notes = useMemo(() => (post ? { ...annotationsFor(post.slug), ...(post.annotations || {}) } : {}), [post]);

  useEffect(() => {
    if (post) addHistory(post.slug);
  }, [post, slug]);

  useEffect(() => {
    setSelectedNote(null);
  }, [slug]);

  const sharePost = async () => {
    const url = window.location.href;
    const title = post ? `${post.artist} - ${post.song} | Türkçe çeviri` : "acupoflyrics";
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* user cancelled */
    }
  };

  if (!post) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p className="font-serif" style={{ fontSize: 22, fontStyle: "italic" }}>Çeviri bulunamadı.</p>
          <Link to="/" style={{ color: "var(--color-muted)" }}>← ana sayfa</Link>
        </div>
      </main>
    );
  }

  const sameArtistRelated = relatedTo(post, 4);
  const related = sameArtistRelated.length >= 4
    ? sameArtistRelated
    : [
        ...sameArtistRelated,
        ...allPosts.filter((candidate) => (
          candidate.slug !== post.slug &&
          !sameArtistRelated.some((item) => item.slug === candidate.slug) &&
          candidate.category_slugs?.some((slug) => post.category_slugs?.includes(slug))
        )),
        ...allPosts.filter((candidate) => (
          candidate.slug !== post.slug &&
          !sameArtistRelated.some((item) => item.slug === candidate.slug)
        )),
  ].slice(0, 4);
  const artistLinks = creditedArtistsFor(post);
  const sections = lyricSections(post.blocks);
  const isLyricsLoading = indexedPost && fullPost === null;
  const parsedYear = new Date(post.date).getFullYear();
  const year = Number.isNaN(parsedYear) ? "" : parsedYear;
  const light = !isDark(accent);
  const top = shade(accent, light ? 0.42 : 0.64);
  const bottom = shade(accent, light ? 0.20 : 0.32);
  const tags = [post.artist, post.song].filter(Boolean);
  const videoEmbedUrl = youtubeEmbedUrl(post.youtubeUrl || post.youtube?.url);
  const scrollToReader = () => readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const albumName = albumNameFor(post);
  const hasAlbum = albumName && albumName !== "Tekli";
  const albumSlug = hasAlbum ? albumSlugFor(`${post.artist}-${albumName}`) : "";

  const cssVars = {
    "--detail-accent": rgb(accent),
    "--detail-accent-soft": rgb(accent, 0.11),
    "--detail-accent-line": rgb(accent, 0.36),
    "--detail-accent-deep": rgb(shade(accent, light ? 0.44 : 0.62)),
    "--detail-hero-top": rgb(top),
    "--detail-hero-bottom": rgb(bottom),
    "--acl-bg": "#071012",
    "--acl-bg-soft": "#0b1518",
    "--acl-surface": "rgba(16, 24, 28, 0.72)",
    "--acl-card": "rgba(22, 30, 35, 0.66)",
    "--acl-text": "#f7f3ec",
    "--acl-muted": "rgba(247, 243, 236, 0.70)",
    "--acl-faint": "rgba(247, 243, 236, 0.52)",
    "--acl-border": "rgba(255, 255, 255, 0.09)",
    "--acl-accent": rgb(accent),
    "--acl-accent-soft": rgb(accent, 0.18),
    "--acl-glow": rgb(accent, 0.18),
    "--acl-shadow": "rgba(0, 0, 0, 0.34)",
  };

  return (
    <motion.main
      className="lyric-detail-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={cssVars}
    >
      <SiteNav />
      <div className="detail-reading-progress" aria-hidden>
        <span style={{ transform: `scaleX(${readProgress})`, background: "var(--detail-accent)" }} />
      </div>
      <header className="detail-hero">
        <img src={post.cover} alt="" aria-hidden className="detail-hero-bg" />
        <div className="detail-hero-wash" aria-hidden />
        <img src={post.cover} alt="" aria-hidden className="detail-hero-art" />

        <div className="detail-hero-inner">
          <div className="detail-hero-grid">
            <motion.div className="detail-cover">
              <img src={post.cover} alt={`${post.artist} - ${post.song}`} />
            </motion.div>

            <div className="detail-hero-copy">
              <h1 className="font-serif">{post.song}</h1>
              <div className="detail-artist-line">
                <ArtistLinks artists={artistLinks} />
              </div>

              <div className="detail-hero-meta">
                <span>◉ Türkçe Çeviri</span>
                {hasAlbum && (
                  <Link to={albumPath(albumSlug)} className="detail-hero-album-link">
                    ◇ {albumName}
                  </Link>
                )}
                {post.reading_time && <span>◷ {post.reading_time} dk okuma</span>}
                {year && <span>▣ {year}</span>}
              </div>

              <div className="detail-actions">
                <button type="button" className="detail-primary-action" onClick={scrollToReader}>
                  Çeviriyi oku
                </button>
                <button type="button" className="detail-ghost-action" onClick={sharePost}>
                  ↗ {shared ? "Kopyalandı" : "Paylaş"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <DetailVideo post={post} embedUrl={videoEmbedUrl} onRead={scrollToReader} />

      <section className="detail-reading-shell">
        <aside className="detail-info-panel">
          <h2 className="font-serif">Şarkı Bilgisi</h2>
          <MetaRow label="Sanatçı" value={<ArtistLinks artists={artistLinks} />} />
          <MetaRow label="Yayın" value={year ? String(year) : ""} />
          <MetaRow label="Okuma" value={post.reading_time ? `${post.reading_time} dk` : ""} />
          <MetaRow label="Tarih" value={formatDate(post.date)} />
          <div className="detail-tag-block">
            <span>Etiketler</span>
            <div>
              {tags.length ? tags.map((tag) => <b key={tag}>{tag}</b>) : <b>Türkçe Çeviri</b>}
            </div>
          </div>
          <div className="detail-translator">
            <span aria-hidden />
            <div>
              <strong>melike</strong>
              <small>çeviri ve notlar</small>
            </div>
          </div>
        </aside>

        <div className="detail-reader-column" ref={readerRef}>
          {isLyricsLoading ? (
            <LyricsSkeleton />
          ) : (
            <DetailLyricsTable post={post} sections={sections} notes={notes} selectedKey={selectedNote?.key} onSelect={setSelectedNote} cardPalette={cardPalette} />
          )}

          <div className="detail-reader-signoff" style={{ display: "flex", justifyContent: "flex-end", paddingRight: "16px" }}>
            <time>{formatDate(post.date)}</time>
          </div>
        </div>

      </section>

      <AnnotationDialog selected={selectedNote} onClose={() => setSelectedNote(null)} />

      <section className="detail-related">
        {related.length > 0 && (
          <>
            <div className="detail-section-heading">
              <h2 className="font-serif">Önerilen çeviriler</h2>
              <span>{sameArtistRelated.length ? `${post.artist} ve aynı dünyadan` : "okumaya devam et"}</span>
            </div>
            <div className="detail-related-grid">
              {related.map((p) => {
                const pr = firstPair(p);
                return (
                  <Link key={p.slug} to={postPath(p)} className="detail-related-card">
                    <img src={p.cover} alt="" loading="lazy" />
                    <span>
                      <strong className="font-serif">{p.song}</strong>
                      <em>“{pr.tr}”</em>
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>

      <SuggestEdit post={post} />
      <CommentsSection post={post} />

      <SiteFooter />
      <MobileTabBar />
    </motion.main>
  );
}
