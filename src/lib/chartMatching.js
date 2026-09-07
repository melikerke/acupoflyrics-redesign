export const isAlbumChart = list => list.id === "billboard-200" || list.type === "album";

export function normalizeChartText(value) {
  return String(value || "").replace(/[ıİ]/g, "i").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/\s*\(?ep\)?\s*$/i, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function sameArtist(a, b) {
  if (normalizeChartText(a) === normalizeChartText(b)) return true;
  const names = value => String(value).split(/\s*(?:,|&|feat\.?|featuring)\s*/i).map(normalizeChartText).filter(Boolean);
  return names(a).some(name => names(b).includes(name));
}

export function matchChartEntry(list, entry, posts, albums) {
  const title = normalizeChartText(entry.title);
  const album = isAlbumChart(list);
  const item = (album ? albums : posts).find(candidate =>
    normalizeChartText(album ? candidate.name : candidate.song) === title && sameArtist(entry.artist, candidate.artist));
  return item ? { type: album ? "album" : "song", item } : null;
}
