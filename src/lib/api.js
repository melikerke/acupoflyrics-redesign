// Thin client helpers that talk to the project's /api/* backend (see
// server/apiPlugin.js). All secrets live server-side; the browser only ever
// hits these same-origin routes.

async function getJson(url) {
  const res = await fetch(url, { credentials: "include" });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Beklenmeyen yanıt (${res.status})`);
  }
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
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Beklenmeyen yanıt (${res.status})`);
  }
  if (!res.ok) throw new Error(data?.error || `Güncelleme başarısız (${res.status})`);
  return data;
}

// Publish an admin export record into the site's data files. Returns { slug }.
export async function publishRecord(record) {
  const res = await fetch("/api/publish", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Beklenmeyen yanıt (${res.status})`);
  }
  if (!res.ok) throw new Error(data?.error || `Yayınlanamadı (${res.status})`);
  return data;
}
