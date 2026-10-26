import { languageInfo, languagesFor, translationLabel } from "./languages.js";
import { songEditorialDescriptions } from '../data/songEditorialSeo.js';

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
  // Preserve complete credits in the editorial template, even for long duets.
  if (/^.+ – .+ (?:Türkçe )?Çeviri(?:, Sözleri(?: ve Anlamı)?)?$/.test(title)) return title;
  if (/^.+ Sözleri(?: ve|,) Türkçe Çeviri – .+$/.test(title)) return title;
  const withoutSite = title.replace(/\s*\|\s*acupoflyrics\s*$/i, "").trim();
  const lead = withoutSite.split(/\s+[—–]\s+/)[0];
  return fitSeoTitle([title, withoutSite, `${lead} | acupoflyrics`, lead]);
}

export function articleMetaTitle(article) {
  const suffix = ' | acupoflyrics';
  const clean = value => String(value || '').replace(/\s*\|\s*(?:acupoflyrics|Pop Günlüğü)\s*$/i, '').trim();
  const candidates = [article.seoTitle, article.shortTitle, article.title].map(clean).filter(Boolean);
  const budget = META_TITLE_MAX - suffix.length;
  const title = candidates.find(value => value.length <= budget) || fitSeoTitle([candidates[0] || 'Pop Günlüğü'], budget);
  return `${title}${suffix}`;
}

export function completeSeoDescription(value, locale = "tr") {
  // A complete short sentence is better than padding to a character target.
  // The brand includes "lyrics", so content text must never infer its locale.
  return sanitizeSeoDescription(value) || (locale === "en"
    ? "Discover song lyrics, thoughtful translations and contextual notes in the acupoflyrics archive."
    : "Şarkı sözlerini, özenli çevirileri, sanatçı ve albüm arşivlerini acupoflyrics üzerinde bağlamlarıyla keşfet.");
}

export function translationMetaTitle(post) {
  if (!post) return "Şarkı Çevirileri | acupoflyrics";
  if (usesCatalogTitle(post)) return catalogTranslationTitle(post);
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

export function usesCatalogTitle(post) {
  return languagesFor(post).translation === 'tr';
}

export function catalogTitleIdentity(post) {
  // Only title presentation changes; full on-page credits and lyric text remain intact.
  // Remix credit verified: https://music.apple.com/us/album/1796001176
  const remix = post.slug === 'tyla-sean-paul-push-2-start-turkce-ceviri';
  const artist = (remix ? 'Tyla, Sean Paul' : String(post.artist || '').replace(/Tate Mcrae/gi, 'Tate McRae'))
    .replace(/\s+/g, ' ').trim().replace('Dolly Parton & Kenny Rogers', 'Dolly Parton, Kenny Rogers');
  const artists = artist.split(/\s*,\s*|\s+feat\.?\s+|\s+ft\.?\s+/i).filter(Boolean);
  let song = remix ? 'PUSH 2 START (Remix)' : String(post.song || '');
  song = song.replace(/\s*\((?:from\s+|feat\.?\s+|ft\.?\s+)[^)]*\)/gi, '').replace(/\s*[-–]\s*bonus track\s*$/i, '').trim();
  if (post.slug === 'gims-est-ce-que-tu-maimes-turkce-ceviri') song = "Est-ce que tu m'aimes ?";
  return { song, artists };
}

export function catalogTranslationTitle(post) {
  const { song, artists } = catalogTitleIdentity(post);
  const credit = artists.slice(0, 2).join(', ') + (artists.length > 2 ? ' vd.' : '');
  const full = `${credit} – ${song} Türkçe Çeviri, Sözleri ve Anlamı`;
  if (full.length <= 60) return full;
  const long = `${song} Sözleri ve Türkçe Çeviri – ${credit}`;
  if (long.length <= 65) return long;
  // Prefer one credited artist plus vd. over cutting the search intent or song name.
  const shortCredit = artists.length > 1 ? `${artists[0]} vd.` : credit;
  const shorter = `${song} Sözleri ve Türkçe Çeviri – ${shortCredit}`;
  return shorter.length <= 65 ? shorter : `${song} Sözleri, Türkçe Çeviri – ${shortCredit}`;
}

export function isLegacyLyricDescription(value) {
  return /Türkçe\s+Çeviri\s*\|/iu.test(String(value || ''));
}

function isEditorialDescription(value) {
  if (isLegacyLyricDescription(value)) return false;
  const text = sanitizeSeoDescription(value);
  return text.length >= 90 && /türkçe|çeviri|şarkı|anlam|lyrics?|translation|meaning/i.test(text);
}

export function translationMetaDescription(post) {
  if (!post) return "Aradığın şarkı sözlerini ve Türkçe çevirileri acupoflyrics arşivinde keşfet.";
  if (songEditorialDescriptions[post.slug]) return songEditorialDescriptions[post.slug];

  if (isEditorialDescription(post.seo?.description)) {
    return sanitizeSeoDescription(post.seo.description);
  }

  const languages = languagesFor(post);
  if (languages.translation === "en") {
    const originalLanguage = languageInfo(languages.original).englishName;
    return sanitizeSeoDescription(`${post.artist} – ${post.song} ${originalLanguage} lyrics with English translation. Read the original lyrics alongside the translation.`);
  }

  if (languages.translation !== "tr") {
    const originalLanguage = languageInfo(languages.original).englishName;
    return sanitizeSeoDescription(`${post.artist} – ${post.song} ${originalLanguage} lyrics with ${translationLabel(post, "en").toLowerCase()}. Read the original lyrics alongside the translation.`);
  }

  return catalogTranslationDescription(post);
}

export function catalogTranslationDescription(post) {
  const lead = `${post.artist} – ${post.song} sözleri ve Türkçe çevirisi.`;
  const album = String(post.spotify?.albumName || post.spotify?.album?.name || '').trim();
  // Article publication dates are not recording release dates.
  const release = String(post.spotify?.releaseDate || post.spotify?.album?.releaseDate || post.spotify?.album?.release_date || '');
  const year = /^\d{4}(?:-|$)/.test(release) ? release.slice(0, 4) : '';
  const type = String(post.spotify?.albumType || post.spotify?.album?.albumType || post.spotify?.album?.rawAlbumType || '').toLowerCase();
  const kind = type === 'single' ? 'Tekli' : type === 'ep' ? 'EP' : 'Albüm';
  const context = album ? `${kind}: ${album}${year ? ` (${year})` : ''}.` : year ? `Yayın yılı: ${year}.` : '';
  const hasNotes = Object.values(post.annotations || {}).some(note => typeof note === 'string' && note.trim());
  const reading = hasNotes ? 'Orijinal sözleri ve çeviri notlarını oku.' : 'Orijinal sözleri ve çeviriyi birlikte oku.';
  const options = [
    [lead, context, reading].filter(Boolean).join(' '),
    [lead, context].filter(Boolean).join(' '),
    [lead, year ? `Yayın yılı: ${year}.` : '', reading].filter(Boolean).join(' '),
    `${lead} ${reading}`,
    lead,
  ];
  return options.find(text => text.length <= META_DESCRIPTION_MAX) || sanitizeSeoDescription(lead);
}
