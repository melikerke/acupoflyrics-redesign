// Server-side Spotify Web API client (Client Credentials flow).
// Runs only in Node (inside the Vite dev/preview server) so the client secret
// never reaches the browser, and so we avoid the browser CORS block on the
// token endpoint.

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";

let cachedToken = null; // { value, expiresAt }

// Pull a 22-char Spotify track id out of whatever the user pasted: a full
// open.spotify.com URL (with or without an /intl-xx/ locale segment), a
// spotify:track: URI, or a bare id.
export function extractTrackId(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^[A-Za-z0-9]{22}$/.test(s)) return s;
  const uri = s.match(/spotify:track:([A-Za-z0-9]{22})/);
  if (uri) return uri[1];
  const url = s.match(/track\/([A-Za-z0-9]{22})/);
  if (url) return url[1];
  return null;
}

async function getToken(clientId, clientSecret) {
  if (!clientId || !clientSecret) {
    throw new Error(
      "Spotify kimlik bilgileri eksik. .env dosyasına SPOTIFY_CLIENT_ID ve SPOTIFY_CLIENT_SECRET ekleyin."
    );
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) return cachedToken.value;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify token hatası (${res.status}): ${t}`);
  }
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function api(path, token, attempts = 0) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 429) {
    if (attempts >= 3) {
      throw new Error(`Spotify API rate limit (${path}). Biraz sonra tekrar deneyin.`);
    }
    const retryAfter = Number(res.headers.get("retry-after") || "2");
    await new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(1, retryAfter), 15) * 1000));
    return api(path, token, attempts + 1);
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify API hatası (${res.status}) ${path}: ${t}`);
  }
  return res.json();
}

function largestImage(images) {
  if (!images || !images.length) return null;
  return images.slice().sort((a, b) => (b.width || 0) - (a.width || 0))[0].url;
}

function msToDuration(ms) {
  if (ms == null) return null;
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/feat\.?.*$/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTrackCandidate(track, artist, title) {
  const wantedTitle = norm(title);
  const wantedArtist = norm(artist);
  const trackTitle = norm(track.name);
  const artistNames = (track.artists || []).map((a) => norm(a.name));
  let score = 0;
  if (trackTitle === wantedTitle) score += 5;
  else if (trackTitle.includes(wantedTitle) || wantedTitle.includes(trackTitle)) score += 2;
  if (artistNames.includes(wantedArtist)) score += 4;
  else if (artistNames.some((name) => name.includes(wantedArtist) || wantedArtist.includes(name))) score += 2;
  return score;
}

// Spotify only exposes album_type = single | album | compilation. The user
// asked for Single / EP / Album, so we infer EP from short multi-track
// "single" releases — the common industry convention.
function classifyAlbum(album) {
  const type = album.album_type;
  const n = album.total_tracks || album.tracks?.items?.length || 0;
  if (type === "single") {
    if (n <= 1) return "Single";
    if (n <= 6) return "EP";
    return "Album";
  }
  if (type === "compilation") return "Derleme";
  return "Album";
}

// The /albums endpoint returns up to 50 tracks per page; follow .next so big
// albums come back complete.
async function allAlbumTracks(album, token) {
  const items = [...(album.tracks?.items || [])];
  let next = album.tracks?.next;
  while (next) {
    const page = await api(next.replace(API, ""), token);
    items.push(...(page.items || []));
    next = page.next;
  }
  return items;
}

export async function fetchTrackBundle(input, { clientId, clientSecret }) {
  const id = extractTrackId(input);
  if (!id) throw new Error("Geçerli bir Spotify track linki bulunamadı.");

  const token = await getToken(clientId, clientSecret);
  const track = await api(`/tracks/${id}`, token);
  const primaryArtistId = track.artists[0]?.id;

  const [artist, album] = await Promise.all([
    primaryArtistId ? api(`/artists/${primaryArtistId}`, token) : Promise.resolve(null),
    api(`/albums/${track.album.id}`, token),
  ]);

  const albumTracks = await allAlbumTracks(album, token);

  return {
    track: {
      id: track.id,
      name: track.name,
      url: track.external_urls?.spotify || null,
      isrc: track.external_ids?.isrc || null,
      durationMs: track.duration_ms,
      duration: msToDuration(track.duration_ms),
      explicit: !!track.explicit,
      popularity: track.popularity ?? null,
      trackNumber: track.track_number,
      previewUrl: track.preview_url || null,
    },
    artist: artist
      ? {
          id: artist.id,
          name: artist.name,
          url: artist.external_urls?.spotify || null,
          image: largestImage(artist.images),
          genres: artist.genres || [],
          popularity: artist.popularity ?? null,
          followers: artist.followers?.total ?? null,
        }
      : { name: track.artists[0]?.name || null },
    // All credited artists on the track (feat. etc.).
    artists: track.artists.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.external_urls?.spotify || null,
    })),
    album: {
      id: album.id,
      name: album.name,
      url: album.external_urls?.spotify || null,
      cover: largestImage(album.images),
      releaseDate: album.release_date,
      releaseDatePrecision: album.release_date_precision,
      albumType: classifyAlbum(album),
      rawAlbumType: album.album_type,
      label: album.label || null,
      copyrights: (album.copyrights || []).map((c) => ({ text: c.text, type: c.type })),
      totalTracks: album.total_tracks,
      tracks: albumTracks.map((t) => ({
        id: t.id,
        name: t.name,
        trackNumber: t.track_number,
        discNumber: t.disc_number,
        durationMs: t.duration_ms,
        duration: msToDuration(t.duration_ms),
        explicit: !!t.explicit,
        url: t.external_urls?.spotify || null,
        isCurrent: t.id === track.id,
      })),
    },
    fetchedAt: new Date().toISOString(),
  };
}

export async function searchTrackBundle({ artist, title }, { clientId, clientSecret }) {
  if (!title) throw new Error("Spotify araması için şarkı adı gerekli.");
  const token = await getToken(clientId, clientSecret);
  const query = [artist ? `artist:${artist}` : "", `track:${title}`].filter(Boolean).join(" ");
  const search = await api(`/search?type=track&limit=8&q=${encodeURIComponent(query)}`, token);
  const items = search.tracks?.items || [];
  if (!items.length) return { matched: false, candidates: [] };

  let best = items[0];
  let bestScore = -1;
  for (const item of items) {
    const score = scoreTrackCandidate(item, artist, title);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (bestScore < 4) {
    return {
      matched: false,
      candidates: items.map((item) => ({
        id: item.id,
        name: item.name,
        artist: item.artists?.map((a) => a.name).join(", "),
        url: item.external_urls?.spotify || null,
        score: scoreTrackCandidate(item, artist, title),
      })),
    };
  }

  const bundle = await fetchTrackBundle(best.id, { clientId, clientSecret });
  return {
    matched: true,
    score: bestScore,
    bundle,
    candidates: items.slice(0, 5).map((item) => ({
      id: item.id,
      name: item.name,
      artist: item.artists?.map((a) => a.name).join(", "),
      url: item.external_urls?.spotify || null,
      score: scoreTrackCandidate(item, artist, title),
    })),
  };
}

// Generic authenticated GET against the Spotify Web API — used by charts.js
// for playlist snapshots. Keeps the token/caching logic in one place.
export async function spotifyApiGet(path, { clientId, clientSecret } = {}) {
  const token = await getToken(clientId, clientSecret);
  return api(path, token);
}
