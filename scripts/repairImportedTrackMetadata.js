import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";
import { spotifyApiGet } from "../server/spotify.js";

const ROOT = process.cwd();
const POST_FILES = ["src/data/posts.json", "data/content/posts.json"];
const ARTIST_FILES = ["src/data/artists.json", "data/content/artists.json"];
const env = loadEnv("development", ROOT, "");

const TRACKS = {
  "coldplay-twice-we-pray-turkce-ceviri": ["3wLvOITQt7cbK4KzQ3dufu", "WE PRAY"],
  "jennie-ft-fkj-intro-jane-turkce-ceviri": ["4snRyiaLyvTMui0hzp8MF7", "Intro : JANE"],
  "g-dragon-bonamana-turkce-ceviri": ["6fbS9Lbyv6L4tz7tcmBGKh", "BONAMANA"],
  "anne-marie-i-dont-like-your-boyfriend-turkce-ceviri": ["427nKZkn36fkvpTB6b5LkS", "I Don't Like Your Boyfriend"],
  "anne-marie-dont-panic-turkce-ceviri": ["4a80lLYQMh00A2JTSrfilk", "Don't Panic"],
  "the-weeknd-enjoy-the-show-turkce-ceviri-ft-future": ["637oNhilCI9UlkWkUW4Grt", "Enjoy The Show"],
  "the-weeknd-reflections-laughing-turkce-ceviri-ft-travis-scott": ["2gyHr9WqZeMtzJOpWGuGo6", "Reflections Laughing"],
  "suga-interlude-shadow-turkce-ceviri": ["7om4LRoSct9hiMPo0fPn7m", "Interlude : Shadow"],
  "felix-unfair-turkce-ceviri": ["15fpZUMOQD9ONTjxITFXFT", "Unfair"],
  "bang-chan-railway-turkce-ceviri": ["4vNhzQfgfWIzOxbB8HfIHa", "Railway"],
  "jin-in-longing-turkce-ceviri": ["5c2BZj7YSGHwvjf2CtO2S4", "I will come to you"],
  "jin-wendy-heart-on-the-window-turkce-ceviri": ["1b6qYBwDMBpFylGVT4PRgD", "Heart on the Window"],
  "jin-until-i-reach-you-turkce-ceviri": ["1b2uj6I245U3rn3xC3bxbR", "Until It Reaches You"],
  "jin-another-level-turkce-ceviri": ["4xbq37lr4SuP3kuxj9y8gp", "Another Level"],
  "jin-running-wild-turkce-ceviri": ["4p7DTkyrKqT98xlIwYYfXz", "Running Wild"],
  "g-dragon-power-turkce-ceviri": ["4XsJiRJQAK8TWcZCn0Dxlh", "POWER"],
  "jin-ill-be-there-turkce-ceviri": ["2Qcbspnftnon37jibwyvMU", "I'll Be There"],
  "misamo-new-look-turkce-ceviri": ["451U7NEyfqtVefeIgSoJF0", "NEW LOOK"],
  "jin-super-tuna-turkce-ceviri": ["4pygz13A6EcLL6ti7kqGaf", "Super Tuna"],
  "tzuyu-run-away-turkce-ceviri": ["2Ti4DCTo6Ag7QvaYex8A8B", "Run Away"],
  "baekhyun-pineapple-slice-turkce-ceviri": ["13U2hhhgeN57hffBCuaUcw", "Pineapple Slice"],
  "jungkook-somebody-turkce-ceviri": ["5KfJvZ0PZzRdwFRaTUDAA7", "Somebody"],
  "chanyeol-clover-turkce-ceviri": ["7nL4IHAoz90GdS8H2GoIre", "Clover"],
  "chanyeol-im-on-your-side-too-turkce-ceviri": ["6aKmWE59llIs8D3LPUfXMR", "I'm on your side too"],
  "chanyeol-back-again-turkce-ceviri": ["3oNWvAYdLPae1P3hKlMlSH", "Back Again"],
  "chanyeol-ease-up-turkce-ceviri": ["3qEAjqlxlh0L8Xvd1LNj4M", "Ease Up"],
  "chanyeol-hasta-la-vista-turkce-ceviri": ["6wZWi8vMmK0dOtEsKEF5WJ", "Hasta La Vista"],
  "bi-soulja-boy-btbt-ft-devita-turkce-ceviri": ["4XcxgZSriCYamtIA7BgT7V", "BTBT"],
  "chanyeol-black-out-turkce-ceviri": ["5xJWKlQO3wDUgoyNrmm4Bg", "Black Out"],
  "bts-cypher-pt4-turkce-ceviri": ["4cTSnpyaIR1qGaTOLJunDM", "Cypher Pt.4"],
  "kard-where-to-now-turkce-ceviri": ["4PAMDOg5KBjnzocJ60eMpl", "Tell My Momma"],
  "karina-up-turkce-ceviri-yayinlanmamis-sarki": ["5sjnkOfTLCLNfkkchI2re2", "UP"],
  "jung-kook-too-sad-to-dance-turkce-ceviri": ["3bNNvJA7hsGw0wSpGkfOBm", "Too Sad to Dance"],
  "jimin-who-turkce-ceviri": ["7tI8dRuH2Yc6RuoTjxo4dU", "Who"],
  "lisa-moonlit-floor-santa-remix-turkce-ceviri": ["2Dtev1Evm1XyyTRhb6UaD8", "Moonlit Floor (Kiss Me) - Santa Baby Remix"],
  "jisoo-hugs-and-kisses-turkce-ceviri": ["5nQVbMv0XEGLGB39wpneQI", "Hugs & Kisses"],
  "eminem-rihanna-the-monster-turkce-ceviri": ["48RrDBpOSSl1aLVCalGl5C", "The Monster"],
  "ariana-grande-the-weeknd-love-me-harder-turkce-ceviri": ["5J4ZkQpzMUFojo1CtAZYpn", "Love Me Harder"],
  "coldplay-little-simz-burna-boy-elyanna-tini-we-pray-turkce-ceviri": ["7xrEnNo99wrmIs8ZK3RZMK", "WE PRAY"],
};

