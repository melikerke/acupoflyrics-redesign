import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { searchTrackBundle } from "../server/spotify.js";
import { slugify, upsertRecordData, writePublishData } from "../server/ingest.js";

const execFileAsync = promisify(execFile);
const INPUT = "/tmp/acupoflyrics-ai-studio-aug10.json";
const REPORT = "/tmp/acupoflyrics-ai-studio-aug10-report.json";
const SITE_URL = "https://www.acupoflyrics.com";

const TRACKS = [
  { label: "ARTMS — Blue Blood", artist: "ARTMS", title: "Blue Blood" },
  { label: "Morgan Wallen — Been By Now", artist: "Morgan Wallen", title: "Been By Now" },
  { label: "Alex Warren — Ordinary", artist: "Alex Warren", title: "Ordinary" },
  {
    label: "KISS OF LIFE — SWEAT",
    artist: "KISS OF LIFE",
    title: "SWEAT",
    // İkinci pre-chorus ilk pre-chorus ile aynı; AI Studio yanıtı tekrarı
    // yeniden yazmak yerine atladığı için aynı çeviri bloğunu tekrar kullan.
    translationMap: [0, 1, 2, 3, 4, 5, 2, 6, 7, 8, 9],
  },
  {
    label: "aespa feat. Ty Dolla Sign — Switchblade",
    artist: "aespa",
    artistDisplay: "aespa feat. Ty Dolla $ign",
    title: "Switchblade",
    youtubeArtist: "aespa Ty Dolla Sign",
  },
  {
    label: "FLO — Side Effects",
    artist: "FLO",
    title: "Side Effects",
    translationMap: [0, 1, 2, 3, 4, 5, 6, 7, 3, 8, 9],
  },
  {
    label: "FLO — Small Doses",
    artist: "FLO",
    title: "Small Doses",
    modelStart: "1. SMALL DOSES (KÜÇÜK DOZLAR) - TAM METİN ÇEVİRİ",
    modelEnd: "2. CRY UGLY (REZİLCE AĞLATMAK) - TAM METİN ÇEVİRİ",
  },
  {
    label: "FLO — Cry Ugly",
    artist: "FLO",
    title: "Cry Ugly",
    modelStart: "2. CRY UGLY (REZİLCE AĞLATMAK) - TAM METİN ÇEVİRİ",
    youtubeUrl: "https://www.youtube.com/watch?v=waAzBC31RHk",
  },
  { label: "FLO — Leak It", artist: "FLO", title: "Leak It" },
  { label: "FLO — Therapy at the Club", artist: "FLO", title: "Therapy at the Club" },
  { label: "FLO — Remedied", artist: "FLO", title: "Remedied" },
  { label: "FLO — Don’t Break Her Heart", artist: "FLO", title: "Don’t Break Her Heart" },
  {
    label: "PICHEOLIN — Party Rock Rock",
    artist: "Picheolin",
    artistDisplay: "PICHEOLIN",
    title: "Party Rock Rock",
    youtubeArtist: "피철인 놀아보세",
  },
  {
    label: "PICHEOLIN — ZZAN",
    artist: "Picheolin",
    artistDisplay: "PICHEOLIN",
    title: "ZZAN",
    youtubeArtist: "피철인 짠",
  },
  {
    label: "PICHEOLIN — Sincerely",
    artist: "Picheolin",
    artistDisplay: "PICHEOLIN",
    title: "Sincerely",
    youtubeArtist: "피철인 정말",
  },
  {
    label: "PICHEOLIN — Mi-cheo Mi-cheo",
    artist: "Picheolin",
    artistDisplay: "PICHEOLIN",
    title: "Mi-cheo Mi-cheo",
    youtubeArtist: "피철인 미쳐 미쳐",
  },
  {
    label: "PICHEOLIN — Love Sick",
    artist: "Picheolin",
    artistDisplay: "PICHEOLIN",
    title: "Love Sick",
    youtubeArtist: "피철인 아프지 않은 이별은 없다",
  },
  { label: "DINO — LIKE IT", artist: "DINO", title: "LIKE IT" },
  {
    label: "DAYOUNG & Jay Park — FLIRTY",
    artist: "DAYOUNG",
    artistDisplay: "DAYOUNG & Jay Park",
    title: "FLIRTY",
    youtubeArtist: "DAYOUNG Jay Park",
    translationMap: [0, 1, 2, 3, 4, 5, 6, 4, 7],
  },
];

