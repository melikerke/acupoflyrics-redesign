export const DEFAULT_LANGUAGES = Object.freeze({
  original: "en",
  translation: "tr",
  annotations: "tr",
});

const LANGUAGE_INFO = {
  ar: { short: "AR", nativeName: "العربية", turkishName: "Arapça", englishName: "Arabic" },
  de: { short: "DE", nativeName: "Deutsch", turkishName: "Almanca", englishName: "German" },
  en: { short: "EN", nativeName: "English", turkishName: "İngilizce", englishName: "English" },
  es: { short: "ES", nativeName: "Español", turkishName: "İspanyolca", englishName: "Spanish" },
  fr: { short: "FR", nativeName: "Français", turkishName: "Fransızca", englishName: "French" },
  it: { short: "IT", nativeName: "Italiano", turkishName: "İtalyanca", englishName: "Italian" },
  ja: { short: "JA", nativeName: "日本語", turkishName: "Japonca", englishName: "Japanese" },
  ko: { short: "KO", nativeName: "한국어", turkishName: "Korece", englishName: "Korean" },
  pt: { short: "PT", nativeName: "Português", turkishName: "Portekizce", englishName: "Portuguese" },
  tr: { short: "TR", nativeName: "Türkçe", turkishName: "Türkçe", englishName: "Turkish" },
};

function normalizeCode(value, fallback) {
  const code = String(value || fallback || "")
    .trim()
    .replace(/_/g, "-")
    .toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code) ? code : fallback;
}

export function languagesFor(post) {
  const configured = post?.languages && typeof post.languages === "object"
    ? post.languages
    : {};
  const original = normalizeCode(configured.original, DEFAULT_LANGUAGES.original);
  const translation = normalizeCode(configured.translation, DEFAULT_LANGUAGES.translation);
  const annotations = normalizeCode(configured.annotations, DEFAULT_LANGUAGES.annotations);
  return { original, translation, annotations };
}

export function languageInfo(code) {
  const normalized = normalizeCode(code, "en");
  const base = normalized.split("-")[0];
  const known = LANGUAGE_INFO[base];
  if (known) return { ...known, locale: normalized };

  const fallbackName = normalized.toUpperCase();
  return {
    short: fallbackName,
    nativeName: fallbackName,
    turkishName: fallbackName,
    englishName: fallbackName,
    locale: normalized,
  };
}

export function translationLabel(post, locale = "tr") {
  const target = languagesFor(post).translation;
  const info = languageInfo(target);
  return String(locale).toLowerCase().startsWith("en")
    ? `${info.englishName} Translation`
    : `${info.turkishName} Çeviri`;
}

export function translationSlugSuffix(post) {
  const target = languagesFor(post).translation;
  if (target === "tr") return "turkce-ceviri";
  if (target === "en") return "english-translation";
  return `${target.replace(/[^a-z0-9]+/g, "-")}-translation`;
}
