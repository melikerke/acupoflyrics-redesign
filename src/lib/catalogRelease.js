function normalizeTrackTitle(value) {
  return String(value || "").replace(/[ıİ]/g, "i").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function albumCoverage(album) {
  const tracks = album?.tracks || [];
  const translated = new Set(tracks.map((post) => post.spotify?.trackUrl || normalizeTrackTitle(post.song))).size;
  const totals = [...new Set([album?.totalTracks, ...tracks.map((post) => post.spotify?.totalTracks)].map(Number).filter((value) => Number.isInteger(value) && value > 0))];
  const total = totals.length === 1 && totals[0] >= translated ? totals[0] : null;
  return { translated, total, missing: total == null ? null : total - translated };
}

export function albumArchiveDescription(album) {
  if (!album) return "";
  const coverage = albumCoverage(album);
  return `${album.artist} — ${album.name} için arşivde ${album.tracks.length} çeviri bulunuyor.${coverage.total ? ` Kaynakta belirtilen ${coverage.total} parçanın ${coverage.translated} tanesi çevrildi.` : " Bu sayfa arşivde bulunan çevirileri listeler."}`;
}

export function catalogReleaseYear(post) {
  const value = post.spotify?.releaseDate || post.spotify?.album?.release_date || post.date || "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value).slice(0, 4) : String(parsed.getFullYear());
}

export function artistArchiveSummary(artist) {
  const years = [...new Set(artist.posts.map(catalogReleaseYear).filter((year) => /^\d{4}$/.test(year)))].sort();
  const range = years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : years[0];
  return `${artist.name} için bu arşivde ${artist.count} şarkı çevirisi ve ${artist.albums.length} albüm, tekli veya EP sayfası bulunuyor.${range ? ` Çevrilen şarkıların yayın yılları: ${range}.` : ""} Ortak çalışmalardaki sanatçı kredileri de bu seçkiye dahil.`;
}
