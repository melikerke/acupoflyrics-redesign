import { getPost } from "./content";

const HISTORY_KEY = "apl_history";
export const LIBRARY_CHANGE_EVENT = "acupoflyrics:library-change";

function readSlugs(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((slug) => typeof slug === "string") : [];
  } catch {
    return [];
  }
}

function writeSlugs(key, slugs) {
  try {
    window.localStorage.setItem(key, JSON.stringify(slugs));
    window.dispatchEvent(new CustomEvent(LIBRARY_CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function addHistory(slug) {
  const slugs = readSlugs(HISTORY_KEY).filter((item) => item !== slug);
  slugs.unshift(slug);
  writeSlugs(HISTORY_KEY, slugs.slice(0, 12));
}

export function getHistory() {
  return readSlugs(HISTORY_KEY).map(getPost).filter(Boolean);
}
