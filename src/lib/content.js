import posts from "../data/postIndex.json";
import artistsRaw from "../data/artists.json";
import { linesFor } from "./searchLines";

const total = posts.length;

const FEATURED_PREFIXES = [
  "benny blanco",
  "gracie abrams",
  "zayn",
  "rm",
];

function cleanSongTitle(value) {
  let title = String(value || "")
    .replace(/\s*T[üu]rkçe\s+Çeviri\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  title = title.replace(/^&\s*[^-–—]+[-–—]\s*/, "").trim();

  let changed = true;
  while (changed) {
    changed = false;
    for (const name of FEATURED_PREFIXES) {
      const next = title.replace(new RegExp(`^&\\s*${name}\\s*`, "i"), "").trim();
      if (next !== title) {
        title = next;
        changed = true;
      }
    }
  }

  return title || value;
}

// Each post gets a stable accession number (newest = highest) and a deterministic
// "voice" (subtle typographic pacing per artist — idea #3, no fake data).
export function stableHash(str) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const enriched = posts.map((p, i) => ({
  ...p,
  song: cleanSongTitle(p.song || p.title),
  no: total - i,
  voice: stableHash(p.artist) % 3, // 0 = airy/slow, 1 = neutral, 2 = dense/tight
}));

export const allPosts = enriched;
export const allArtists = artistsRaw;
export const totalPosts = total;

export const getPost = (slug) => enriched.find((p) => p.slug === slug);

export function postPath(postOrSlug) {
  const slug = typeof postOrSlug === "string" ? postOrSlug : postOrSlug?.slug;
  return slug ? `/${slug}/` : "/";
}

// First (English original, Turkish translation) line pair of a post.
export function firstPair(post) {
  if (post.firstPair) return post.firstPair;
  let en = "";
  let tr = "";
  for (const b of post.blocks || []) {
    if (b.original && !en) en = b.lines[0];
    else if (!b.original && en && !tr) { tr = b.lines[0]; break; }
  }
  if (!tr) {
    const t = (post.blocks || []).find((b) => !b.original);
    tr = t ? t.lines[0] : "";
  }
  return { en, tr };
}

export const featured = enriched[0];
// The hero follows the newest published translation.
export const heroPost = enriched[0];
export const recent = enriched.slice(0, 12);

// All Turkish lines of a post, in order (for hero line + teaser).
export function trLines(post) {
  if (post.trLines) return post.trLines;
  const fromBlocks = (post.blocks || []).filter((b) => !b.original).flatMap((b) => b.lines);
  if (fromBlocks.length) return fromBlocks;
  return linesFor(post.slug);
}

// Satır Satır discovery — real Turkish lines, one per artist for variety.
export const discoveryLines = (() => {
  const seen = new Set();
  const out = [];
  for (const p of enriched) {
    if (seen.has(p.artist)) continue;
    const { en, tr } = firstPair(p);
    if (!tr) continue;
    seen.add(p.artist);
    out.push({ tr, en, slug: p.slug, song: p.song, artist: p.artist, cover: p.cover, no: p.no });
    if (out.length >= 7) break;
  }
  return out;
})();

// Artist page helpers.
// Map a real artist name → its meta entry. artists.json holds BOTH artists and
// album pseudo-entries, so matching by name is more reliable than category[0]
// (which sometimes resolves to an album — the known artistSlugFor bug).
const artistByName = new Map(allArtists.map((a) => [a.name.toLowerCase(), a]));
const artistBySlug = new Map(allArtists.map((a) => [a.slug, a]));

// The slug of the post's real performing artist (used for /artist/:slug links).
export function primaryArtistSlug(post) {
  const byName = artistByName.get((post.artist || "").toLowerCase());
  if (byName) return byName.slug;
  for (const cs of post.category_slugs || []) {
    const meta = artistBySlug.get(cs);
    if (meta && meta.name.toLowerCase() === (post.artist || "").toLowerCase()) return cs;
  }
  return post.category_slugs?.[0] || albumSlugFor(post.artist);
}

export function creditedArtistsFor(post) {
  const rawNames = String(post?.artist || "")
    .split(/\s*,\s*/)
    .map((name) => name.trim())
    .filter(Boolean);
  const names = rawNames.length ? rawNames : [post?.artist || ""].filter(Boolean);
  const seen = new Set();
  return names
    .map((name) => {
      const byName = artistByName.get(name.toLowerCase());
      const bySlug = (post?.category_slugs || [])
        .map((slug) => artistBySlug.get(slug))
        .find((meta) => meta?.name.toLowerCase() === name.toLowerCase());
      const slug = byName?.slug || bySlug?.slug || albumSlugFor(name);
      return { name, slug };
    })
    .filter((artist) => {
      if (!artist.name || seen.has(artist.slug)) return false;
      seen.add(artist.slug);
      return true;
    });
}

function hasArtistCredit(post, slug) {
  if (!slug) return false;
  return primaryArtistSlug(post) === slug || (post.category_slugs || []).includes(slug);
}

export function getArtist(slug) {
  const meta = artistBySlug.get(slug);
  const list = enriched.filter((p) => hasArtistCredit(p, slug));
  const name = meta ? meta.name : list[0] ? list[0].artist : slug;
  const albums = albumIndex.filter((a) => a.artistSlug === slug);
  const sortedByDate = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestRelease = [...list].sort(
    (a, b) => new Date(releaseDateOf(b)) - new Date(releaseDateOf(a)),
  )[0];
  const image = meta?.image || list.find((p) => p.spotify?.artist?.image)?.spotify?.artist?.image || list[0]?.cover;
  return {
    name,
    slug,
    image,
    posts: list,
    recent: sortedByDate,
    albums,
    latestRelease,
    spotifyUrl: list.find((p) => p.spotify?.artist?.url)?.spotify?.artist?.url,
    count: list.length,
  };
}

export function artistSlugFor(post) {
  return primaryArtistSlug(post);
}

const STOP = new Set("the a an and or but of to in on at for with i you he she it we they me my your his her our their is am are was were be been being do does did this that these those so no not all up out as if then than from into your".split(" "));

// Recurring-words fingerprint from an artist's real English lyrics (idea #26).
export function artistFingerprint(list, n = 7) {
  const counts = new Map();
  for (const p of list) {
    for (const b of p.blocks || []) {
      if (!b.original) continue;
      for (const line of b.lines) {
        for (let w of line.toLowerCase().split(/[^a-zçğıöşü']+/)) {
          w = w.replace(/^'+|'+$/g, "");
          if (w.length < 3 || STOP.has(w)) continue;
          counts.set(w, (counts.get(w) || 0) + 1);
        }
      }
    }
  }
  return [...counts.entries()]
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

export function relatedTo(post, n = 4) {
  return enriched.filter((p) => p.slug !== post.slug && p.artist === post.artist).slice(0, n);
}

// Global search across both languages (idea: search by line, song, artist).
export function search(qRaw) {
  const q = qRaw.trim().toLowerCase();
  if (!q) return { songs: [], lines: [], artists: [], albums: [], collections: [], topics: [] };
  const songs = [];
  const lines = [];
  for (const p of enriched) {
    if (songs.length < 6 && (p.song.toLowerCase().includes(q) || p.artist.toLowerCase().includes(q))) {
      songs.push(p);
    }
    if (lines.length < 5) {
      for (const line of linesFor(p.slug)) {
        const hit = line.toLowerCase().includes(q) ? line : null;
        if (hit) { lines.push({ line: hit, post: p }); break; }
      }
    }
  }
  const artists = allArtists.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 4);
  const albums = albumIndex.filter((a) => `${a.name} ${a.artist}`.toLowerCase().includes(q)).slice(0, 4);
  const collectionsResult = collections.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 4);
  const topics = [
    ...moodGroups.map((g) => ({ ...g, kind: "mood" })),
    ...genreGroups.map((g) => ({ ...g, kind: "genre" })),
  ].filter((g) => g.name.toLowerCase().includes(q)).slice(0, 5);
  return { songs, lines, artists, albums, collections: collectionsResult, topics };
}

// ---- Discovery shelves (real data) ----
const KPOP = ["stray kids", "lisa", "jennie", "rosé", "rosie", "twice", "bts", "jin", "jimin", "jungkook", "ateez", "g-dragon", "blackpink", "jisoo", "aespa", "katseye", "itzy", "newjeans", "seventeen", "enhypen", "txt", "ive", "rm", "suga", "j-hope", "v", "zerobaseone", "le sserafim", "babymonster"];
const RAP = ["kendrick lamar", "eminem", "doja cat", "nicki minaj", "cardi b", "tyler", "drake", "j. cole", "travis scott", "sza"];
const ROCK = ["metallica", "linkin park", "evanescence", "bring me the horizon", "maneskin", "thirty seconds to mars", "radiohead", "nirvana"];
const RB = ["sza", "the weeknd", "frank ocean", "brent faiyaz", "ariana grande"];
const isKpop = (p) => KPOP.includes(p.artist.toLowerCase());
const includesArtist = (p, list) => list.some((name) => p.artist.toLowerCase().includes(name));

function compactTitle(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function genreFor(post) {
  const spotifyGenres = post.spotify?.artist?.genres || [];
  const joined = spotifyGenres.join(" ").toLowerCase();
  if (isKpop(post) || joined.includes("k-pop")) return "K-pop";
  if (joined.includes("hip hop") || joined.includes("rap") || includesArtist(post, RAP)) return "Hip Hop";
  if (joined.includes("r&b") || joined.includes("soul") || includesArtist(post, RB)) return "R&B";
  if (joined.includes("rock") || joined.includes("metal") || includesArtist(post, ROCK)) return "Rock";
  if (joined.includes("edm") || joined.includes("dance") || joined.includes("electronic")) return "EDM";
  if (joined.includes("indie") || joined.includes("alternative")) return "Indie";
  return "Pop";
}

export function moodFor(post) {
  const text = [
    post.song,
    post.artist,
    post.excerpt,
    post.slug,
    ...trLines(post).slice(0, 8),
  ].join(" ").toLowerCase();
  if (/heart|break|messy|cry|sad|lonely|alone|özlem|ağla|kırık|yara|pişman/.test(text)) return "Sad";
  if (/love|aşk|sevg|kiss|heart|first/.test(text)) return "Love";
  if (/night|gece|moon|dark|shadow|black|midnight/.test(text)) return "Night";
  if (/heal|iyileş|light|hope|dream|wish|peace/.test(text)) return "Healing";
  if (/fire|villain|bad|monster|war|kill|die|danger/.test(text)) return "Dark";
  if (/dance|party|summer|hot|club|rush|energy/.test(text)) return "Party";
  return ["Dreamy", "Lonely", "Motivation"][stableHash(post.slug) % 3];
}

// Real, verifiable metadata only — no invented view counts or scores.
export function metricsFor(post) {
  return {
    readingTime: post.reading_time || Math.max(2, Math.min(9, Math.round(trLines(post).length / 12))),
    publishedDate: post.date,
    updatedDate: post.updatedAt || post.modified || post.date,
  };
}

export function formatNumber(value) {
  return new Intl.NumberFormat("tr-TR", { notation: value > 9999 ? "compact" : "standard" }).format(value);
}

export function releaseYear(post) {
  const d = post.spotify?.album?.releaseDate || post.spotify?.releaseDate || post.date || "";
  // post.date is RFC-2822 ("Fri, 31 Jan 2025 …"), Spotify dates are ISO — parse
  // both rather than slicing, which only works for ISO.
  const parsed = new Date(d);
  if (!isNaN(parsed)) return String(parsed.getFullYear());
  return String(d).slice(0, 4);
}

export function albumNameFor(post) {
  return compactTitle(post.spotify?.album?.name || post.spotify?.albumName || post.categories?.[1] || "Tekli");
}

export function albumSlugFor(name) {
  return String(name || "album").toLowerCase()
    // Turkish letters that don't decompose under NFD (notably dotless \u0131).
    .replace(/\u0131/g, "i").replace(/\u011f/g, "g").replace(/\u00fc/g, "u").replace(/\u015f/g, "s").replace(/\u00f6/g, "o").replace(/\u00e7/g, "c")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const albumShelf = (() => {
  const map = new Map();
  for (const p of enriched) {
    const name = albumNameFor(p);
    if (!name || name === "Tekli") continue;
    const key = `${p.artist}::${name}`;
    const current = map.get(key);
    const item = {
      slug: albumSlugFor(`${p.artist}-${name}`),
      name,
      artist: p.artist,
      cover: p.spotify?.album?.cover || p.spotify?.coverUrl || p.cover,
      releaseDate: p.spotify?.album?.releaseDate || p.spotify?.releaseDate || p.date,
      spotifyUrl: p.spotify?.album?.url || p.spotify?.albumUrl,
      tracks: current ? [...current.tracks, p] : [p],
    };
    map.set(key, current ? { ...current, tracks: item.tracks } : item);
  }
  return [...map.values()]
    .sort((a, b) => b.tracks.length - a.tracks.length || new Date(b.releaseDate) - new Date(a.releaseDate))
    .slice(0, 16);
})();

export const newReleases = enriched.slice(0, 12);
export const kpopShelf = enriched.filter(isKpop).slice(0, 14);
export const popShelf = enriched.filter((p) => genreFor(p) === "Pop").slice(0, 14);
export const rapShelf = enriched.filter((p) => genreFor(p) === "Hip Hop").slice(0, 14);
export const rockShelf = enriched.filter((p) => genreFor(p) === "Rock").slice(0, 14);
export const rbShelf = enriched.filter((p) => genreFor(p) === "R&B").slice(0, 14);

const pickSlug = (frag) => enriched.find((p) => p.slug.includes(frag));
// Melike's picks — real songs, short editorial voice (sample copy).
export const melikePicks = [
  { p: pickSlug("rose-messy"), note: "Türkçesi orijinalinden daha çıplak çıktı — “tangled” yerine “dolanmak” bedeni de işin içine katıyor." },
  { p: pickSlug("jennie-twin"), note: "Bütün şarkı tek bir satırın etrafında dönüyor: bir itiraf değil, bir taslak." },
  { p: pickSlug("the-weeknd-hurry-up-tomorrow"), note: "Bir günah çıkarma. “Günah” kelimesini koymakla koymamak arasında çok düşündüm." },
].filter((x) => x.p);

// "Because you liked X" — a curated reference + neighbours.
export const becauseYouLiked = {
  ref: pickSlug("rose-messy"),
  items: ["jennie-twin", "lisa-rapunzel", "ariana-grande-the-boy-is-mine", "twice-mars", "twice-options", "twice-four"].map(pickSlug).filter(Boolean),
};

// Same feeling — real lines that share a residue.
export const sameFeeling = {
  residue: "özlem",
  items: ["jennie-twin", "jimin-who", "ariana-grande-the-boy-is-mine", "the-weeknd-hurry-up-tomorrow"].map(pickSlug).filter(Boolean),
};

// Translator's notes — sample editorial voice on real songs.
export const translatorNotes = [
  { word: "“sins”", note: "Türkçede “günah” dini bir ağırlık taşıyor; Weeknd’in kastettiği suçluluk daha dünyevi. İkisinin arasında durdum.", p: pickSlug("the-weeknd-hurry-up-tomorrow") },
  { word: "çeviremedim", note: "“Rapunzel gibi hissediyorum” — özgürlük çağrışımı için masalı bilmek gerekiyor.", p: pickSlug("lisa-rapunzel") },
  { word: "soneul jaba", note: "Koreceden doğrudan taşıdım: “tut elimi”. İngilizceye uğramadan, aceleyi koruyarak.", p: pickSlug("twice-mars") },
].filter((x) => x.p);

export const recentlyUpdated = [...enriched]
  .sort((a, b) => new Date(metricsFor(b).updatedDate) - new Date(metricsFor(a).updatedDate))
  .slice(0, 10);

export const songOfTheDay = enriched[new Date().getDate() % enriched.length];
export const lyricsQuote = (() => {
  const p = songOfTheDay;
  const pair = firstPair(p);
  return { post: p, line: pair.tr || pair.en || p.excerpt || p.song, source: pair.en || p.song };
})();

// Recently added — a quieter, dated window (distinct from the New shelf).
export const recentlyAdded = enriched.slice(6, 16);

// Artist collections — real artists with a representative cover + count.
const COLLECTION_ARTISTS = new Set(["the weeknd", "lisa", "jennie", "rosé", "stray kids", "twice", "bts", "ariana grande", "ateez", "g-dragon", "aespa", "blackpink", "jisoo", "katseye"]);
export const artistCollections = allArtists
  .filter((a) => COLLECTION_ARTISTS.has(a.name.toLowerCase()))
  .slice(0, 10)
  .map((a) => {
    const list = enriched.filter((p) => p.category_slugs.includes(a.slug));
    return { slug: a.slug, name: a.name, count: list.length, cover: list[0]?.cover };
  })
  .filter((a) => a.cover);

const collectionDefs = [
  ["Kalp Kırıklığı", (p) => moodFor(p) === "Sad" || /break|heart|messy|lonely/.test(p.slug)],
  ["Gece Yarısı", (p) => moodFor(p) === "Night" || p.artist === "The Weeknd"],
  ["Yağmurlu Gün", (p) => ["Sad", "Dreamy", "Lonely"].includes(moodFor(p))],
  ["İyileşme", (p) => moodFor(p) === "Healing"],
  ["Gym Playlist", (p) => ["Party", "Motivation", "Dark"].includes(moodFor(p))],
  ["Summer Songs", (p) => /summer|hot|party|dance/.test(`${p.slug} ${p.excerpt || ""}`.toLowerCase())],
  ["Sad Girl Playlist", (p) => ["Sad", "Lonely"].includes(moodFor(p)) && ["Pop", "R&B"].includes(genreFor(p))],
  ["Villain Energy", (p) => moodFor(p) === "Dark"],
  ["Taylor Lore", (p) => p.artist.toLowerCase().includes("taylor swift")],
  ["K-pop Essentials", (p) => genreFor(p) === "K-pop"],
  ["Coffee Shop", (p) => ["Dreamy", "Healing", "Love"].includes(moodFor(p))],
  ["Driving", (p) => ["Pop", "Rock", "EDM"].includes(genreFor(p))],
  ["Breakup", (p) => /break|cry|alone|messy|sad/.test(`${p.slug} ${p.excerpt || ""}`.toLowerCase())],
  ["First Love", (p) => moodFor(p) === "Love"],
];

export const collections = collectionDefs.map(([name, test]) => {
  const items = enriched.filter(test).slice(0, 8);
  return {
    name,
    slug: albumSlugFor(name),
    count: items.length,
    items: items.length ? items : enriched.slice(stableHash(name) % 16, stableHash(name) % 16 + 6),
  };
}).filter((c) => c.items.length);

export const moodGroups = ["Love", "Sad", "Happy", "Healing", "Dark", "Motivation", "Party", "Lonely", "Dreamy", "Night"]
  .map((name) => {
    const items = enriched.filter((p) => moodFor(p) === name).slice(0, 8);
    return { name, slug: albumSlugFor(name), items, cover: items[0]?.cover };
  })
  .filter((g) => g.items.length);

export const genreGroups = ["Pop", "Rock", "Hip Hop", "Alternative", "K-pop", "R&B", "EDM", "Indie"]
  .map((name) => {
    const items = enriched.filter((p) => genreFor(p) === name || (name === "Alternative" && ["Rock", "Indie"].includes(genreFor(p)))).slice(0, 8);
    return { name, slug: albumSlugFor(name), items, cover: items[0]?.cover };
  })
  .filter((g) => g.items.length);

export const artistSpotlight = (() => {
  const artist = artistCollections[stableHash(heroPost.slug) % Math.max(1, artistCollections.length)] || artistCollections[0];
  const posts = artist ? enriched.filter((p) => p.category_slugs.includes(artist.slug)).slice(0, 6) : enriched.slice(0, 6);
  return {
    ...artist,
    posts,
    bio: `${artist?.name || posts[0]?.artist} çevirileri içinde en çok okunan parçalar, tekrar eden imgeler ve albüm dönemleri bir arada.`,
  };
})();

// Line-level annotations (Genius-style). Keyed by slug → { word: note }.
// Sample editorial copy for the prototype; real notes will come from a CMS.
export const annotations = {
  "the-weeknd-hurry-up-tomorrow-turkce-ceviri": {
    "Günahlarımın": "“sins” İngilizcede daha dünyevi bir suçluluk; Türkçede “günah” dinî bir ağırlık taşır. İkisinin arasında durdum.",
    "ışığınla": "“light” burada hem ışık hem de kurtuluş. Tek kelimeyle ikisini birden vermek zor; “ışık” bilerek bırakıldı.",
  },
  "stray-kids-divine-turkce-ceviri": {
    "hayaller": "“dreams” çoğul: hem uykudaki düşler hem de gelecek hayalleri. Türkçe “hayaller” ikisini de kapsar.",
  },
  "rose-messy-turkce-ceviri": {
    "dolanmışız": "“tangled as these sheets” — “dolanmak” hem fiziksel sarılmayı hem de duygusal karmaşayı veriyor.",
  },
  "jennie-twin-turkce-ceviri": {
    "mektup": "“writing a letter” — bir konuşma değil, tek taraflı bir itiraf. “mektup” bu mesafeyi koruyor.",
  },
  "lisa-rapunzel-turkce-ceviri": {
    "Rapunzel": "Masaldaki uzun saç = özgürlük ve kendini salıverme. Türk okuru için masalın çağrışımı korundu.",
  },
};

export const annotationsFor = (slug) => annotations[slug] || {};

export function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return "";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

// ===================================================================
// DEDICATED CONTENT-TYPE PAGES — real getters over the existing data.
// Each content type (album, collection, mood, genre, artist) resolves to a
// full object with its own items so its page never has to redirect to a song.
// ===================================================================

export function releaseDateOf(post) {
  return post.spotify?.album?.releaseDate || post.spotify?.releaseDate || post.date;
}

// Total reading minutes across a set of posts.
export function readingMinutes(posts) {
  return posts.reduce((sum, p) => sum + metricsFor(p).readingTime, 0);
}

// Shared sort used by every filterable list (artist / mood / genre pages).
export const SORT_OPTIONS = [
  { value: "newest", label: "En yeni" },
  { value: "oldest", label: "En eski" },
  { value: "alpha", label: "Alfabetik" },
  { value: "album", label: "Albüm" },
  { value: "mood", label: "Mood" },
];

export function sortPosts(posts, sort) {
  const arr = [...posts];
  switch (sort) {
    case "oldest":
      return arr.sort((a, b) => new Date(a.date) - new Date(b.date));
    case "album":
      return arr.sort(
        (a, b) =>
          albumNameFor(a).localeCompare(albumNameFor(b), "tr") ||
          (a.spotify?.track?.trackNumber ?? 0) - (b.spotify?.track?.trackNumber ?? 0),
      );
    case "alpha":
      return arr.sort((a, b) => a.song.localeCompare(b.song, "tr"));
    case "mood":
      return arr.sort((a, b) => moodFor(a).localeCompare(moodFor(b), "tr"));
    case "newest":
    default:
      return arr.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

// ---- Albums (full index, every album with a translated track) ----
export const albumIndex = (() => {
  const map = new Map();
  for (const p of enriched) {
    const name = albumNameFor(p);
    if (!name || name === "Tekli") continue; // singles have no album destination
    const artistSlug = primaryArtistSlug(p);
    const slug = albumSlugFor(`${p.artist}-${name}`);
    const existing = map.get(slug);
    if (existing) {
      existing.tracks.push(p);
      continue;
    }
    map.set(slug, {
      slug,
      name,
      artist: p.artist,
      artistSlug,
      cover: p.spotify?.album?.cover || p.spotify?.coverUrl || p.cover,
      releaseDate: releaseDateOf(p),
      year: releaseYear(p),
      spotifyUrl: p.spotify?.album?.url || p.spotify?.albumUrl,
      albumType: p.spotify?.album?.albumType || p.spotify?.albumType || "album",
      label: p.spotify?.album?.label || p.spotify?.label,
      totalTracks: p.spotify?.album?.totalTracks,
      tracks: [p],
    });
  }
  // Keep each album's tracks in album-track order when we have it, else by date.
  for (const album of map.values()) {
    album.tracks.sort((a, b) => {
      const ta = a.spotify?.track?.trackNumber ?? 999;
      const tb = b.spotify?.track?.trackNumber ?? 999;
      if (ta !== tb) return ta - tb;
      return new Date(releaseDateOf(a)) - new Date(releaseDateOf(b));
    });
  }
  return [...map.values()];
})();

const albumsBySlug = new Map(albumIndex.map((a) => [a.slug, a]));

function albumTypeLabel(type) {
  const t = String(type || "").toLowerCase();
  if (t === "single") return "Tekli";
  if (t === "compilation") return "Derleme";
  if (t === "ep") return "EP";
  return "Albüm";
}

export function albumBlurb(album) {
  if (!album) return "";
  const kind = albumTypeLabel(album.albumType).toLowerCase();
  const when = album.year ? `${album.year} yılında ` : "";
  return `${album.name}, ${album.artist} imzalı bir ${kind}. ${when}yayımlandı. Bu ${kind}ten ${album.tracks.length} şarkının Türkçe çevirisi acupoflyrics arşivinde tek tek işlendi — sözlerin altındaki anlamı, mecazları ve çeviri notlarını birlikte.`;
}

export function getAlbum(slug) {
  const album = albumsBySlug.get(slug);
  if (!album) return null;
  return { ...album, typeLabel: albumTypeLabel(album.albumType), description: albumBlurb(album) };
}

// Albums by the same artist (excluding the current one).
export function artistAlbums(artistSlug, excludeSlug = null) {
  return albumIndex
    .filter((a) => a.artistSlug === artistSlug && a.slug !== excludeSlug)
    .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
}

// Related albums — same artist first, then other albums of the same genre.
export function relatedAlbums(album, n = 6) {
  if (!album) return [];
  const sameArtist = artistAlbums(album.artistSlug, album.slug);
  if (sameArtist.length >= n) return sameArtist.slice(0, n);
  const genre = genreFor(album.tracks[0]);
  const more = albumIndex.filter(
    (a) => a.slug !== album.slug && a.artistSlug !== album.artistSlug && genreFor(a.tracks[0]) === genre,
  );
  return [...sameArtist, ...more].slice(0, n);
}

// More translated songs from this artist (flat list of posts).
export function moreFromArtist(artistSlug, excludeSlugs = [], n = 6) {
  const skip = new Set(excludeSlugs);
  return enriched.filter((p) => hasArtistCredit(p, artistSlug) && !skip.has(p.slug)).slice(0, n);
}

// Latest translations overall (newest first) — for "latest translations" rails.
export function latestTranslations(n = 8, excludeSlugs = []) {
  const skip = new Set(excludeSlugs);
  return enriched.filter((p) => !skip.has(p.slug)).slice(0, n);
}

// Artists who share a genre with this one.
export function relatedArtists(slug, n = 8) {
  const artist = getArtist(slug);
  if (!artist.posts.length) return [];
  const genre = genreFor(artist.posts[0]);
  const seen = new Set([slug]);
  const out = [];
  for (const a of artistCollections) {
    if (out.length >= n) break;
    if (seen.has(a.slug)) continue;
    const sample = enriched.find((p) => primaryArtistSlug(p) === a.slug);
    if (sample && genreFor(sample) === genre) {
      seen.add(a.slug);
      out.push(a);
    }
  }
  // Top up with any other artist collections so the rail never looks empty.
  for (const a of artistCollections) {
    if (out.length >= n) break;
    if (seen.has(a.slug)) continue;
    seen.add(a.slug);
    out.push(a);
  }
  return out;
}

// ---- Editorial copy (Turkish) for the curated content types ----
export const collectionDescriptions = {
  "kalp-kirikligi": "Bittikten sonra çalmaya devam eden şarkılar. Ayrılığın, özlemin ve “keşke”lerin Türkçesi.",
  "gece-yarisi": "Işıklar kapandıktan sonra dinlenen sözler — kuytu, içe dönük ve biraz tedirgin.",
  "yagmurlu-gun": "Cama vuran yağmurun ritmine eşlik eden, melankoliyle barışık çeviriler.",
  "iyilesme": "Kırıldıktan sonra toparlanmanın sözleri. Umuda, ışığa ve yeniden başlamaya dair.",
  "gym-playlist": "Tempoyu yükselten, motivasyon ve “villain energy” taşıyan parçalar.",
  "summer-songs": "Sıcak, ışıltılı ve dans ettiren yaz şarkılarının Türkçesi.",
  "sad-girl-playlist": "Hüznü estetiğe çeviren pop ve R&B parçaları — ağlamak da bir tür bakım.",
  "villain-energy": "Karanlık, iddialı ve özür dilemeyen sözler. Kötü adam koltuğuna otur.",
  "taylor-lore": "Taylor Swift evreninin katman katman açılan anlatısı.",
  "k-pop-essentials": "K-pop dünyasından mutlaka okunması gereken çeviriler.",
  "coffee-shop": "Sabah ışığı ve sıcak fincan hissi taşıyan, yumuşak ve hayalperest sözler.",
  "driving": "Yol, hız ve açık pencere için seçilmiş çeviriler.",
  "breakup": "Ayrılığın tam ortasından gelen sözler — öfke, yas ve serbest bırakış.",
  "first-love": "İlk kez âşık olmanın saf, çekingen ve büyülü Türkçesi.",
};

export const moodDescriptions = {
  Love: "Âşık olmanın her hâli — çekingenliğinden tutkusuna. Sevginin Türkçeye taşınmış sözleri.",
  Sad: "Hüznün dürüst sözleri. Ağlamak isteyince açılan çeviriler.",
  Happy: "Hafifleten, gülümseten, içi açan parçaların Türkçesi.",
  Healing: "İyileşmenin ve kendine dönmenin yumuşak sesi.",
  Dark: "Karanlık, kışkırtıcı ve içi gölgeli sözler.",
  Motivation: "Ayağa kaldıran, “devam et” diyen çeviriler.",
  Party: "Tempolu, ışıltılı ve dans ettiren parçalar.",
  Lonely: "Yalnızlığın sessiz odası — kalabalıkta bile gelen o his.",
  Dreamy: "Hayal ile gerçek arasında salınan, puslu ve yumuşak sözler.",
  Night: "Gecenin sözleri — geç saatlerin, neon ışıkların ve uykusuzluğun.",
};

export const genreDescriptions = {
  Pop: "Akılda kalan melodiler, büyük duygular. Pop’un en sevilen parçalarının çevirisi.",
  Rock: "Gitarın yükseldiği, sözün isyan ettiği yer. Rock çevirileri.",
  "Hip Hop": "Söz oyunlarının, ritmin ve sokağın dili. Hip hop ve rap çevirileri.",
  Alternative: "Ana akımın kıyısında kalan, kendi sesini arayan parçalar.",
  "K-pop": "Korece, İngilizce ve Türkçe arasında köprü kuran K-pop çevirileri.",
  "R&B": "Pürüzsüz, duygusal ve gece dokulu. R&B ve soul çevirileri.",
  EDM: "Kulüp ışıkları ve drop’lar — elektronik dans müziğinin sözleri.",
  Indie: "Bağımsız, samimi ve biraz kırılgan. Indie çevirileri.",
};

// ---- Collection / Mood / Genre getters (full item lists) ----
function decorate(name, slug, items, description) {
  return {
    name,
    slug,
    description,
    items,
    count: items.length,
    cover: items[0]?.cover,
    covers: items.slice(0, 5).map((p) => p.cover),
    readingMinutes: readingMinutes(items),
  };
}

export function getCollection(slug) {
  const def = collectionDefs.find(([name]) => albumSlugFor(name) === slug);
  if (!def) return null;
  const [name, test] = def;
  let items = enriched.filter(test);
  if (!items.length) items = enriched.slice(stableHash(name) % 16, (stableHash(name) % 16) + 8);
  return decorate(name, slug, items, collectionDescriptions[slug] || `${name} için seçilmiş çeviriler.`);
}

export function getMood(slug) {
  const name = ["Love", "Sad", "Happy", "Healing", "Dark", "Motivation", "Party", "Lonely", "Dreamy", "Night"].find(
    (m) => albumSlugFor(m) === slug,
  );
  if (!name) return null;
  const items = enriched.filter((p) => moodFor(p) === name);
  return decorate(name, slug, items, moodDescriptions[name] || `${name} hissi taşıyan çeviriler.`);
}

export function getGenre(slug) {
  const name = ["Pop", "Rock", "Hip Hop", "Alternative", "K-pop", "R&B", "EDM", "Indie"].find(
    (g) => albumSlugFor(g) === slug,
  );
  if (!name) return null;
  const items = enriched.filter(
    (p) => genreFor(p) === name || (name === "Alternative" && ["Rock", "Indie"].includes(genreFor(p))),
  );
  const featuredArtists = (() => {
    const seen = new Map();
    for (const p of items) {
      const s = primaryArtistSlug(p);
      if (!seen.has(s)) seen.set(s, { slug: s, name: p.artist, cover: p.spotify?.artist?.image || p.cover, count: 0 });
      seen.get(s).count += 1;
    }
    return [...seen.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  })();
  const albums = albumIndex.filter((a) => genreFor(a.tracks[0]) === name).slice(0, 8);
  return { ...decorate(name, slug, items, genreDescriptions[name] || `${name} çevirileri.`), featuredArtists, albums };
}

// Full, grouped search for the dedicated /search page (the overlay's search()
// stays capped for speed). Returns songs, artists, albums, collections,
// genres, moods and matched lyric lines — each its own real destination.
export function searchAll(qRaw) {
  const q = (qRaw || "").trim().toLowerCase();
  const empty = { q, total: 0, songs: [], artists: [], albums: [], collections: [], genres: [], moods: [], lines: [] };
  if (!q) return empty;

  const songs = enriched.filter((p) => `${p.song} ${p.artist}`.toLowerCase().includes(q)).slice(0, 36);

  const lines = [];
  for (const p of enriched) {
    if (lines.length >= 12) break;
    for (const line of linesFor(p.slug)) {
      const hit = line.toLowerCase().includes(q) ? line : null;
      if (hit) { lines.push({ line: hit, post: p }); break; }
    }
  }

  const artists = allArtists
    .filter((a) => a.name.toLowerCase().includes(q))
    .map((a) => ({ ...a, image: a.image, cover: a.image }))
    .slice(0, 12);

  const albums = albumIndex.filter((a) => `${a.name} ${a.artist}`.toLowerCase().includes(q)).slice(0, 12);
  const collectionsResult = collections.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  const genres = genreGroups.filter((g) => g.name.toLowerCase().includes(q));
  const moods = moodGroups.filter((m) => m.name.toLowerCase().includes(q));

  const total = songs.length + artists.length + albums.length + collectionsResult.length + genres.length + moods.length + lines.length;
  return { q, total, songs, artists, albums, collections: collectionsResult, genres, moods, lines };
}