const INITIALS = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const VOWELS = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const FINALS = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lp", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "h"];

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const absolute = path.join(process.cwd(), file);
    if (!existsSync(absolute)) continue;
    for (const line of readFileSync(absolute, "utf8").split(/\r?\n/)) {
      const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function stripTurnChrome(value) {
  const lines = String(value || "").replace(/\r/g, "").split("\n");
  while (["edit", "more_vert", ""].includes((lines[0] || "").trim())) lines.shift();
  if (/^(?:User|Model)\s+\d{1,2}:\d{2}\s*[AP]M$/i.test((lines[0] || "").replace(/[\u202f\u00a0]/g, " ").trim())) {
    lines.shift();
  }
  while (!(lines[0] || "").trim()) lines.shift();
  return lines.join("\n").trim();
}

function isMetadataHeading(section) {
  return /(?:가사|lyrics|letra|songtext)/i.test(section) || /["“”].+["“”]/.test(section);
}

function parseStanzas(value) {
  const stanzas = [];
  let current = null;
  const flush = () => {
    if (current?.lines.length) stanzas.push(current);
    current = null;
  };

  for (const rawLine of String(value || "").split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^\[(.+)]$/);
    if (heading) {
      flush();
      if (!isMetadataHeading(heading[1])) current = { section: heading[1].trim(), lines: [] };
      continue;
    }
    if (current && line && !line.startsWith("|||")) current.lines.push(line);
  }
  flush();
  return stanzas;
}

function cropTranslation(model, track) {
  let body = stripTurnChrome(model);
  if (track.modelStart) {
    const start = body.indexOf(track.modelStart);
    if (start < 0) throw new Error(`${track.label}: çeviri başlangıcı bulunamadı.`);
    body = body.slice(start + track.modelStart.length);
  }
  if (track.modelEnd) {
    const end = body.indexOf(track.modelEnd);
    if (end < 0) throw new Error(`${track.label}: çeviri bitişi bulunamadı.`);
    body = body.slice(0, end);
  }
  const stopIndexes = ["\nAnaliz:", "\nÇeviri Notları"]
    .map((marker) => body.indexOf(marker))
    .filter((index) => index >= 0);
  if (stopIndexes.length) body = body.slice(0, Math.min(...stopIndexes));
  const firstHeading = body.search(/^\[[^\n]+]$/m);
  if (firstHeading < 0) throw new Error(`${track.label}: ilk kıta başlığı bulunamadı.`);
  return body.slice(firstHeading).trim();
}

function romanizeHangul(value) {
  let output = "";
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) {
      output += character;
      continue;
    }
    const offset = code - 0xac00;
    const initial = Math.floor(offset / 588);
    const vowel = Math.floor((offset % 588) / 28);
    const final = offset % 28;
    output += `${INITIALS[initial]}${VOWELS[vowel]}${FINALS[final]}`;
  }
  return output;
}

function actualMatchedTerm(candidate, lyrics) {
  const clean = String(candidate || "")
    .replace(/^[¹²³⁴⁵⁶⁷⁸⁹⁰\d.\-*\s]+/, "")
    .replace(/\*/g, "")
    .replace(/^['"“”]+|['"“”]+$/g, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
  if (clean.length < 3 || clean.length > 70) return null;
  const index = lyrics.toLocaleLowerCase("en").indexOf(clean.toLocaleLowerCase("en"));
  return index >= 0 ? lyrics.slice(index, index + clean.length) : null;
}

function inlineAnnotations(translationBody, lyricalText) {
  const notes = new Map();
  for (const rawLine of translationBody.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("|||")) continue;
    const note = line.replace(/^\|\|\|\s*/, "").replace(/\*/g, "").trim();
    const colon = note.indexOf(":");
    if (colon < 1) continue;
    const heading = note.slice(0, colon);
    const candidates = [heading];
    for (const match of heading.matchAll(/["“”']([^"“”']{2,70})["“”']/g)) candidates.push(match[1]);
    for (const match of heading.matchAll(/\(([^)]{2,70})\)/g)) candidates.push(match[1]);
    for (const candidate of [...candidates]) {
      if (/[\uac00-\ud7a3]/.test(candidate)) candidates.push(romanizeHangul(candidate));
    }
    const matched = candidates.map((candidate) => actualMatchedTerm(candidate, lyricalText)).find(Boolean);
    if (matched && !notes.has(matched)) notes.set(matched, note);
  }
  return [...notes.entries()].map(([word, text]) => ({ word, text }));
}

function analysisAnnotations(model, lyricalText) {
  const body = stripTurnChrome(model);
  const markers = ["Analiz:", "Çeviri Notları"];
  const indexes = markers.map((marker) => body.indexOf(marker)).filter((index) => index >= 0);
  if (!indexes.length) return [];
  const tail = body.slice(Math.min(...indexes)).replace(/\n(?:thumb_up|thumb_down|\d+(?:\.\d+)?s)\s*$/g, "");
  const notes = new Map();

  for (const paragraph of tail.split(/\n\s*\n/).slice(1)) {
    const compact = paragraph.replace(/\s+/g, " ").trim();
    if (!compact || /(?:sence|Bir sonrakine)/i.test(compact)) continue;
    const colon = compact.indexOf(":");
    const candidates = [];
    if (colon > 0 && colon < 90) candidates.push(compact.slice(0, colon));
    for (const match of compact.matchAll(/["“”']([^"“”']{3,70})["“”']/g)) candidates.push(match[1]);
    for (const candidate of candidates) {
      const matched = actualMatchedTerm(candidate, lyricalText);
      if (matched && !notes.has(matched)) notes.set(matched, compact);
    }
  }
  return [...notes.entries()].slice(0, 12).map(([word, text]) => ({ word, text }));
}

