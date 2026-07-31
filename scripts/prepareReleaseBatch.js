import { readFile, writeFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const OUTPUT = "/tmp/acupoflyrics-release-batch-2026-07-31.json";

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) return null;
    return [match[1], match[2].replace(/^['\"]|['\"]$/g, "")];
  }).filter(Boolean));
}

const env = parseEnv(await readFile(new URL(".env", ROOT), "utf8"));
if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
  throw new Error("Spotify kimlik bilgileri .env dosyasında bulunamadı.");
}

const singles = [
  ["Cardi B — AH HA", "7awgIcUKyMTpuQjT7HzSfN"],
  ["benny blanco, Selena Gomez, Becky G — Te Olvido (La La)", "1jwOmkFny7BUQ8ecRVa355"],
  ["Slayyyter — brand new chanel$", "3FZoov0ORtnr8TznSNI1y2"],
  ["INJI — BRIGHT IDEAS", "4whVtTnaIfNEvG8eKSEVxB"],
  ["Ellie Goulding — 4 Seasons", "0osmNNM8XqDRFBGY4tR545"],
  ["CupcakKe — That’s Like", "5liBeD9560NjlV9W7Vu0tG"],
  ["mgk, Yuki Chiba — JJK", "6acCX2vGgm8mBFJ65mGySQ"],
  ["Mark Tuan — Alone", "6i3RWseuI9ciqu1OtZUe3f"],
  ["CORTIS, Juicy J — MOTION", "15EbINtnOI4c2jPXXskywy"],
  ["no na — honk!", "462r5jEYbiNo6sqwCcRqhU"],
  ["Skilla Baby — Show Me Love", "0lvsPMru2v8WzadA3t4Poi"],
  ["Rachel Chinouriri — One song away from crying", "7EzqmGOTlrzy1NxZRjeuVV"],
  ["Ari Lennox — Hookah Baby", "5K32Q21Oc1weiMtLDqVULI"],
  ["Logic — A Man Free", "0FuXPVjTdLeRZva6JIcYX4"],
  ["SB19 — LAWLESS", "6DyUH0V8c8fy5hg40O16Jn"],
  ["Swedish House Mafia, Lykke Li — Happiness Is So Sad", "5Vz9XUiw2emOIRLobTMEkD"],
  ["Tones And I — Home To Me", "1mPyG0CnY5CyTwIl75xpc9"],
  ["Ava Max — Work", "00Xuy2tVDaGt9XTfY3yUyV"],
  ["Alan Walker — Pain", "2OPst1Pir86MpT6Rt9Zjbw"],
  ["BE:FIRST, Flo Milli, ATL Jacob — BRUCE WAYNE", "41bI4N12BHk4wMGClHwBtF"],
  ["Dinah Jane — Strength Of A Woman", "0HqN7ZQ6PlW7nb7s4y5np7"],
];

const albums = [
  ["Arca — XXXXX", "5L4HUwPtyxAoW27leVlZql"],
  ["Shaboozey — The Outlaw Cherie Lee & Other Western Tales", "6t5UZQ2C2Rt6PtBA7GPbE2"],
  ["Davido — Oriadé", "43hCvloofcUeEmpK6RFldz"],
  ["Green Day — Nimrods Original Soundtrack", "4Fz1Rz0WlGAbBSht1UPmNw"],
  ["Juicy J — The Clock Don’t Go Back", "03Rtmq1Acm34vWhG6eOYd6"],
  ["$TARFACE, Tyga — $TARFACE", "6sP5Exlpl3wK4nWnvwksQ4"],
  ["Mad Tsai — CANINES", "7jRVnXlOfv9qoj5nM4OBOC"],
  ["R3HAB — Dream inside a dream…", "11H0ggNORjbmX0LhZ9iK2d"],
  ["PNAU — AHHCade", "0hlWE02p9OIt0NhbWLwgVo"],
  ["Logic — Paradise Records", "40Hm1ZgcdadbdymClfKAGg"],
];

async function spotifyToken() {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error(`Spotify token hatası: ${response.status}`);
  return (await response.json()).access_token;
}

const token = await spotifyToken();
async function spotify(path) {
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Spotify ${path}: ${response.status}`);
  return response.json();
}

async function fullAlbum(id) {
  const album = await spotify(`/albums/${id}`);
  let items = [...album.tracks.items];
  let next = album.tracks.next;
  while (next) {
    const page = await (await fetch(next, { headers: { Authorization: `Bearer ${token}` } })).json();
    items.push(...page.items);
    next = page.next;
  }
  return { ...album, tracks: items };
}

function simplify(track, album, group, groupOrder, trackOrder, kind) {
  return {
    group,
    groupOrder,
    trackOrder,
    kind,
    id: track.id,
    name: track.name,
    artists: track.artists.map(({ id, name, external_urls }) => ({ id, name, url: external_urls.spotify })),
    spotifyUrl: track.external_urls.spotify,
    durationMs: track.duration_ms,
    explicit: track.explicit,
    discNumber: track.disc_number,
    album: {
      id: album.id,
      name: album.name,
      spotifyUrl: album.external_urls.spotify,
      artists: (album.artists || []).map(({ id, name, external_urls }) => ({
        id,
        name,
        url: external_urls.spotify,
      })),
      releaseDate: album.release_date,
      releaseDatePrecision: album.release_date_precision,
      images: album.images,
      totalTracks: album.total_tracks,
      type: album.album_type,
    },
  };
}

async function lyricsOvh(track) {
  const artistCandidates = [
    track.artists[0]?.name,
    track.artists.map((artist) => artist.name).join(", "),
  ].filter(Boolean);
  for (const artist of [...new Set(artistCandidates)]) {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track.name)}`;
    const response = await fetch(url);
    if (!response.ok) continue;
    const data = await response.json();
    if (data.lyrics?.trim()) return { source: "lyrics.ovh", artistQuery: artist, lyrics: data.lyrics.trim() };
  }
  return null;
}

const queue = [];
for (let i = 0; i < singles.length; i += 1) {
  const [group, id] = singles[i];
  const track = await spotify(`/tracks/${id}`);
  queue.push(simplify(track, track.album, group, i + 1, 1, "single"));
}
for (let i = 0; i < albums.length; i += 1) {
  const [group, id] = albums[i];
  const album = await fullAlbum(id);
  for (let j = 0; j < album.tracks.length; j += 1) {
    const track = album.tracks[j];
    queue.push(simplify(track, album, group, singles.length + i + 1, j + 1, "album"));
  }
}

const unique = [...new Map(queue.map((track) => [track.id, track])).values()];
for (let i = 0; i < unique.length; i += 1) {
  unique[i].lyrics = await lyricsOvh(unique[i]);
  if ((i + 1) % 20 === 0) console.log(`Söz taraması: ${i + 1}/${unique.length}`);
}

await writeFile(OUTPUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), tracks: unique }, null, 2)}\n`, "utf8");
const found = unique.filter((track) => track.lyrics).length;
console.log(JSON.stringify({ output: OUTPUT, uniqueTracks: unique.length, lyricsFound: found, lyricsMissing: unique.length - found }, null, 2));
