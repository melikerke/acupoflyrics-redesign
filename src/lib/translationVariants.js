import translations from "../data/translationIndex.json";

export { translations };
export { spanishHome } from "./spanishMetadata";
export const variantsFor = (sourceSlug) => translations.filter((item) => item.sourceSlug === sourceSlug);
export function languageAlternates(sourceSlug) {
  const variants = variantsFor(sourceSlug);
  if (!variants.length) return [];
  return [{ language: "tr", path: `/${sourceSlug}/` }, ...variants.map((item) => ({ language: item.locale, path: item.path }))];
}
