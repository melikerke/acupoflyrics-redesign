import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "../server/ingest.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const XML_PATH = path.join(ROOT, "data/raw/acupoflyrics-export.xml");
const FILES = {
  posts: ["src/data/posts.json", "data/content/posts.json"],
  artists: ["src/data/artists.json", "data/content/artists.json"],
};

function plain(tag, blob) {
  const match = blob.match(new RegExp(`<${tag}>(.*?)</${tag}>`, "s"));
  return match ? decode(match[1].trim()) : "";
}

function cdata(tag, blob) {
  const match = blob.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`, "s"));
  return match ? match[1] : "";
}

function decode(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”");
}

function meta(key, blob) {
  const pattern = new RegExp(
    `<wp:postmeta>.*?<wp:meta_key><!\\[CDATA\\[${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\]></wp:meta_key>\\s*<wp:meta_value>(.*?)</wp:meta_value>.*?</wp:postmeta>`,
    "s",
  );
  const match = blob.match(pattern);
  if (!match) return "";
  const raw = match[1].trim();
  const cdataMatch = raw.match(/^<!\[CDATA\[(.*?)\]\]>$/s);
  return decode((cdataMatch ? cdataMatch[1] : raw).trim());
}

function itemBlocks(xml) {
  return xml.match(/<item>.*?<\/item>/gs) || [];
}

function stripTurkishSuffix(title) {
  return String(title || "").replace(/\s*T[üu]rk[çc]e\s+[ÇC]eviri\s*$/i, "").trim();
}

function splitCreditNames(value = "") {
  return String(value)
    .split(/\s*,\s*/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function splitStanzas(text = "") {
  return String(text)
    .replace(/\r\n/g, "\n")
    .split(/\n\s*===\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map(parseStanza);
}

function parseNote(line) {
  const raw = line.replace(/^\s*\|\|\|\s*/, "").trim();
  const colon = raw.indexOf(":");
  if (colon < 0) return { word: "", text: raw };
  return {
    word: raw.slice(0, colon).trim().replace(/^["“”']+|["“”']+$/g, ""),
    text: raw.slice(colon + 1).trim(),
  };
}

function parseStanza(chunk) {
  const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
  const heading = lines[0]?.match(/^\[(.+?)\]$/);
  const body = heading ? lines.slice(1) : lines;
  const notes = [];
  const lyricLines = [];

  for (const line of body) {
    if (line.startsWith("|||")) {
      const note = parseNote(line);
      if (note.text) notes.push(note);
    } else {
      lyricLines.push(line);
    }
  }

  return {
    label: heading?.[1] || "",
    lines: lyricLines,
    notes,
  };
}

function buildBlocks(originalText, translationText) {
  const originals = splitStanzas(originalText);
  const translations = splitStanzas(translationText);
  const blocks = [];
  const annotations = {};
  const total = Math.max(originals.length, translations.length);

  for (let index = 0; index < total; index += 1) {
    const original = originals[index] || { label: translations[index]?.label || "", lines: [], notes: [] };
    const translation = translations[index] || { label: original.label, lines: [], notes: [] };
    const label = translation.label || original.label || "";

    if (original.lines.length) {
      blocks.push({ original: true, label, lines: original.lines });
    }
    if (translation.lines.length) {
      blocks.push({ original: false, label, lines: translation.lines });
    }

    for (const note of [...original.notes, ...translation.notes]) {
      if (note.word && note.text) annotations[note.word] = note.text;
    }
  }

  return { blocks, annotations };
}

function readingTime(blocks) {
  const words = blocks
    .flatMap((block) => block.lines || [])
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function firstOriginalLine(blocks) {
  return blocks.find((block) => block.original)?.lines?.find(Boolean) || "";
}

function rankMathTitle(title, artist, song) {
  const fromMeta = stripTurkishSuffix(title);
  if (artist && song) return `${artist} ${song} Türkçe Çeviri`;
  return `${fromMeta} Türkçe Çeviri`.replace(/\s+/g, " ").trim();
}

function postFromItem(item, existingPosts) {
  const originalText = meta("orijinal_sozler", item);
  const translationText = meta("turkce_ceviri", item);
  if (!originalText || !translationText) return null;

  const title = decode(cdata("title", item) || plain("title", item));
  const oldSlug = cdata("wp:post_name", item);
  const oldUrl = plain("link", item);
  const artist = meta("sanatci_adi", item).trim();
  const album = meta("album_adi", item).trim();
  const youtubeUrl = meta("youtube_linki", item).trim() || null;
  const postId = plain("wp:post_id", item);
  const date = cdata("wp:post_date", item) || plain("pubDate", item);
  const seoDescription = meta("rank_math_description", item);

  let song = stripTurkishSuffix(title);
  if (artist && song.toLocaleLowerCase("tr-TR").startsWith(artist.toLocaleLowerCase("tr-TR"))) {
    song = song.slice(artist.length).trim().replace(/^[-–—]\s*/, "");
  }
  if (!song) song = title;

  const slug = slugify(`${artist} ${song} turkce ceviri`);
  if (!slug || existingPosts.some((post) => post.slug === slug)) return null;

  const { blocks, annotations } = buildBlocks(originalText, translationText);
  if (!blocks.some((block) => !block.original && block.lines?.length)) return null;

  const artistNames = splitCreditNames(artist || "Unknown");
  const categories = [artist || "Unknown", album].filter(Boolean);
  const categorySlugs = [slugify(artist || "unknown"), album ? slugify(album) : null].filter(Boolean);

  return {
    id: postId,
    title: rankMathTitle(title, artist, song),
    song,
    slug,
    date,
    artist: artist || "Unknown",
    artists: artistNames.map((name) => ({ name, slug: slugify(name) })),
    categories,
    category_slugs: categorySlugs,
    image: null,
    cover: null,
    reading_time: readingTime(blocks),
    blocks,
    excerpt: firstOriginalLine(blocks),
    annotations,
    difficulty_note: null,
    youtubeUrl,
    oldSlug,
    oldUrl,
    seo: {
      title: `${artist ? `${artist} - ` : ""}${song} Türkçe Çeviri | Şarkı Sözleri ve Anlamı`,
      description: seoDescription,
      canonical: `https://www.acupoflyrics.com/${slug}/`,
    },
    spotify: {
      albumName: album || null,
      releaseDate: date ? String(date).slice(0, 10) : null,
      coverUrl: null,
    },
    source: "wordpress-acf",
  };
}

