import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { moodsForPost } from "../src/lib/moodClassifier.js";
import { languagesFor } from "../src/lib/languages.js";
import { popGundemiArticles } from "../src/data/popGundemi.js";
import { buildArtistIndex, buildArticleIndex, buildArticleSearchIndex, firstPair, heroPair, compactSpotify } from "./lib/contentIndexes.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const posts = JSON.parse(await readFile(path.join(ROOT, "src/data/posts.json"), "utf8"));
const artists = JSON.parse(await readFile(path.join(ROOT, "src/data/artists.json"), "utf8"));
const OUTPUT = process.env.ACL_CONTENT_OUTPUT ? path.resolve(process.env.ACL_CONTENT_OUTPUT) : ROOT;
await mkdir(path.join(OUTPUT, "src/data"), { recursive: true });
await writeFile(path.join(OUTPUT, "src/data/artistIndex.json"), JSON.stringify(buildArtistIndex(artists, posts), null, 2), "utf8");
await writeFile(path.join(OUTPUT, "src/data/popGundemiIndex.json"), JSON.stringify(buildArticleIndex(popGundemiArticles), null, 2), "utf8");
if (process.argv.includes("--auxiliary-only")) {
  console.log("Generated compact artist and article indexes; source content untouched.");
  process.exit(0);
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

function translationLineCount(post) {
  let count = 0;
  for (const block of post.blocks || []) {
    if (block.original) continue;
    count += (block.lines || []).filter(Boolean).length;
  }
  return count;
}


const index = posts.map((post) => ({
  id: post.id,
  slug: post.slug,
  title: post.title,
  song: post.song,
  artist: post.artist,
  cover: post.cover,
  date: post.date,
  updatedAt: post.updatedAt || post.modified,
  reading_time: post.reading_time,
  excerpt: post.excerpt,
  categories: post.categories,
  category_slugs: post.category_slugs,
  ...(post.languages ? { languages: languagesFor(post) } : {}),
  spotify: compactSpotify(post.spotify),
  // seo/oldUrl intentionally omitted — only the prerender script needs them,
  // and it reads src/data/posts.json directly. Keeps the JS bundle slim.
  // Video, annotations and translator notes live in the per-song JSON. They
  // are not needed to build archive cards and would otherwise ship on every
  // route for all 500+ songs.
  moods: moodsForPost(post),
  firstPair: firstPair(post),
  heroPair: heroPair(post),
}));

// ---- Content validation: a translation site must not ship untranslated posts.
const missingTranslations = posts.filter((post) => translationLineCount(post) === 0);
if (missingTranslations.length) {
  console.warn(`\n⚠  UYARI: ${missingTranslations.length} postta hiç çeviri satırı yok:`);
  for (const post of missingTranslations) console.warn(`   - ${post.slug}`);
  if (process.env.STRICT_TRANSLATIONS === "1" || process.env.STRICT_TR === "1") {
    console.error("\nKatı çeviri denetimi açık olduğu için build durduruldu. Çevirileri tamamlayın.");
    process.exit(1);
  }
  console.warn("   Bu postlar yalnızca orijinal sözlerle yayınlanır. Build'i kesmek için STRICT_TRANSLATIONS=1 kullanın.\n");
}

await writeFile(path.join(OUTPUT, "src/data/postIndex.json"), JSON.stringify(index, null, 2), "utf8");
await mkdir(path.join(OUTPUT, "public/data"), { recursive: true });
await writeFile(path.join(OUTPUT, "public/data/posts.json"), JSON.stringify(posts), "utf8");

// Per-song JSON — the detail page fetches only its own song instead of the
// whole 2.5 MB archive.
const perSongDirectory = path.join(OUTPUT, "public/data/posts");
await mkdir(perSongDirectory, { recursive: true });
const expectedPerSongFiles = new Set(posts.map((post) => `${post.slug}.json`));
const stalePerSongFiles = (await readdir(perSongDirectory))
  .filter((file) => file.endsWith(".json") && !expectedPerSongFiles.has(file));
await Promise.all(stalePerSongFiles.map((file) => unlink(path.join(perSongDirectory, file))));
await Promise.all(posts.map((post) =>
  writeFile(path.join(OUTPUT, `public/data/posts/${post.slug}.json`), JSON.stringify(post), "utf8"),
));

// Lazy line-search data (slug → all lyric lines).
const linesMap = { ...Object.fromEntries(posts.map((post) => [post.slug, searchLines(post)])), __articles: buildArticleSearchIndex(popGundemiArticles) };
await writeFile(path.join(OUTPUT, "public/data/search-lines.json"), JSON.stringify(linesMap), "utf8");

console.log(`Generated src/data/postIndex.json for ${index.length} posts.`);
console.log(`Generated ${posts.length} per-song files + search-lines.json.`);
if (stalePerSongFiles.length) console.log(`Removed ${stalePerSongFiles.length} stale per-song JSON file(s).`);
