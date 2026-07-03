import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const posts = JSON.parse(await readFile(path.join(ROOT, "src/data/posts.json"), "utf8"));

function firstPair(post) {
  let en = "";
  let tr = "";
  for (const block of post.blocks || []) {
    if (block.original && !en) en = block.lines?.[0] || "";
    if (!block.original && !tr) tr = block.lines?.[0] || "";
    if (en && tr) break;
  }
  return { en, tr };
}

// Every lyric line (both languages) — shipped as a separate lazy-loaded file
// (/data/search-lines.json) so line search works across whole songs without
// bloating the JS bundle.
function searchLines(post) {
  const lines = [];
  for (const block of post.blocks || []) {
    for (const line of block.lines || []) {
      if (line) lines.push(line);
    }
  }
  return lines;
}

function trLineCount(post) {
  let count = 0;
  for (const block of post.blocks || []) {
    if (block.original) continue;
    count += (block.lines || []).filter(Boolean).length;
  }
  return count;
}

function compactSpotify(spotify = {}) {
  const track = spotify.track || {};
  const artist = spotify.artist || {};
  const album = spotify.album || {};
  return {
    trackUrl: track.url || spotify.trackUrl,
    albumUrl: album.url || spotify.albumUrl,
    artistUrl: artist.url || spotify.artistUrl,
    albumName: album.name || spotify.albumName,
    releaseDate: album.releaseDate || spotify.releaseDate,
    coverUrl: album.cover || spotify.coverUrl,
    duration: track.duration || spotify.duration,
    albumType: album.albumType || spotify.albumType,
    label: album.label || spotify.label,
    track: {
      url: track.url,
      isrc: track.isrc,
      duration: track.duration,
      previewUrl: track.previewUrl,
      trackNumber: track.trackNumber,
    },
    artist: {
      name: artist.name,
      url: artist.url,
      image: artist.image,
    },
    album: {
      name: album.name,
      url: album.url,
      cover: album.cover,
      releaseDate: album.releaseDate,
      albumType: album.albumType,
      label: album.label,
    },
  };
}

const index = posts.map((post) => ({
  id: post.id,
  slug: post.slug,
  title: post.title,
  song: post.song,
  artist: post.artist,
  cover: post.cover,
  date: post.date,
  reading_time: post.reading_time,
  excerpt: post.excerpt,
  categories: post.categories,
  category_slugs: post.category_slugs,
  spotify: compactSpotify(post.spotify),
  // seo/oldUrl intentionally omitted — only the prerender script needs them,
  // and it reads src/data/posts.json directly. Keeps the JS bundle slim.
  youtubeUrl: post.youtubeUrl,
  annotations: post.annotations,
  difficulty_note: post.difficulty_note,
  firstPair: firstPair(post),
}));

// ---- Content validation: a translation site must not ship untranslated posts.
const missingTr = posts.filter((post) => trLineCount(post) === 0);
if (missingTr.length) {
  console.warn(`\n⚠  UYARI: ${missingTr.length} postta hiç Türkçe çeviri satırı yok:`);
  for (const post of missingTr) console.warn(`   - ${post.slug}`);
  if (process.env.STRICT_TR === "1") {
    console.error("\nSTRICT_TR=1 olduğu için build durduruldu. Çevirileri tamamlayın.");
    process.exit(1);
  }
  console.warn("   Bu postlar salt İngilizce yayınlanır. Build'i kesmek için STRICT_TR=1 kullanın.\n");
}

await writeFile(path.join(ROOT, "src/data/postIndex.json"), JSON.stringify(index, null, 2), "utf8");
await mkdir(path.join(ROOT, "public/data"), { recursive: true });
await writeFile(path.join(ROOT, "public/data/posts.json"), JSON.stringify(posts), "utf8");

// Per-song JSON — the detail page fetches only its own song instead of the
// whole 2.5 MB archive.
await mkdir(path.join(ROOT, "public/data/posts"), { recursive: true });
await Promise.all(posts.map((post) =>
  writeFile(path.join(ROOT, `public/data/posts/${post.slug}.json`), JSON.stringify(post), "utf8"),
));

// Lazy line-search data (slug → all lyric lines).
const linesMap = Object.fromEntries(posts.map((post) => [post.slug, searchLines(post)]));
await writeFile(path.join(ROOT, "public/data/search-lines.json"), JSON.stringify(linesMap), "utf8");

console.log(`Generated src/data/postIndex.json for ${index.length} posts.`);
console.log(`Generated ${posts.length} per-song files + search-lines.json.`);
