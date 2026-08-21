import { languageInfo, languagesFor, translationLabel } from "./languages.js";

function isEditorialDescription(value) {
  const text = String(value || "").trim();
  return text.length >= 90 && /türkçe|çeviri|şarkı|anlam|lyrics?|translation|meaning/i.test(text);
}

export function translationMetaDescription(post) {
  if (!post) return "Aradığın şarkı sözlerini ve Türkçe çevirileri acupoflyrics arşivinde keşfet.";

  if (isEditorialDescription(post.seo?.description)) {
    return post.seo.description.trim();
  }

  const languages = languagesFor(post);
  if (languages.translation === "en") {
    const originalLanguage = languageInfo(languages.original).englishName;
    return `${post.artist} – ${post.song} ${originalLanguage} lyrics and English translation. Explore the song's meaning, album details and contextual line notes.`;
  }

  if (languages.translation !== "tr") {
    const originalLanguage = languageInfo(languages.original).englishName;
    return `${post.artist} – ${post.song} ${originalLanguage} lyrics and ${translationLabel(post, "en").toLowerCase()}. Explore the song's meaning, album details and contextual line notes.`;
  }

  return `${post.artist} – ${post.song} şarkı sözleri ve özenli Türkçe çevirisi. Şarkının anlamını, albüm bilgilerini ve satır açıklamalarını keşfet.`;
}
