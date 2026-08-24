import { languageInfo, languagesFor, translationLabel } from "./languages.js";

const META_DESCRIPTION_MAX = 152;
const META_TITLE_MAX = 65;

export function hasSeoPlaceholder(value) {
  return /%%?[^%\s]+%%?/i.test(String(value || ""));
}

export function sanitizeSeoDescription(value, maxLength = META_DESCRIPTION_MAX) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || hasSeoPlaceholder(text)) return "";
  if (text.length <= maxLength) return text;

  const clipped = text.slice(0, maxLength - 1);
  const wordBoundary = clipped.lastIndexOf(" ");
  const safe = (wordBoundary >= Math.floor(maxLength * 0.72) ? clipped.slice(0, wordBoundary) : clipped)
    .replace(/[\s,;:|\-–—.!?]+$/g, "")
    .trim();
  return `${safe}…`;
}

function truncateSeoTitle(value, maxLength = META_TITLE_MAX) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || hasSeoPlaceholder(text)) return "";
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength - 1);
  const boundary = clipped.lastIndexOf(" ");
  return `${(boundary >= Math.floor(maxLength * 0.68) ? clipped.slice(0, boundary) : clipped).trim()}…`;
}

export function fitSeoTitle(candidates, maxLength = META_TITLE_MAX) {
  const values = (Array.isArray(candidates) ? candidates : [candidates])
    .map((value) => String(value || "").replace(/\s+/g, " ").trim())
    .filter((value) => value && !hasSeoPlaceholder(value));
  return values.find((value) => value.length <= maxLength) || truncateSeoTitle(values.at(-1), maxLength);
}

export function normalizeSeoTitle(value) {
  const title = String(value || "").replace(/\s+/g, " ").trim();
  const withoutSite = title.replace(/\s*\|\s*acupoflyrics\s*$/i, "").trim();
  const lead = withoutSite.split(/\s+[—–]\s+/)[0];
  return fitSeoTitle([title, withoutSite, `${lead} | acupoflyrics`, lead]);
}

export function completeSeoDescription(value) {
  let normalized = sanitizeSeoDescription(value);
  if (!normalized) {
    normalized = "Şarkı sözlerini, özenli çevirileri, sanatçı ve albüm arşivlerini acupoflyrics üzerinde bağlamlarıyla keşfet.";
  }
  if (normalized.length >= 110) return normalized;
  const appendix = /lyrics?|English translation/i.test(normalized)
    ? " Explore every song, album, original lyric and contextual line note in the acupoflyrics archive."
    : " Şarkıları, sanatçıları, albümleri ve satır açıklamalarını acupoflyrics arşivinde keşfet.";
  return sanitizeSeoDescription(`${normalized}${appendix}`);
}

export function translationMetaTitle(post) {
  if (!post) return "Şarkı Çevirileri | acupoflyrics";
  const languages = languagesFor(post);
  const locale = languages.translation === "tr" ? "tr" : "en";
  const label = translationLabel(post, locale);
  const editorial = String(post.seo?.title || "").replace(/\s+/g, " ").trim();
  const primaryArtist = String(
    post.spotify?.artist?.name
      || post.spotify?.artistName
      || post.artist
      || "",
  ).split(/\s*,\s*|\s+feat\.?\s+|\s+ft\.?\s+/i)[0].trim();
  const candidates = [
    editorial,
    `${post.artist} – ${post.song} ${label}`,
    `${primaryArtist} – ${post.song} ${label}`,
    `${post.song} ${label} | acupoflyrics`,
    `${post.song} ${label}`,
  ].filter((candidate) => candidate && !hasSeoPlaceholder(candidate));
  return fitSeoTitle(candidates);
}

function isEditorialDescription(value) {
  const text = sanitizeSeoDescription(value);
  return text.length >= 90 && /türkçe|çeviri|şarkı|anlam|lyrics?|translation|meaning/i.test(text);
}

export function translationMetaDescription(post) {
  if (!post) return "Aradığın şarkı sözlerini ve Türkçe çevirileri acupoflyrics arşivinde keşfet.";

  if (isEditorialDescription(post.seo?.description)) {
    return sanitizeSeoDescription(post.seo.description);
  }

  const languages = languagesFor(post);
  if (languages.translation === "en") {
    const originalLanguage = languageInfo(languages.original).englishName;
    return sanitizeSeoDescription(`${post.artist} – ${post.song} ${originalLanguage} lyrics with English translation. Explore the meaning, album and contextual line notes.`);
  }

  if (languages.translation !== "tr") {
    const originalLanguage = languageInfo(languages.original).englishName;
    return sanitizeSeoDescription(`${post.artist} – ${post.song} ${originalLanguage} lyrics with ${translationLabel(post, "en").toLowerCase()}. Explore the meaning, album and contextual line notes.`);
  }

  return sanitizeSeoDescription(`${post.artist} – ${post.song} şarkı sözleri ve Türkçe çevirisi. Anlamını, albümünü ve satır açıklamalarını keşfet.`);
}
