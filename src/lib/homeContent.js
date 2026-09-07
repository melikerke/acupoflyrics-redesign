// The home page needs these display values, not the complete searchable catalog.
export const firstPair = (post) => post.firstPair || { en: "", tr: "" };
export const releaseYear = (post) => post.year || "";
export const metricsFor = (post) => post.metrics || { readingTime: post.readingTime || 2 };
export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