const EXISTING_TITLE_FIXES = {
  "the-weeknd-i-cant-wait-to-get-there-turkce-ceviri": "I Can't Wait To Get There",
  "charli-xcx-ariana-grande-sympathy-is-a-knife-turkce-ceviri": "Sympathy is a knife",
  "zayn-sia-dusk-till-dawn-turkce-ceviri": "Dusk Till Dawn",
  "charli-xcx-troye-sivan-talk-talk-turkce-ceviri": "Talk talk",
  "bts-cypher-pt3-turkce-ceviri": "Cypher Pt.3: Killer",
  "bts-cypher-pt2-turkce-ceviri": "Cypher Pt.2: Triptych",
  "bts-cypher-pt1-turkce-ceviri": "Cypher Pt.1",
  "zara-larsson-aint-my-fault-turkce-ceviri": "Ain't My Fault",
  "kendrick-lamar-rihanna-loyalty-turkce-ceviri": "LOYALTY.",
};

const VAMPIREHOLLIE_FALLBACK = "https://i.scdn.co/image/ab67616d0000b2737be65ce6672ed7e5aac6e966";

function slugify(value = "") {
  return value
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function duration(ms = 0) {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function albumType(album = {}) {
  if (album.album_type === "single") {
    if ((album.total_tracks || 0) <= 1) return "Single";
    if ((album.total_tracks || 0) <= 6) return "EP";
    return "Album";
  }
  if (album.album_type === "compilation") return "Derleme";
  return "Album";
}

function uniqueCategories(artistNames, post) {
  const pairs = artistNames.map((name) => [name, slugify(name)]);
  for (let index = 0; index < (post.categories || []).length; index += 1) {
    pairs.push([post.categories[index], post.category_slugs?.[index] || slugify(post.categories[index])]);
  }
  const seen = new Set();
  const unique = pairs.filter(([, slug]) => slug && !seen.has(slug) && seen.add(slug));
  return {
    categories: unique.map(([name]) => name),
    category_slugs: unique.map(([, slug]) => slug),
  };
}

function cleanSpotifySong(value = "", artistNames = []) {
  const artistTokens = new Set(
    artistNames.flatMap((name) => name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)),
  );
  return value
    .replace(/\s*[([]\s*(?:feat(?:uring)?\.?|with)\b[^\])]*[\])]/gi, "")
    .replace(/\s+featuring\s+.+$/i, "")
    .replace(/\s+feat\.?\s+.+$/i, "")
    .replace(/\s*\(from the series[^)]*\)\s*$/i, "")
    .replace(/\s*\(([^)]*)\)/g, (group, content) => {
      const tokens = content.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      return tokens.length && tokens.every((token) => token === "x" || artistTokens.has(token)) ? "" : group;
    })
    .replace(/^BTS\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function spotifyData(track, artistDetails) {
  const primary = artistDetails.get(track.artists[0]?.id);
  const cover = track.album?.images?.[0]?.url || null;
  return {
    track: {
      id: track.id,
      name: track.name,
      url: track.external_urls?.spotify || null,
      isrc: track.external_ids?.isrc || null,
      durationMs: track.duration_ms,
      duration: duration(track.duration_ms),
      explicit: !!track.explicit,
      popularity: track.popularity ?? null,
      trackNumber: track.track_number,
      previewUrl: track.preview_url || null,
    },
    artist: {
      id: primary?.id || track.artists[0]?.id,
      name: primary?.name || track.artists[0]?.name,
      url: primary?.external_urls?.spotify || track.artists[0]?.external_urls?.spotify || null,
      image: primary?.images?.[0]?.url || null,
      genres: primary?.genres || [],
      popularity: primary?.popularity ?? null,
      followers: primary?.followers?.total ?? null,
    },
    artists: track.artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      url: artist.external_urls?.spotify || null,
    })),
    album: {
      id: track.album?.id,
      name: track.album?.name,
      url: track.album?.external_urls?.spotify || null,
      cover,
      releaseDate: track.album?.release_date || null,
      albumType: albumType(track.album),
      rawAlbumType: track.album?.album_type || null,
      totalTracks: track.album?.total_tracks || null,
    },
    trackUrl: track.external_urls?.spotify || null,
    albumUrl: track.album?.external_urls?.spotify || null,
    artistUrl: primary?.external_urls?.spotify || null,
    albumName: track.album?.name || null,
    albumType: albumType(track.album),
    releaseDate: track.album?.release_date || null,
    duration: duration(track.duration_ms),
    coverUrl: cover,
    fetchedAt: new Date().toISOString(),
  };
}

