import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { MobileTabBar, SiteFooter, SiteNav } from "../components/site/SiteShell";
import {
  allPosts,
  albumArtistFor,
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
import { albumPath, artistPath } from "../lib/paths";
import { addHistory } from "../lib/history";
import { trackEvent } from "../lib/analytics";
import { translationMetaDescription } from "../lib/meta";
import { languageInfo, languagesFor, translationLabel } from "../lib/languages";
import { useSeo } from "../lib/seo";
import { isDark, rgb, shade, useAlbumColor, useAlbumPalette } from "../lib/color";

const DETAIL_COPY = {
  tr: {
    closeAnnotation: "Açıklamayı kapat",
    selectedPhrase: "Seçili ifade",
    line: "satır",
    searchLabel: "Satır ara",
    searchPlaceholder: "Kelime, bölüm veya çeviri ara",
    sections: "Bölümler",
    lyricView: "Şarkı sözü görünümü",
    view: "Görünüm",
    both: "İkisi",
    createCard: "Kart oluştur",
    cardPreview: "Lyric card önizleme",
    closeCard: "Kart oluşturucuyu kapat",
    cardStudioKicker: "SOSYAL KART STÜDYOSU",
    cardStudioTitle: "Bir dizeyi görsele dönüştür",
    format: "Format",
    story: "Hikâye",
    square: "Kare",
    language: "Dil",
    cardLanguage: "Kart dili",
    albumTone: "Albüm tonu",
    cardColor: "Kart rengi",
    color: "Renk",
    lines: "Dizeler",
    maxLines: "En fazla 3 · komşu satırlar",
    cardLines: "Kart satırları",
    download: "PNG indir",
    share: "Paylaş",
    downloaded: "PNG indirildi.",
    cardCopied: "Kart metni kopyalandı.",
    loadingLyrics: "Sözler yükleniyor",
    readTranslation: "Çeviriyi oku",
    listenSpotify: "Spotify'da dinle",
    preAddApple: "Apple Music'te ön ekle",
    copied: "Kopyalandı",
    songInfo: "Şarkı Bilgisi",
    artist: "Sanatçı",
    album: "Albüm",
    single: "Tekli",
    status: "Durum",
    firstPerformance: "İlk performans",
    release: "Yayın",
    genre: "Tür",
    composer: "Besteci",
    duration: "Süre",
    reading: "Okuma",
    date: "Tarih",
    minutes: "dk",
    readingBadge: "dk okuma",
    tags: "Etiketler",
    translationAndNotes: "çeviri ve notlar",
    videoAndTranslation: "Video ve çeviri",
    watchOnYoutube: "YouTube'da izle",
    playVideo: "Videoyu oynat",
    videoHint: "Videoyu izlerken çeviriye tek dokunuşla geç.",
    openYoutube: "YouTube'da aç",
    fromAlbum: "albümünden",
    recommended: "Önerilen çeviriler",
    allAlbumTranslations: "Albümdeki tüm çeviriler →",
    sameWorld: "ve aynı dünyadan",
    keepReading: "okumaya devam et",
  },
  en: {
    closeAnnotation: "Close explanation",
    selectedPhrase: "Selected phrase",
    line: "line",
    searchLabel: "Search lines",
    searchPlaceholder: "Search a word, section or translation",
    sections: "Sections",
    lyricView: "Lyrics view",
    view: "View",
    both: "Both",
    createCard: "Create card",
    cardPreview: "Lyric card preview",
    closeCard: "Close card studio",
    cardStudioKicker: "LYRIC CARD STUDIO",
    cardStudioTitle: "Turn a lyric into a visual",
    format: "Format",
    story: "Story",
    square: "Square",
    language: "Language",
    cardLanguage: "Card language",
    albumTone: "Album tone",
    cardColor: "Card color",
    color: "Color",
    lines: "Lines",
    maxLines: "Up to 3 · adjacent lines",
    cardLines: "Card lines",
    download: "Download PNG",
    share: "Share",
    downloaded: "PNG downloaded.",
    cardCopied: "Card text copied.",
    loadingLyrics: "Lyrics are loading",
    readTranslation: "Read translation",
    listenSpotify: "Listen on Spotify",
    preAddApple: "Pre-add on Apple Music",
    copied: "Copied",
    songInfo: "Song information",
    artist: "Artist",
    album: "Album",
    single: "Single",
    status: "Status",
    firstPerformance: "First performance",
    release: "Release",
    genre: "Genre",
    composer: "Songwriters",
    duration: "Duration",
    reading: "Reading time",
    date: "Date",
    minutes: "min",
    readingBadge: "min read",
    tags: "Tags",
    translationAndNotes: "translation and notes",
    videoAndTranslation: "Video and translation",
    watchOnYoutube: "Watch on YouTube",
    playVideo: "Play video",
    videoHint: "Move from the video to the translation in one tap.",
    openYoutube: "Open on YouTube",
    fromAlbum: "from the album",
    recommended: "Recommended translations",
    allAlbumTranslations: "View all album translations →",
    sameWorld: "and more from the same world",
    keepReading: "keep reading",
  },
};

function copyForLanguage(code) {
  return String(code || "").toLowerCase().startsWith("en") ? DETAIL_COPY.en : DETAIL_COPY.tr;
}

function interfaceLocaleFor(languages) {
  return languages.translation === "en" ? "en" : "tr";
}

function columnLabel(language, kind, interfaceLocale) {
  const info = languageInfo(language);
  if (interfaceLocale === "tr" && kind === "original" && language === "en") return "ORİJİNAL";
  if (interfaceLocale === "tr" && kind === "translation" && language === "tr") return "TÜRKÇE";
  const name = interfaceLocale === "en" ? info.englishName : info.turkishName;
  const role = kind === "original"
    ? (interfaceLocale === "en" ? "ORIGINAL" : "ORİJİNAL")
    : (interfaceLocale === "en" ? "TRANSLATION" : "ÇEVİRİ");
  return `${name.toLocaleUpperCase(interfaceLocale === "tr" ? "tr-TR" : "en-US")} · ${role}`;
}

function cardLanguageLabel(language, kind, interfaceLocale) {
  if (interfaceLocale === "tr" && kind === "original" && language === "en") return "Orijinal";
  const info = languageInfo(language);
  return interfaceLocale === "en" ? info.englishName : info.turkishName;
}

function detailMetaDescription(post, languages) {
  if (!post || languages.translation !== "en") return translationMetaDescription(post);
  const editorial = String(post.seo?.description || "").trim();
  if (editorial) return editorial;
  const originalLanguage = languageInfo(languages.original).englishName;
  return `${post.artist} – ${post.song} lyrics with an English translation from the ${originalLanguage} original. Explore the song's meaning, credits and line-by-line notes.`;
}

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
          <Link to={artist.slug ? artistPath(artist) : "/"}>{artist.name}</Link>
        </span>
      ))}
    </span>
  );
}