async function readJson(rel) {
  return JSON.parse(await readFile(path.join(ROOT, rel), "utf8"));
}

async function writeJson(rel, data) {
  await mkdir(path.dirname(path.join(ROOT, rel)), { recursive: true });
  await writeFile(path.join(ROOT, rel), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function upsertArtists(artists, postsToAdd) {
  const next = [...artists];
  for (const post of postsToAdd) {
    for (const credit of post.artists || [{ name: post.artist, slug: slugify(post.artist) }]) {
      const index = next.findIndex((artist) => artist.slug === credit.slug);
      if (index >= 0) {
        next[index] = { ...next[index], count: (next[index].count || 0) + 1 };
      } else {
        next.push({ slug: credit.slug, name: credit.name, count: 1, image: null });
      }
    }
  }
  return next.sort((a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name));
}

const xml = await readFile(XML_PATH, "utf8");
const posts = await readJson(FILES.posts[0]);
const artists = await readJson(FILES.artists[0]);

const additions = itemBlocks(xml)
  .filter((item) => item.includes("<![CDATA[post]]></wp:post_type>"))
  .filter((item) => item.includes("<![CDATA[publish]]></wp:status>"))
  .map((item) => postFromItem(item, posts))
  .filter(Boolean);

if (!additions.length) {
  console.log("No missing WordPress ACF posts to import.");
  process.exit(0);
}

const nextPosts = [...additions, ...posts].sort((a, b) => {
  const aId = Number.parseInt(a.id, 10) || 0;
  const bId = Number.parseInt(b.id, 10) || 0;
  return bId - aId;
});
const nextArtists = upsertArtists(artists, additions);

for (const rel of FILES.posts) await writeJson(rel, nextPosts);
for (const rel of FILES.artists) await writeJson(rel, nextArtists);

console.log(`Imported ${additions.length} missing WordPress ACF posts:`);
for (const post of additions) {
  console.log(`- /${post.oldSlug}/ -> /${post.slug}/`);
}
