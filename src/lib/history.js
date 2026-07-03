import { getPost } from "./content";

const KEY = "apl_history";

export function addHistory(slug) {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || "[]").filter((s) => s !== slug);
    arr.unshift(slug);
    localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 12)));
  } catch { /* ignore */ }
}

export function getHistory() {
  try {
    const slugs = JSON.parse(localStorage.getItem(KEY) || "[]");
    return slugs.map(getPost).filter(Boolean);
  } catch {
    return [];
  }
}