function lyricSections(blocks) {
  const out = [];
  let pendingOriginal = [];
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
      pendingOriginal = lines.slice();
      pendingLabel = block.label || "";
      continue;
    }
    out.push({
      label: block.label || pendingLabel || labelFor(lines),
      original: pendingOriginal.filter(Boolean),
      translation: lines.filter(Boolean),
    });
    pendingOriginal = [];
    pendingLabel = "";
  }
  return out.filter((section) => section.original.length || section.translation.length);
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

function AnnotationDialog({ id, selected, onClose, annotationLanguage, theme }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const previousFocusRef = useRef(null);
  const copy = copyForLanguage(annotationLanguage);

  useEffect(() => {
    if (!selected) return undefined;
    previousFocusRef.current = selected.trigger || document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) || [])];
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      const returnTarget = selected.trigger?.isConnected ? selected.trigger : previousFocusRef.current;
      returnTarget?.focus?.();
    };
  }, [selected, onClose]);

  if (!selected) return null;
  const titleId = `${id}-title`;
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  return createPortal((
    <div className="detail-note-modal" style={theme}>
      <div className="detail-note-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        id={id}
        className="detail-note-popover"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${labelId} ${titleId}`}
        aria-describedby={descriptionId}
        lang={annotationLanguage}
        tabIndex={-1}
      >
        <button ref={closeRef} type="button" className="detail-note-close" aria-label={copy.closeAnnotation} onClick={onClose}>×</button>
        <div>
          <div id={labelId} className="detail-selected-label">{copy.selectedPhrase}</div>
          <h3 id={titleId} className="font-serif" lang={selected.language}>“{selected.display || selected.key}”</h3>
          <p id={descriptionId} lang={annotationLanguage}>{selected.note}</p>
          {selected.line && (
            <div className="detail-note-source">
              <span>{copy.line}</span>
              <em lang={selected.language}>“{selected.line}”</em>
            </div>
          )}
          <div className="detail-signature">
            <span aria-hidden />
            melike
          </div>
        </div>
      </div>
    </div>
  ), document.body);
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

function DetailLyricsTable({
  post,
  sections,
  notes,
  selectedKey,
  onSelect,
  cardPalette,
  languages,
  annotationDialogId,
}) {
  const interfaceLocale = interfaceLocaleFor(languages);
  const ui = copyForLanguage(interfaceLocale);
  const languageOrder = [languages.original, languages.translation];
  const slotForLanguage = (language) => (language === languages.original ? "original" : "translation");
  const [viewMode, setViewMode] = useState(() => {
    try {
      const stored = window.localStorage.getItem(LYRICS_VIEW_KEY);
      if (["both", "en", "tr"].includes(stored)) return stored;
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
              aria-label={interfaceLocale === "en" ? languageInfo(language).englishName : languageInfo(language).turkishName}
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
                <span className="detail-section-pill" lang="en">{section.label}</span>
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

function LyricsSkeleton({ label }) {
  return (
    <div className="detail-lyrics-skeleton" aria-label={label}>
      {Array.from({ length: 8 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function DetailVideo({ post, embedUrl, onRead, ui, locale }) {
  const [playing, setPlaying] = useState(false);
  if (!embedUrl) return null;
  const youtubeUrl = post.youtubeUrl || post.youtube?.url;
  const videoId = embedUrl.match(/\/embed\/([A-Za-z0-9_-]+)/)?.[1];
  const thumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : post.cover;
  const facade = (
    <>
      <img src={thumbnail} alt="" loading="lazy" decoding="async" />
      <span aria-hidden><i /></span>
      <strong>{post.youtubeEmbedDisabled ? ui.watchOnYoutube : ui.playVideo}</strong>
    </>
  );
  return (
    <section className="detail-video-section" aria-label={ui.videoAndTranslation} lang={locale}>
      <div className="detail-video-copy">
        <span>Video</span>
        <h2 className="font-serif">{post.song}</h2>
        <p>{ui.videoHint}</p>
        <div className="detail-video-actions">
          <button type="button" onClick={onRead}>{ui.readTranslation}</button>
          {youtubeUrl && (
            <a href={youtubeUrl} target="_blank" rel="noopener noreferrer">{ui.openYoutube}</a>
          )}
        </div>
      </div>
      <div className="detail-video-frame">
        {post.youtubeEmbedDisabled && youtubeUrl ? (
          <a
            className="detail-video-facade"
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${ui.openYoutube}: ${post.artist} - ${post.song}`}
          >
            {facade}
          </a>
        ) : playing ? (
          <iframe
            src={`${embedUrl}?autoplay=1&rel=0`}
            title={`${post.artist} - ${post.song} · ${ui.playVideo}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            className="detail-video-facade"
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`${ui.playVideo}: ${post.artist} - ${post.song}`}
          >
            {facade}
          </button>
        )}
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
        <span lang="en">Community</span>
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
      trackEvent("comment_submit", {
        content_type: "translation",
        item_id: post.slug,
        rating: Number(form.rating) || 0,
      });
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
  const languages = languagesFor(post);
  const interfaceLocale = interfaceLocaleFor(languages);
  const ui = copyForLanguage(interfaceLocale);
  const pageTranslationLabel = translationLabel(post, interfaceLocale);
  const accent = useAlbumColor(post?.cover);
  const cardPalette = useAlbumPalette(post?.cover, [accent, shade(accent, 0.72), shade(accent, 0.46)]);
  const readerRef = useRef(null);
  const annotationDialogId = useId();
  const [shared, setShared] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [readProgress, setReadProgress] = useState(0);
  const closeAnnotation = useCallback(() => setSelectedNote(null), []);

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
  }, [post?.slug]);

  useEffect(() => {
    setSelectedNote(null);
  }, [slug]);

  const canonicalPath = post ? postPath(post) : `/${cleanSlug}/`;
  const metaArtist = post ? creditedArtistsFor(post)[0] : null;
  const metaAlbum = post ? albumNameFor(post) : "";
  useSeo({
    title: post?.seo?.title || (post ? `${post.artist} ${post.song} ${pageTranslationLabel}` : "Çeviri bulunamadı | acupoflyrics"),
    description: detailMetaDescription(post, languages),
    path: canonicalPath,
    image: post?.cover,
    type: "music.song",
    noindex: !post,
    breadcrumbs: post
      ? [
          { name: "Ana sayfa", path: "/" },
          ...(metaArtist ? [{ name: metaArtist.name, path: artistPath(metaArtist) }] : []),
          { name: post.song, path: canonicalPath },
        ]
      : [],
    jsonLd: post
      ? {
          "@context": "https://schema.org",
          "@type": "MusicRecording",
          name: post.song,
          byArtist: { "@type": "MusicGroup", name: post.artist },
          ...(metaAlbum && metaAlbum !== "Tekli" ? { inAlbum: { "@type": "MusicAlbum", name: metaAlbum } } : {}),
          image: post.cover,
          url: `${window.location.origin}${canonicalPath}`,
          ...(post.spotify?.track?.isrc || post.spotify?.isrc ? { isrcCode: post.spotify?.track?.isrc || post.spotify?.isrc } : {}),
          sameAs: [post.spotify?.track?.url || post.spotify?.trackUrl].filter(Boolean),
        }
      : null,
  });

  const sharePost = async () => {
    const url = window.location.href;
    const title = post ? `${post.artist} - ${post.song} | ${pageTranslationLabel}` : "acupoflyrics";
    try {
      const method = navigator.share ? "web_share" : "clipboard";
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
      trackEvent("share", {
        method,
        content_type: "translation",
        item_id: post?.slug,
      });
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
  const sameAlbumRelated = allPosts.filter((candidate) => (
    candidate.slug !== post.slug
    && albumArtistFor(candidate) === albumArtistFor(post)
    && albumNameFor(candidate) === albumNameFor(post)
    && albumNameFor(post) !== "Tekli"
  ));
  const related = sameAlbumRelated.length >= 4
    ? sameAlbumRelated.slice(0, 4)
    : sameArtistRelated.length >= 4
      ? sameArtistRelated
    : [
        ...sameAlbumRelated,
        ...sameArtistRelated,
        ...allPosts.filter((candidate) => (
          candidate.slug !== post.slug &&
          !sameAlbumRelated.some((item) => item.slug === candidate.slug) &&
          !sameArtistRelated.some((item) => item.slug === candidate.slug) &&
          candidate.category_slugs?.some((slug) => post.category_slugs?.includes(slug))
        )),
        ...allPosts.filter((candidate) => (
          candidate.slug !== post.slug &&
          !sameArtistRelated.some((item) => item.slug === candidate.slug)
        )),
      ].filter((candidate, index, items) => items.findIndex((item) => item.slug === candidate.slug) === index).slice(0, 4);
  const artistLinks = creditedArtistsFor(post);
  const sections = lyricSections(post.blocks);
  const isLyricsLoading = indexedPost && fullPost === null;
  const parsedYear = new Date(post.spotify?.album?.releaseDate || post.date).getFullYear();
  const year = Number.isNaN(parsedYear) ? "" : parsedYear;
  const light = !isDark(accent);
  const top = shade(accent, light ? 0.42 : 0.64);
  const bottom = shade(accent, light ? 0.20 : 0.32);
  const genres = post.spotify?.artist?.genres?.filter(Boolean).slice(0, 3) || [];
  const tags = (genres.length ? genres : [post.artist, post.song]).filter(Boolean);
  const videoEmbedUrl = youtubeEmbedUrl(post.youtubeUrl || post.youtube?.url);
  const scrollToReader = () => {
    trackEvent("select_content", {
      content_type: "translation_reader",
      item_id: post.slug,
    });
    window.requestAnimationFrame(() => {
      (readerRef.current || document.getElementById("lyrics-reader"))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const albumName = albumNameFor(post);
  const hasAlbum = albumName && albumName !== "Tekli";
  const albumSlug = hasAlbum ? albumSlugFor(`${albumArtistFor(post)}-${albumName}`) : "";
  const songwriterSource = post.songwriters || post.composers || post.credits?.songwriters || post.credits?.composers;
  const songwriters = Array.isArray(songwriterSource) ? songwriterSource.join(", ") : songwriterSource || "";

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
    "--color-ink": "#f7f3ec",
    "--color-ink-soft": "rgba(247, 243, 236, 0.78)",
    "--color-muted": "rgba(247, 243, 236, 0.64)",
    "--color-faint": "rgba(247, 243, 236, 0.48)",
    "--color-line": "rgba(255, 255, 255, 0.11)",
  };
  const annotationTheme = {
    "--detail-accent": cssVars["--detail-accent"],
    "--detail-accent-soft": cssVars["--detail-accent-soft"],
    "--detail-accent-line": cssVars["--detail-accent-line"],
    "--detail-accent-deep": cssVars["--detail-accent-deep"],
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
      <div className="detail-ambient" aria-hidden>
        <img src={post.cover} alt="" />
        <span className="detail-ambient-glow is-one" />
        <span className="detail-ambient-glow is-two" />
      </div>
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

            <div className="detail-hero-copy" lang={interfaceLocale}>
              <h1 className="font-serif">{post.song}</h1>
              <div className="detail-artist-line">
                <ArtistLinks artists={artistLinks} />
              </div>

              <div className="detail-hero-meta">
                <span>◉ {pageTranslationLabel}</span>
                {post.releaseStatus && <span>◷ {post.releaseStatus}</span>}
                {hasAlbum && (
                  <Link to={albumPath(albumSlug)} className="detail-hero-album-link">
                    ◇ {albumName}
                  </Link>
                )}
                {post.reading_time && <span>◷ {post.reading_time} {ui.readingBadge}</span>}
                {year && <span>▣ {year}</span>}
              </div>

              <div className="detail-actions">
                <a href="#lyrics-reader" className="detail-primary-action" onClick={scrollToReader}>
                  {ui.readTranslation}
                </a>
                {post.spotify?.track?.url || post.spotify?.trackUrl ? (
                  <a
                    className="detail-ghost-action"
                    href={post.spotify?.track?.url || post.spotify?.trackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ui.listenSpotify}
                  </a>
                ) : null}
                {!post.spotify?.track?.url && !post.spotify?.trackUrl && post.appleMusicUrl ? (
                  <a
                    className="detail-ghost-action"
                    href={post.appleMusicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ui.preAddApple}
                  </a>
                ) : null}
                <button type="button" className="detail-ghost-action" onClick={sharePost}>
                  ↗ {shared ? ui.copied : ui.share}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <DetailVideo post={post} embedUrl={videoEmbedUrl} onRead={scrollToReader} ui={ui} locale={interfaceLocale} />

      <section className="detail-reading-shell">
        <img src={post.cover} alt="" aria-hidden className="detail-reading-atmosphere" />
        <aside className="detail-info-panel" lang={interfaceLocale}>
          <h2 className="font-serif">{ui.songInfo}</h2>
          <MetaRow label={ui.artist} value={<ArtistLinks artists={artistLinks} />} />
          <MetaRow label={ui.album} value={hasAlbum ? albumName : ui.single} />
          <MetaRow label={ui.status} value={post.releaseStatus || ""} />
          <MetaRow label={ui.firstPerformance} value={post.performanceSource || ""} />
          <MetaRow label={ui.release} value={year ? String(year) : ""} />
          <MetaRow label={ui.genre} value={genres.join(", ")} />
          <MetaRow label={ui.composer} value={songwriters} />
          <MetaRow label={ui.duration} value={post.spotify?.track?.duration || ""} />
          <MetaRow label={ui.reading} value={post.reading_time ? `${post.reading_time} ${ui.minutes}` : ""} />
          <MetaRow label={ui.date} value={formatDate(post.date)} />
          <div className="detail-tag-block">
            <span>{ui.tags}</span>
            <div>
              {tags.length ? tags.map((tag) => <b key={tag}>{tag}</b>) : <b>{pageTranslationLabel}</b>}
            </div>
          </div>
          <div className="detail-translator">
            <span aria-hidden />
            <div>
              <strong>melike</strong>
              <small>{ui.translationAndNotes}</small>
            </div>
          </div>
        </aside>

        <div className="detail-reader-column" id="lyrics-reader" ref={readerRef}>
          {isLyricsLoading ? (
            <LyricsSkeleton label={ui.loadingLyrics} />
          ) : (
            <DetailLyricsTable
              post={post}
              sections={sections}
              notes={notes}
              selectedKey={selectedNote?.key}
              onSelect={setSelectedNote}
              cardPalette={cardPalette}
              languages={languages}
              annotationDialogId={annotationDialogId}
            />
          )}

          <div className="detail-reader-signoff" style={{ display: "flex", justifyContent: "flex-end", paddingRight: "16px" }}>
            <time>{formatDate(post.date)}</time>
          </div>
        </div>

      </section>

      <AnnotationDialog
        id={annotationDialogId}
        selected={selectedNote}
        onClose={closeAnnotation}
        annotationLanguage={languages.annotations}
        theme={annotationTheme}
      />

      <section className="detail-related" lang={interfaceLocale}>
        {related.length > 0 && (
          <>
            <div className="detail-section-heading">
              <h2 className="font-serif">
                {sameAlbumRelated.length
                  ? (interfaceLocale === "en" ? `${ui.fromAlbum} ${albumName}` : `${albumName} ${ui.fromAlbum}`)
                  : ui.recommended}
              </h2>
              {sameAlbumRelated.length ? (
                <Link to={albumPath(albumSlug)}>{ui.allAlbumTranslations}</Link>
              ) : (
                <span>{sameArtistRelated.length ? `${post.artist} ${ui.sameWorld}` : ui.keepReading}</span>
              )}
            </div>
            <div className="detail-related-grid">
              {related.map((p) => {
                const pr = firstPair(p);
                return (
                  <Link key={p.slug} to={postPath(p)} className="detail-related-card">
                    <img src={p.cover} alt="" loading="lazy" />
                    <span>
                      <strong className="font-serif">{p.song}</strong>
                      <em lang={languagesFor(p).translation}>“{pr.tr}”</em>
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
