// Keep navigation history independent of the full song catalog. New visits
// store the card fields; older slug-only records are upgraded on demand.
const HISTORY_KEY = "apl_history";
export const LIBRARY_CHANGE_EVENT = "acupoflyrics:library-change";
const pendingCards = new Map();
let sessionRecords = [];
let storageAvailable = true;

function compactCard(value) {
  const slug = typeof value === "string" ? value : value?.slug;
  if (typeof slug !== "string" || !/^[a-z0-9-]+$/i.test(slug)) return null;
  if (typeof value === "string") return { slug };
  const date = value.spotify?.releaseDate || value.spotify?.album?.releaseDate || value.date;
  const parsedYear = date ? new Date(date).getFullYear() : null;
  return {
    slug,
    ...(typeof value.song === "string" ? { song: value.song } : {}),
    ...(typeof value.artist === "string" ? { artist: value.artist } : {}),
    ...(typeof value.cover === "string" ? { cover: value.cover } : {}),
    year: String(value.year || (Number.isFinite(parsedYear) ? parsedYear : "")),
    readingTime: Number(value.readingTime || value.reading_time) || 2,
  };
}

function readRecords() {
  if (typeof window === "undefined") return [];
  if (!storageAvailable) return sessionRecords;
  try {
    const value = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
    if (!Array.isArray(value)) return sessionRecords;
    const seen = new Set();
    sessionRecords = value.map(compactCard).filter((record) => {
      if (!record || seen.has(record.slug)) return false;
      seen.add(record.slug); return true;
    }).slice(0, 12);
  } catch { storageAvailable = false; }
  return sessionRecords;
}

function writeRecords(records, notify = true) {
  sessionRecords = records.slice(0, 12);
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(sessionRecords)); } catch { storageAvailable = false; }
  if (notify) window.dispatchEvent(new CustomEvent(LIBRARY_CHANGE_EVENT));
}

export function addHistory(slug, post = null) {
  const records = readRecords();
  const previous = records.find((record) => record.slug === slug);
  const card = compactCard(post ? { ...post, slug } : previous || slug);
  if (!card) return;
  writeRecords([card, ...records.filter((record) => record.slug !== slug)]);
}

export function getHistorySlugs() {
  return readRecords().map((record) => record.slug);
}

export function getHistory() {
  return readRecords().filter((record) => record.song && record.artist && record.cover);
}

function fetchCard(slug) {
  if (!pendingCards.has(slug)) {
    pendingCards.set(slug, fetch(`/data/cards/${encodeURIComponent(slug)}.json`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Geçmiş kartı yüklenemedi");
        const record = compactCard(await response.json());
        if (record?.slug !== slug || !record.song || !record.artist || !record.cover) throw new Error("Geçmiş kartı okunamadı");
        return record;
      })
      .finally(() => pendingCards.delete(slug)));
  }
  return pendingCards.get(slug);
}

export async function loadHistoryCards() {
  const missing = readRecords().slice(0, 6).filter((record) => !record.song || !record.artist || !record.cover);
  if (!missing.length) return getHistory();
  const settled = await Promise.allSettled(missing.map((record) => fetchCard(record.slug)));
  const loaded = new Map(settled.filter((result) => result.status === "fulfilled").map((result) => [result.value.slug, result.value]));
  if (loaded.size) writeRecords(readRecords().map((record) => loaded.get(record.slug) || record), false);
  return getHistory();
}
