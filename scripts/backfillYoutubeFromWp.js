import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const XML_PATH = process.argv[2] || "/Users/melike/Downloads/acupoflyrics.WordPress.2026-07-02.xml";
const POST_FILES = ["src/data/posts.json", "data/content/posts.json"];

function decode(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;|&#038;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

function tag(blob, name) {
  const match = blob.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`));
  return decode(match?.[1] || "");
}

function meta(blob, key) {
  const re =
    /<wp:postmeta>[\s\S]*?<wp:meta_key><!\[CDATA\[([^\]]+)\]\]><\/wp:meta_key>[\s\S]*?<wp:meta_value>([\s\S]*?)<\/wp:meta_value>[\s\S]*?<\/wp:postmeta>/g;
  for (const match of blob.matchAll(re)) {
    if (match[1] === key) return decode(match[2] || "");
  }
  return "";
}

function normalise(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;|&#038;|&/g, " and ")
    .replace(/turkce ceviri|türkçe çeviri/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const xml = await readFile(XML_PATH, "utf8");
const youtubeBySlug = new Map();
const youtubeByTitle = new Map();
const youtubeBySong = new Map();

for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
  const item = match[1];
  if (tag(item, "wp:post_type") !== "post" || tag(item, "wp:status") !== "publish") continue;
  const slug = tag(item, "wp:post_name");
  const title = tag(item, "title");
  const youtubeUrl = meta(item, "youtube_linki");
  if (!youtubeUrl) continue;
  if (slug) youtubeBySlug.set(slug, youtubeUrl);
  if (title) {
    youtubeByTitle.set(normalise(title), youtubeUrl);
    youtubeBySong.set(normalise(title.replace(/türkçe çeviri|turkce ceviri/gi, "")), youtubeUrl);
  }
}

for (const rel of POST_FILES) {
  const file = path.join(ROOT, rel);
  const posts = JSON.parse(await readFile(file, "utf8"));
  let changed = 0;
  const merged = posts.map((post) => {
    const candidates = [
      post.slug,
      post.title,
      `${post.artist || ""} ${post.song || ""}`,
      post.song,
    ].map(normalise).filter(Boolean);
    const youtubeUrl =
      youtubeBySlug.get(post.slug) ||
      candidates.map((key) => youtubeByTitle.get(key) || youtubeBySong.get(key)).find(Boolean);
    if (!youtubeUrl || post.youtubeUrl === youtubeUrl) return post;
    changed += 1;
    return { ...post, youtubeUrl };
  });
  await writeFile(file, JSON.stringify(merged, null, 2), "utf8");
  console.log(`${rel}: ${changed} YouTube linki güncellendi.`);
}

console.log(`WordPress XML içinde ${youtubeBySlug.size} yayınlanmış post için YouTube linki bulundu.`);