const ids = Object.values(TRACKS).map(([id]) => id);
const credentials = { clientId: env.SPOTIFY_CLIENT_ID, clientSecret: env.SPOTIFY_CLIENT_SECRET };
const tracksById = new Map();
for (const id of ids) {
  const track = await spotifyApiGet(`/tracks/${id}`, credentials);
  tracksById.set(track.id, track);
}
if (tracksById.size !== ids.length) throw new Error(`Spotify ${ids.length - tracksById.size} parçayı döndürmedi.`);

const sourcePosts = JSON.parse(await readFile(path.join(ROOT, POST_FILES[0]), "utf8"));
for (const post of sourcePosts) {
  const id = post.spotify?.track?.id;
  if (!id || (post.spotify?.artists || []).length || tracksById.has(id)) continue;
  const track = await spotifyApiGet(`/tracks/${id}`, credentials);
  tracksById.set(track.id, track);
}

const artistIds = [...new Set([...tracksById.values()].flatMap((track) => track.artists.map((artist) => artist.id)))];
const artistDetails = new Map();
for (const id of artistIds) {
  const artist = await spotifyApiGet(`/artists/${id}`, credentials);
  artistDetails.set(artist.id, artist);
}

const sourceArtists = JSON.parse(await readFile(path.join(ROOT, ARTIST_FILES[0]), "utf8"));
const usableArtistNames = new Set(
  sourceArtists
    .filter((artist) => artist.image && !/\/wp-content\/uploads\//i.test(artist.image))
    .map((artist) => artist.name?.trim().toLowerCase()),
);
const missingArtistCredits = new Map();
for (const post of sourcePosts) {
  for (const artist of post.spotify?.artists || []) {
    if (artist.id && !usableArtistNames.has(artist.name?.trim().toLowerCase())) {
      missingArtistCredits.set(artist.id, artist.name);
    }
  }
}
for (const [id] of missingArtistCredits) {
  if (artistDetails.has(id)) continue;
  const artist = await spotifyApiGet(`/artists/${id}`, credentials);
  artistDetails.set(artist.id, artist);
}

function repairPost(post) {
  const configured = TRACKS[post.slug];
  const refreshId = configured?.[0]
    || (!(post.spotify?.artists || []).length ? post.spotify?.track?.id : null);
  if (refreshId) {
    const track = tracksById.get(refreshId);
    const spotify = spotifyData(track, artistDetails);
    const artistNames = track.artists.map((artist) => artist.name);
    const artist = artistNames.join(", ");
    const song = configured?.[1] || cleanSpotifySong(track.name, artistNames);
    const cover = spotify.album.cover;
    return {
      ...post,
      title: `${artist} ${song} Türkçe Çeviri`,
      song,
      artist,
      ...uniqueCategories(artistNames, post),
      image: cover,
      cover,
      spotify,
      source: post.source || "wordpress-spotify",
    };
  }

  if (post.slug === "rose-vampirehollie-turkce-ceviri") {
    return {
      ...post,
      image: VAMPIREHOLLIE_FALLBACK,
      cover: VAMPIREHOLLIE_FALLBACK,
      source: post.source || "wordpress-album-fallback",
    };
  }

  const spotifyTrackName = post.spotify?.track?.name;
  const spotifyArtistNames = (post.spotify?.artists || []).map((artist) => artist.name);
  const fixedSong = EXISTING_TITLE_FIXES[post.slug]
    || (spotifyTrackName && spotifyArtistNames.length
      ? cleanSpotifySong(spotifyTrackName, spotifyArtistNames)
      : null);
  if (!fixedSong) return post;
  const names = spotifyArtistNames.length
    ? spotifyArtistNames
    : String(post.artist || "").split(/\s*,\s*/);
  const artist = names.join(", ");
  return {
    ...post,
    title: `${artist} ${fixedSong} Türkçe Çeviri`,
    song: fixedSong,
    artist,
    ...uniqueCategories(names, post),
  };
}

for (const rel of POST_FILES) {
  const abs = path.join(ROOT, rel);
  const posts = JSON.parse(await readFile(abs, "utf8"));
  await writeFile(abs, `${JSON.stringify(posts.map(repairPost), null, 2)}\n`, "utf8");
}

for (const rel of ARTIST_FILES) {
  const abs = path.join(ROOT, rel);
  const artists = JSON.parse(await readFile(abs, "utf8"));
  const next = [...artists];
  for (const detail of artistDetails.values()) {
    const slug = slugify(detail.name);
    const index = next.findIndex((artist) => artist.slug === slug || artist.name?.toLowerCase() === detail.name.toLowerCase());
    const entry = {
      slug,
      name: detail.name,
      count: index >= 0 ? next[index].count : 1,
      image: detail.images?.[0]?.url || (index >= 0 ? next[index].image : null),
    };
    if (index >= 0) next[index] = { ...next[index], ...entry };
    else next.push(entry);
  }
  await writeFile(abs, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({ spotifyTracksRepaired: tracksById.size, titleCreditsRepaired: Object.keys(EXISTING_TITLE_FIXES).length, albumFallbacks: 1 }, null, 2));