function parseTrack(source, track) {
  if (!source?.user || !source?.model) throw new Error(`${track.label}: orijinal söz veya çeviri eksik.`);
  const originalBody = stripTurnChrome(source.user);
  const originalStanzas = parseStanzas(originalBody);
  const translatedBody = cropTranslation(source.model, track);
  const translatedStanzas = parseStanzas(translatedBody);
  const translationMap = track.translationMap || originalStanzas.map((_, index) => index);
  if (
    !originalStanzas.length
    || translationMap.length !== originalStanzas.length
    || translationMap.some((index) => !translatedStanzas[index])
  ) {
    throw new Error(`${track.label}: kıta sayıları eşleşmiyor (${originalStanzas.length}/${translatedStanzas.length}).`);
  }

  const hasHangul = /[\uac00-\ud7a3]/.test(originalBody);
  const stanzas = originalStanzas.map((stanza, index) => ({
    section: stanza.section,
    original: stanza.lines.map((line) => (hasHangul ? romanizeHangul(line) : line)),
    translation: translatedStanzas[translationMap[index]].lines,
    notes: [],
  }));
  const lyricalText = stanzas.flatMap((stanza) => [...stanza.original, ...stanza.translation]).join("\n");
  const notes = new Map();
  for (const note of [...inlineAnnotations(translatedBody, lyricalText), ...analysisAnnotations(source.model, lyricalText)]) {
    if (!notes.has(note.word)) notes.set(note.word, note.text);
  }
  stanzas[0].notes = [...notes.entries()].slice(0, 16).map(([word, text]) => ({ word, text }));
  return { ...track, hasHangul, stanzas };
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function youtubeScore(entry, track, durationSeconds) {
  const title = normalize(entry.title);
  const wanted = normalize(track.title);
  const artist = normalize(track.youtubeArtist || track.artist);
  const channel = normalize(entry.channel || entry.uploader);
  let score = 0;
  if (title === wanted) score += 12;
  else if (title.includes(wanted)) score += 8;
  const artistWords = artist.split(" ").filter((word) => word.length > 2);
  const titleAndChannel = `${title} ${channel}`;
  score += Math.min(6, artistWords.filter((word) => titleAndChannel.includes(word)).length * 2);
  const primaryArtist = normalize(track.artist);
  const isArtistChannel = channel === primaryArtist || channel === `${primaryArtist} official`;
  if (isArtistChannel) score += 4;
  if (/(official|music video|official audio|visualizer|topic)/i.test(`${entry.title} ${entry.channel || ""}`)) score += 3;
  if (/(lyrics?|color coded|reaction|cover|sped up|slowed|karaoke|line distribution|demo version|instrumental)/i.test(entry.title || "")) {
    score -= isArtistChannel && /lyric/i.test(entry.title || "") ? 1 : 8;
  }
  const candidateDuration = Number(entry.duration || 0);
  if (durationSeconds && candidateDuration) {
    const difference = Math.abs(durationSeconds - candidateDuration);
    if (difference <= 4) score += 4;
    else if (difference <= 12) score += 2;
    else if (difference > 45) score -= 3;
  }
  return score;
}

async function findYoutube(track, spotifyBundle) {
  if (track.youtubeUrl) {
    return {
      selected: {
        id: track.youtubeUrl.split("v=")[1],
        title: `${track.artist} - ${track.title} (Official Video)`,
        channel: track.artist,
        duration: null,
        score: 99,
        url: track.youtubeUrl,
      },
      candidates: [],
    };
  }
  const query = `${track.youtubeArtist || track.artist} ${track.title} official audio`;
  const { stdout } = await execFileAsync("yt-dlp", [
    "--flat-playlist",
    "--dump-single-json",
    "--no-warnings",
    `ytsearch8:${query}`,
  ], { maxBuffer: 20 * 1024 * 1024, timeout: 90_000 });
  const result = JSON.parse(stdout);
  const durationSeconds = spotifyBundle.track?.durationMs ? Math.round(spotifyBundle.track.durationMs / 1000) : null;
  const candidates = (result.entries || [])
    .filter((entry) => entry?.id && entry?.title)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      channel: entry.channel || entry.uploader || null,
      duration: entry.duration || null,
      score: youtubeScore(entry, track, durationSeconds),
      url: `https://www.youtube.com/watch?v=${entry.id}`,
    }))
    .sort((a, b) => b.score - a.score);
  if (!candidates.length || candidates[0].score < 8) {
    throw new Error(`${track.label}: güvenilir YouTube eşleşmesi bulunamadı.`);
  }
  return { selected: candidates[0], candidates: candidates.slice(0, 4) };
}

