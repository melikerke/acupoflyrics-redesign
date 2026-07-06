// Thin client helpers that talk to the project's /api/* backend (see
// server/apiPlugin.js). All secrets live server-side; the browser only ever
// hits these same-origin routes.

async function readResponseJson(res, fallback) {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Sunucudan boş yanıt geldi (${res.status}). Sayfayı yenileyip tekrar dene.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(fallback || `Beklenmeyen yanıt (${res.status})`);
  }
}

async function getJson(url) {
  const res = await fetch(url, { credentials: "include" });
  const data = await readResponseJson(res, `Beklenmeyen yanıt (${res.status})`);
  if (!res.ok) throw new Error(data?.error || `İstek başarısız (${res.status})`);
  return data;
}

// Fetch the full Spotify bundle (track + artist + album + tracklist) for a
// pasted Spotify track URL / URI / id.
export function fetchSpotifyTrack(spotifyUrl) {
  return getJson(`/api/spotify/track?url=${encodeURIComponent(spotifyUrl)}`);
}

// Find the matching Genius song (lyrics + metadata) for an artist + title,
// typically taken straight from the Spotify result.
export function fetchGeniusMatch(artist, title) {
  const params = new URLSearchParams({ artist: artist || "", title: title || "" });
  return getJson(`/api/genius/match?${params.toString()}`);
}

// Refresh the /listeler chart data from live sources (Billboard, Apple RSS,
// Spotify). Writes src/data/musicLists.json server-side; returns a summary.
export async function refreshCharts() {
  const res = await fetch("/api/charts/refresh", { method: "POST", credentials: "include" });
  const data = await readResponseJson(res, `Beklenmeyen yanıt (${res.status})`);
  if (!res.ok) throw new Error(data?.error || `Güncelleme başarısız (${res.status})`);
  return data;
}

// Publish an admin export record into the site's data files. Returns { slug }.
export async function publishRecord(record) {
  let body;
  try {
    body = JSON.stringify(record);
  } catch {
    throw new Error("Yayın verisi hazırlanamadı. Sayfayı yenileyip tekrar dene.");
  }
  if (!body || body === "null") {
    throw new Error("Yayınlanacak veri boş. Önce Spotify ve çeviri adımlarını tamamla.");
  }
  const res = await fetch("/api/publish", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await readResponseJson(res, `Yayın endpoint'i beklenmeyen yanıt döndürdü (${res.status})`);
  if (!res.ok) throw new Error(data?.error || `Yayınlanamadı (${res.status})`);
  return data;
}
