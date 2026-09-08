import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { rgb, shade } from "../lib/color";
import { languageInfo } from "../lib/languages";
import { copyForLanguage, interfaceLocaleFor, columnLabel, cardLanguageLabel } from "../lib/detailCopy";
import { trackEvent } from "../lib/analytics";
import TranslationLanguages from "./TranslationLanguages";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
const LYRICS_VIEW_KEY = "acl_lyrics_view_v1";

const CARD_RATIOS = {
  square: { label: "1:1", width: 2160, height: 2160, renderScale: 2 },
  story: { label: "9:16", width: 1080, height: 1920, renderScale: 1 },
};

function lyricCardFilename(post, card) {
  return `${post.artist}-${post.song}-${card.section.label}-${card.language}-${card.ratio || "square"}`
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
  const accent = mixColor(color, [255, 248, 239], 0.24);
  return { base, shadow, glow, stroke, accent };
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
  const ratio = CARD_RATIOS[card.ratio] || CARD_RATIOS.square;
  const renderScale = ratio.renderScale || 1;
  const designWidth = ratio.width / renderScale;
  const designHeight = ratio.height / renderScale;
  const isLandscape = card.ratio === "landscape";
  const isStory = card.ratio === "story";
  const isPortrait = isStory || card.ratio === "pinterest";
  const padding = isLandscape ? 112 : isPortrait ? 88 : 72;
  const canvas = document.createElement("canvas");
  canvas.width = ratio.width;
  canvas.height = ratio.height;
  const ctx = canvas.getContext("2d");
  ctx.scale(renderScale, renderScale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const sans = "Inter, Hanken Grotesk, Helvetica Neue, Arial, system-ui, sans-serif";
  const serif = "Fraunces, Georgia, serif";

  await document.fonts?.load?.("400 68px Fraunces");
  await document.fonts?.load?.("500 28px Inter");

  ctx.fillStyle = cssRgb(theme.shadow);
  ctx.fillRect(0, 0, designWidth, designHeight);

  if (cover) {
    const sourceRatio = cover.width / cover.height;
    const targetRatio = designWidth / designHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = cover.width;
    let sourceHeight = cover.height;
    if (sourceRatio > targetRatio) {
      sourceWidth = cover.height * targetRatio;
      sourceX = (cover.width - sourceWidth) / 2;
    } else {
      sourceHeight = cover.width / targetRatio;
      sourceY = (cover.height - sourceHeight) / 2;
    }
    ctx.save();
    ctx.filter = "saturate(0.9) contrast(1.06) brightness(0.86)";
    ctx.drawImage(cover, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, designWidth, designHeight);
    ctx.restore();
  }

  ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.12)`;
  ctx.fillRect(0, 0, designWidth, designHeight);

  const horizontalScrim = ctx.createLinearGradient(0, 0, designWidth, 0);
  horizontalScrim.addColorStop(0, "rgba(3, 6, 8, 0.92)");
  horizontalScrim.addColorStop(0.44, "rgba(3, 6, 8, 0.58)");
  horizontalScrim.addColorStop(0.76, "rgba(3, 6, 8, 0.16)");
  horizontalScrim.addColorStop(1, "rgba(3, 6, 8, 0.42)");
  ctx.fillStyle = horizontalScrim;
  ctx.fillRect(0, 0, designWidth, designHeight);

  const verticalScrim = ctx.createLinearGradient(0, 0, 0, designHeight);
  verticalScrim.addColorStop(0, "rgba(3, 6, 8, 0.42)");
  verticalScrim.addColorStop(0.46, "rgba(3, 6, 8, 0.02)");
  verticalScrim.addColorStop(0.72, "rgba(3, 6, 8, 0.34)");
  verticalScrim.addColorStop(1, "rgba(3, 6, 8, 0.96)");
  ctx.fillStyle = verticalScrim;
  ctx.fillRect(0, 0, designWidth, designHeight);

  const focusGlow = ctx.createRadialGradient(
    designWidth * 0.72,
    designHeight * 0.28,
    20,
    designWidth * 0.72,
    designHeight * 0.28,
    Math.max(designWidth, designHeight) * 0.72,
  );
  focusGlow.addColorStop(0, "rgba(255,255,255,0)");
  focusGlow.addColorStop(0.58, `rgba(${theme.glow[0]}, ${theme.glow[1]}, ${theme.glow[2]}, 0.06)`);
  focusGlow.addColorStop(1, "rgba(0,0,0,0.24)");
  ctx.fillStyle = focusGlow;
  ctx.fillRect(0, 0, designWidth, designHeight);
  drawNoise(ctx, designWidth, designHeight);

  const headerY = padding + 30;
  ctx.fillStyle = cssRgb(color);
  ctx.beginPath();
  ctx.arc(padding + 5, headerY - 7, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fffdf8";
  ctx.font = `600 27px ${sans}`;
  ctx.fillText("acupoflyrics", padding + 24, headerY);

  const headerRuleY = headerY + 42;
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, headerRuleY);
  ctx.lineTo(designWidth - padding, headerRuleY);
  ctx.stroke();

  const lyricWidth = isLandscape ? Math.round(designWidth * 0.58) : designWidth - padding * 2;
  const footerRuleY = designHeight - padding - (isPortrait ? 178 : 124);
  const lyricTopLimit = headerRuleY + (isStory ? 260 : isPortrait ? 205 : 150);
  const lyricBottom = footerRuleY - (isPortrait ? 120 : 72);
  const maxLyricHeight = lyricBottom - lyricTopLimit;
  const selectedLineCount = selectedLines.length;
  let lyricFontSize = isLandscape
    ? selectedLineCount === 1 ? 82 : selectedLineCount === 2 ? 72 : 66
    : isPortrait
      ? selectedLineCount === 1 ? 90 : selectedLineCount === 2 ? 78 : 68
      : selectedLineCount === 1 ? 72 : selectedLineCount === 2 ? 62 : 54;
  const minimumFontSize = isLandscape ? 42 : isPortrait ? 46 : 38;
  let lyricLines = [];
  let lineHeight = 0;
  let blockHeight = 0;

  while (lyricFontSize >= minimumFontSize) {
    ctx.font = `400 ${lyricFontSize}px ${serif}`;
    lyricLines = selectedLines.flatMap((selectedLine, index) => {
      const wrapped = wrapCanvasText(ctx, selectedLine, lyricWidth);
      const lines = wrapped.map((line) => ({ line, isAccent: index === selectedLines.length - 1 }));
      return index < selectedLines.length - 1 ? [...lines, { line: "", isAccent: false }] : lines;
    });
    while (lyricLines[lyricLines.length - 1]?.line === "") lyricLines.pop();
    lineHeight = Math.round(lyricFontSize * 1.08);
    blockHeight = lyricLines.reduce(
      (height, item) => height + (item.line ? lineHeight : Math.round(lineHeight * 0.34)),
      0,
    );
    if (blockHeight <= maxLyricHeight) break;
    lyricFontSize -= 2;
  }

  const lyricStartY = Math.max(lyricTopLimit, lyricBottom - blockHeight);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.font = `italic 300 ${isLandscape ? 112 : 128}px ${serif}`;
  ctx.fillText("“", padding - 5, lyricStartY - 22);
  ctx.restore();

  ctx.shadowColor = "rgba(0,0,0,0.42)";
  ctx.shadowBlur = 28;
  let lyricY = lyricStartY + lyricFontSize;
  for (const item of lyricLines) {
    if (!item.line) {
      lyricY += Math.round(lineHeight * 0.34);
      continue;
    }
    ctx.fillStyle = item.isAccent ? cssRgb(theme.accent) : "#fffdf8";
    ctx.font = `${item.isAccent ? "italic 500" : "400"} ${lyricFontSize}px ${serif}`;
    ctx.fillText(item.line, padding, lyricY);
    lyricY += lineHeight;
  }
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, footerRuleY);
  ctx.lineTo(designWidth - padding, footerRuleY);
  ctx.stroke();

  const footerTop = footerRuleY + 38;
  const thumbnailSize = isLandscape ? 84 : isPortrait ? 88 : 78;
  const thumbnailRadius = Math.round(thumbnailSize * 0.16);
  const footerTextX = cover ? padding + thumbnailSize + 24 : padding;

  if (cover) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(padding, footerTop, thumbnailSize, thumbnailSize, thumbnailRadius);
    ctx.clip();
    const coverSize = Math.min(cover.width, cover.height);
    ctx.drawImage(
      cover,
      (cover.width - coverSize) / 2,
      (cover.height - coverSize) / 2,
      coverSize,
      coverSize,
      padding,
      footerTop,
      thumbnailSize,
      thumbnailSize,
    );
    ctx.restore();
  }

  ctx.fillStyle = "#fff";
  let songFontSize = isLandscape ? 30 : 28;
  const songMaxWidth = isPortrait
    ? designWidth - footerTextX - padding
    : Math.round((designWidth - footerTextX - padding) * 0.62);
  ctx.font = `600 ${songFontSize}px ${sans}`;
  while (ctx.measureText(post.song).width > songMaxWidth && songFontSize > 20) {
    songFontSize -= 1;
    ctx.font = `600 ${songFontSize}px ${sans}`;
  }
  ctx.fillText(post.song, footerTextX, footerTop + 27);

  ctx.fillStyle = cssRgb(theme.accent);
  ctx.font = `500 ${isLandscape ? 21 : 20}px ${sans}`;
  ctx.fillText(post.artist, footerTextX, footerTop + 61);

  const albumMeta = post.spotify?.album?.name
    ? `${new Date(post.spotify?.album?.releaseDate || post.date).getFullYear()} • ${post.spotify.album.name}`
    : "";
  if (albumMeta && !albumMeta.includes("NaN")) {
    ctx.fillStyle = "rgba(255,255,255,0.44)";
    ctx.font = `600 ${isLandscape ? 17 : 16}px ${sans}`;
    const meta = albumMeta.toUpperCase();
    const metaWidth = ctx.measureText(meta).width;
    ctx.fillText(meta, designWidth - padding - metaWidth, footerTop + 45);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.96);
  });
}

export default function DetailLyricsTable({
  post,
  sections,
  notes,
  selectedKey,
  onSelect,
  cardPalette,
  languages,
  annotationDialogId,
  defaultView,
}) {
  const interfaceLocale = interfaceLocaleFor(languages);
  const ui = copyForLanguage(interfaceLocale);
  const languageOrder = [languages.original, languages.translation];
  const slotForLanguage = (language) => (language === languages.original ? "original" : "translation");
  const [viewMode, setViewMode] = useState(() => {
    if (defaultView) return defaultView;
    try {
      const stored = window.localStorage.getItem(LYRICS_VIEW_KEY);
      if (["both", ...languageOrder].includes(stored)) return stored;
    } catch {
      /* Keep the responsive default when storage is unavailable. */
    }
    return window.matchMedia?.("(max-width: 820px)").matches ? languages.translation : "both";
  });
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardDraft, setCardDraft] = useState(null);
  const [cardStatus, setCardStatus] = useState("");
  const [cardBusy, setCardBusy] = useState(false);
  const keys = Object.keys(notes);
  const findKey = (line) => {
    if (!line) return undefined;
    const normalizedLine = line.toLocaleLowerCase();
    return keys.find((key) => normalizedLine.includes(key.toLocaleLowerCase()));
  };
  const normalizedQuery = query.trim().toLowerCase();

  const selectViewMode = (mode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(LYRICS_VIEW_KEY, mode);
    } catch {
      /* The choice still applies for the current page. */
    }
  };

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
    const lines = section[slotForLanguage(language)].filter(Boolean);
    setCardStatus("");
    setCardDraft({
      section,
      language,
      colorIndex: 0,
      ratio: "square",
      selected: lines.slice(0, CARD_MAX_LINES).map((_, index) => index),
    });
  };

  const setCardLanguage = (language) => {
    setCardStatus("");
    setCardDraft((draft) => {
      if (!draft) return draft;
      const lines = draft.section[slotForLanguage(language)].filter(Boolean);
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

      if (!draft.selected.length || draft.selected.length >= CARD_MAX_LINES) {
        return { ...draft, selected: [index] };
      }

      const firstSelected = Math.min(...draft.selected);
      const lastSelected = Math.max(...draft.selected);
      const isAdjacent = index === firstSelected - 1 || index === lastSelected + 1;

      if (!isAdjacent) {
        return { ...draft, selected: [index] };
      }

      return {
        ...draft,
        selected: [...draft.selected, index].sort((a, b) => a - b),
      };
    });
  };

  const setCardColor = (colorIndex) => {
    setCardStatus("");
    setCardDraft((draft) => (draft ? { ...draft, colorIndex } : draft));
  };

  const setCardRatio = (ratio) => {
    setCardStatus("");
    setCardDraft((draft) => (draft ? { ...draft, ratio } : draft));
  };

  const buildCard = (draft) => {
    if (!draft) return null;
    const lines = draft.section[slotForLanguage(draft.language)].filter(Boolean);
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
    const text = `${post.artist} - ${post.song}\n\n${card.selectedLines.join("\n")}\n\nacupoflyrics`;
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
        setCardStatus(ui.cardCopied);
      }
      trackEvent("share", {
        method: "lyric_card",
        content_type: "translation_card",
        item_id: post.slug,
        card_ratio: card.ratio,
      });
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
      trackEvent("share", {
        method: "lyric_card_download",
        content_type: "translation_card",
        item_id: post.slug,
        card_ratio: card.ratio,
      });
      setCardStatus(ui.downloaded);
    } finally {
      setCardBusy(false);
    }
  };

  const visibleSections = sections.map((section, index) => ({ section, index })).filter(({ section }) => {
    if (!normalizedQuery) return true;
    return [section.label, ...section.original, ...section.translation].join(" ").toLowerCase().includes(normalizedQuery);
  });

  const renderMarkedLine = (line, language) => {
    const key = findKey(line);
    if (!key) return line || "—";
    const match = line.match(new RegExp(escapeRegExp(key), "i"));
    if (!match || match.index == null) return line || "—";
    const before = line.slice(0, match.index);
    const marked = line.slice(match.index, match.index + match[0].length);
    const after = line.slice(match.index + match[0].length);
    return (
      <>
        {before}
        <button
          type="button"
          className="detail-lyric-annot"
          onClick={(event) => onSelect({
            key,
            display: marked,
            note: notes[key],
            line,
            language,
            trigger: event.currentTarget,
          })}
          aria-haspopup="dialog"
          aria-expanded={selectedKey === key}
          aria-controls={annotationDialogId}
        >
          {marked}
        </button>
        {after}
      </>
    );
  };

  const renderLyricLines = (section, kind, sectionIndex) => {
    const language = languages[kind];
    const lines = section[kind].filter(Boolean);
    return lines.map((line, lineIndex) => {
      const selectionId = `${sectionIndex}-${language}-${lineIndex}`;
      return (
        <span className="detail-lyric-line-static" key={selectionId}>
          {renderMarkedLine(line, language)}
        </span>
      );
    });
  };

  return (
    <div className="detail-lyrics-table" lang={interfaceLocale}>
      <TranslationLanguages sourceSlug={post.sourceSlug || post.slug} locale={interfaceLocale} />
      <div className="detail-reader-tools">
        <label>
          <span>{ui.searchLabel}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ui.searchPlaceholder}
          />
        </label>
        <div className="detail-smart-seek" aria-label={ui.sections}>
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
      <div className="detail-floating-lyrics" aria-label={ui.lyricView}>
        <span>{ui.view}</span>
        <div className="detail-view-mode-tabs">
          <button type="button" aria-pressed={viewMode === "both"} className={viewMode === "both" ? "is-active" : ""} onClick={() => selectViewMode("both")}>{ui.both}</button>
          {languageOrder.map((language) => (
            <button
              key={language}
              type="button"
              aria-pressed={viewMode === language}
              className={viewMode === language ? "is-active" : ""}
              onClick={() => selectViewMode(language)}
              aria-label={interfaceLocale === "es" ? (language === languages.original ? "Original" : "Español") : interfaceLocale === "en" ? languageInfo(language).englishName : languageInfo(language).turkishName}
            >
              {languageInfo(language).short}
            </button>
          ))}
        </div>
      </div>
      <div className="detail-lyric-sections">
        {visibleSections.map(({ section, index }) => {
          const originalText = section.original.join("\n");
          const translationText = section.translation.join("\n");
          const originalKey = findKey(originalText);
          const translationKey = findKey(translationText);
          const key = translationKey || originalKey;
          const active = key && selectedKey === key;
          const hasOriginal = section.original.some(Boolean);
          const hasTranslation = section.translation.some(Boolean);
          return (
            <article
              className={`detail-lyric-section${active ? " is-active" : ""}`}
              key={`${section.label}-${index}`}
              id={`lyric-section-${index}`}
              data-lyric-section
            >
              <header className="detail-section-head">
                <span className="detail-section-pill" lang={interfaceLocale === "es" ? "es" : "en"}>{section.label}</span>
                <i aria-hidden />
              </header>
              <div className={`detail-section-copy is-${viewMode}`}>
                {(viewMode === "both" || viewMode === languages.original) && (
                  <div className="detail-section-col is-original">
                    <div className="detail-col-head">
                      <span className="detail-col-tag" lang={interfaceLocale}>
                        {columnLabel(languages.original, "original", interfaceLocale)}
                      </span>
                      {hasOriginal && <button type="button" onClick={() => openCard(section, languages.original)}>{ui.createCard}</button>}
                    </div>
                    <p className="detail-section-original" lang={languages.original}>{renderLyricLines(section, "original", index)}</p>
                  </div>
                )}
                {(viewMode === "both" || viewMode === languages.translation) && (
                  <div className="detail-section-col is-translation">
                    <div className="detail-col-head">
                      <span className="detail-col-tag" lang={interfaceLocale}>
                        {columnLabel(languages.translation, "translation", interfaceLocale)}
                      </span>
                      {hasTranslation && <button type="button" onClick={() => openCard(section, languages.translation)}>{ui.createCard}</button>}
                    </div>
                    <p className="detail-section-translation" lang={languages.translation}>{renderLyricLines(section, "translation", index)}</p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {cardDraft && (() => {
        const card = buildCard(cardDraft);
        if (!card) return null;
        const previewTheme = cardThemeColors(card.color);
        const albumMeta = post.spotify?.album?.name
          ? `${new Date(post.spotify?.album?.releaseDate || post.date).getFullYear()} • ${post.spotify.album.name}`
          : "";
        return createPortal((
        <div className="detail-card-modal" role="dialog" aria-modal="true" aria-label={ui.cardPreview} lang={interfaceLocale}>
          <button className="detail-card-backdrop" type="button" aria-label={ui.closeCard} onClick={() => setCardDraft(null)} />
          <div className="detail-card-dialog">
            <header className="detail-card-dialog-head">
              <div>
                <span>{ui.cardStudioKicker}</span>
                <h2 className="font-serif">{ui.cardStudioTitle}</h2>
              </div>
              <button type="button" aria-label={ui.closeCard} onClick={() => setCardDraft(null)}>×</button>
            </header>

            <div className="detail-card-studio">
              <div className="detail-card-stage">
                <div
                  className={`detail-card-preview is-${card.language} is-${card.ratio} has-${card.selectedLines.length}-lines`}
                  style={{
                    "--card-tone": rgb(card.color),
                    "--card-bg": rgb(previewTheme.base),
                    "--card-shadow": rgb(previewTheme.shadow),
                    "--card-shadow-deep": rgb(previewTheme.shadow, 0.58),
                    "--card-glow": rgb(previewTheme.glow, 0.34),
                    "--card-glow-soft": rgb(previewTheme.glow, 0.13),
                    "--card-stroke": rgb(previewTheme.stroke),
                    "--card-stroke-soft": rgb(previewTheme.stroke, 0.38),
                    "--card-accent": rgb(previewTheme.accent),
                  }}
                >
                  <img src={post.cover} alt="" className="detail-card-backdrop-art" />
                  <div className="detail-card-brand">
                    <span><i aria-hidden />acupoflyrics</span>
                  </div>
                  <div className="detail-card-lines" lang={card.language}>
                    {card.selectedLines.map((line, lineIndex) => (
                      <p
                        key={`${line}-${lineIndex}`}
                        className={lineIndex === card.selectedLines.length - 1 ? "is-accent" : undefined}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                  <footer className="detail-card-meta">
                    <div className="detail-card-track">
                      <img src={post.cover} alt="" className="detail-card-album-cover" />
                      <div className="detail-card-copy">
                        <strong>{post.song}</strong>
                        <em>{post.artist}</em>
                      </div>
                    </div>
                    {albumMeta && !albumMeta.includes("NaN") ? <small lang="en">{albumMeta}</small> : null}
                  </footer>
                </div>
                <span className="detail-card-dimensions">{CARD_RATIOS[card.ratio]?.width} × {CARD_RATIOS[card.ratio]?.height} PNG</span>
              </div>

              <aside className="detail-card-controls">
                <section className="detail-card-control-group">
                  <span>{ui.format}</span>
                  <div className="detail-card-ratio-switch" aria-label={ui.format}>
                    {Object.entries(CARD_RATIOS).map(([ratioKey, ratio]) => (
                      <button
                        key={ratioKey}
                        type="button"
                        className={card.ratio === ratioKey ? "is-active" : ""}
                        onClick={() => setCardRatio(ratioKey)}
                      >
                        {ratio.label} {ratioKey === "story" ? ui.story : ui.square}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="detail-card-control-group">
                  <span>{ui.language}</span>
                  <div className="detail-card-language-switch" aria-label={ui.cardLanguage}>
                    {[languages.translation, languages.original].map((language) => {
                      const kind = language === languages.original ? "original" : "translation";
                      return (
                        <button
                          key={language}
                          type="button"
                          className={card.language === language ? "is-active" : ""}
                          onClick={() => setCardLanguage(language)}
                          lang={interfaceLocale}
                        >
                          {cardLanguageLabel(language, kind, interfaceLocale)}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="detail-card-control-group">
                  <span>{ui.albumTone}</span>
                  <div className="detail-card-swatches" aria-label={ui.cardColor}>
                    {card.palette.map((color, colorIndex) => (
                      <button
                        key={color.join("-")}
                        type="button"
                        className={card.colorIndex === colorIndex ? "is-active" : ""}
                        style={{ background: rgb(color) }}
                        onClick={() => setCardColor(colorIndex)}
                        aria-label={`${ui.color} ${colorIndex + 1}`}
                      />
                    ))}
                  </div>
                </section>

                <section className="detail-card-control-group is-lines">
                  <div className="detail-card-control-heading">
                    <span>{ui.lines}</span>
                    <small>{ui.maxLines}</small>
                  </div>
                  <div className="detail-card-line-picker" aria-label={ui.cardLines} lang={card.language}>
                    {card.lines.map((line, lineIndex) => (
                      <button
                        key={`${line}-${lineIndex}`}
                        type="button"
                        className={card.selected.includes(lineIndex) ? "is-selected" : ""}
                        onClick={() => toggleCardLine(lineIndex)}
                      >
                        <i aria-hidden>{card.selected.includes(lineIndex) ? "✓" : lineIndex + 1}</i>
                        <span>{line}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {cardStatus && <p className="detail-card-status">{cardStatus}</p>}
                <div className="detail-card-actions">
                  <button type="button" onClick={downloadCard} disabled={cardBusy || !card.selectedLines.length}>
                    {ui.download}
                  </button>
                  <button type="button" onClick={shareCard} disabled={cardBusy || !card.selectedLines.length}>
                    {ui.share}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
        ), document.body);
      })()}
    </div>
  );
}