function descriptionFor(track, bundle) {
  const artist = track.artistDisplay || track.artist;
  const romanized = track.hasHangul ? ", romanize okunuşu" : "";
  const album = bundle.album?.name && bundle.album.name !== track.title ? ` ${bundle.album.name} albümündeki parçanın` : " Parçanın";
  const detailed = `${artist} – ${track.title} şarkı sözleri${romanized} ve özenli Türkçe çevirisi.${album} anlamını ve açıklamalarını keşfet.`;
  if (detailed.length <= 160) return detailed;
  return `${artist} – ${track.title} şarkı sözleri${romanized} ve Türkçe çevirisi. Parçanın anlamını keşfet.`;
}

async function main() {
  loadEnv();
  const write = process.argv.includes("--write");
  const parseOnly = process.argv.includes("--parse-only");
  const extracted = JSON.parse(await readFile(INPUT, "utf8"));
  const byLabel = new Map(extracted.items.map((item) => [item.label, item]));
  const parsed = TRACKS.map((track) => parseTrack(byLabel.get(track.label), track));

  console.table(parsed.map((track) => ({
    artist: track.artistDisplay || track.artist,
    song: track.title,
    stanzas: track.stanzas.length,
    lines: track.stanzas.reduce((sum, stanza) => sum + stanza.original.length, 0),
    notes: track.stanzas[0].notes.length,
    romanized: track.hasHangul,
  })));
  if (parseOnly) return;

  const credentials = {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  };
  const enriched = [];
  for (const track of parsed) {
    const spotify = await searchTrackBundle({ artist: track.artist, title: track.title }, credentials);
    if (!spotify.matched) {
      const candidates = spotify.candidates?.map((candidate) => `${candidate.artist} — ${candidate.name}`).join(" | ");
      throw new Error(`${track.label}: Spotify eşleşmedi. ${candidates || "Aday yok."}`);
    }
    console.log(`Spotify ✓ ${track.label}: ${spotify.bundle.track.name} — ${spotify.bundle.album.name}`);
    enriched.push({ ...track, spotify: spotify.bundle, spotifyScore: spotify.score });
  }

  let youtubeCursor = 0;
  async function youtubeWorker() {
    while (youtubeCursor < enriched.length) {
      const index = youtubeCursor++;
      const track = enriched[index];
      track.youtube = await findYoutube(track, track.spotify);
      console.log(`YouTube ✓ ${track.label}: ${track.youtube.selected.title} [${track.youtube.selected.score}]`);
    }
  }
  await Promise.all(Array.from({ length: 3 }, () => youtubeWorker()));

  const report = enriched.map((track) => ({
    label: track.label,
    spotify: {
      score: track.spotifyScore,
      title: track.spotify.track.name,
      artist: track.spotify.artists.map((artist) => artist.name).join(", "),
      album: track.spotify.album.name,
      url: track.spotify.track.url,
    },
    youtube: track.youtube,
    stanzaCount: track.stanzas.length,
    romanized: track.hasHangul,
  }));
  await writeFile(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Eşleşme raporu: ${REPORT}`);
  if (!write) {
    console.log("Veri dosyaları değiştirilmedi. Yazmak için --write kullanın.");
    return;
  }

  let posts = JSON.parse(await readFile(path.join(process.cwd(), "src/data/posts.json"), "utf8"));
  let artists = JSON.parse(await readFile(path.join(process.cwd(), "src/data/artists.json"), "utf8"));
  const results = [];
  for (const track of enriched) {
    const record = {
      song: track.title,
      artist: track.artistDisplay || track.artist,
      spotify: track.spotify,
      stanzas: track.stanzas,
      youtubeUrl: track.youtube.selected.url,
      savedAt: new Date().toISOString(),
      source: "ai-studio-spotify-youtube",
    };
    const updated = upsertRecordData(record, posts, artists);
    posts = updated.posts;
    artists = updated.artists;
    const post = posts.find((item) => item.slug === updated.result.slug);
    post.source = "ai-studio-spotify-youtube";
    post.seo = {
      title: post.title,
      description: descriptionFor(track, track.spotify),
      canonical: `${SITE_URL}/${post.slug}/`,
    };
    results.push(updated.result);
  }
  await writePublishData({ posts, artists });
  console.table(results.map((result) => ({ title: result.title, slug: result.slug, updated: result.updated })));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
