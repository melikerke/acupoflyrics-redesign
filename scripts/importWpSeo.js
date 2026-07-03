import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const XML_PATH = process.argv[2] || "/Users/melike/Downloads/acupoflyrics.WordPress.2026-06-30.xml";
const POST_FILES = ["src/data/posts.json", "data/content/posts.json"];
const SITE = "https://acupoflyrics.com";

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

function xmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function main() {
  const xml = await readFile(XML_PATH, "utf8");
  const wpPosts = new Map();

  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = match[1];
    if (tag(item, "wp:post_type") !== "post" || tag(item, "wp:status") !== "publish") continue;
    const slug = tag(item, "wp:post_name");
    if (!slug) continue;
    wpPosts.set(slug, {
      oldUrl: tag(item, "link") || `${SITE}/${slug}/`,
      title: tag(item, "title"),
      description: meta(item, "rank_math_description"),
      canonical: meta(item, "rank_math_canonical_url") || `${SITE}/${slug}/`,
      youtubeUrl: meta(item, "youtube_linki"),
    });
  }

  let latestPosts = [];
  for (const rel of POST_FILES) {
    const file = path.join(ROOT, rel);
    const posts = JSON.parse(await readFile(file, "utf8"));
    const merged = posts.map((post) => {
      const wp = wpPosts.get(post.slug);
      if (!wp) return post;
      return {
        ...post,
        title: post.title || wp.title,
        oldUrl: wp.oldUrl,
        seo: {
          title: post.title || wp.title,
          description: wp.description || post.seo?.description || post.excerpt || "",
          canonical: wp.canonical,
        },
        youtubeUrl: post.youtubeUrl || wp.youtubeUrl || null,
      };
    });
    latestPosts = merged;
    await writeFile(file, JSON.stringify(merged, null, 2), "utf8");
  }

  const urls = latestPosts.map((post) => {
    const loc = `${SITE}/${post.slug}/`;
    const lastmod = new Date(post.date || Date.now()).toISOString();
    return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
  });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  await writeFile(path.join(ROOT, "public/sitemap.xml"), sitemap, "utf8");

  const redirects = latestPosts
    .map((post) => `/ceviri/${post.slug} /${post.slug}/ 301\n/ceviri/${post.slug}/ /${post.slug}/ 301`)
    .join("\n");
  await writeFile(path.join(ROOT, "public/_redirects"), `${redirects}\n`, "utf8");

  console.log(`Merged SEO for ${latestPosts.filter((p) => p.seo?.description).length} posts.`);
  console.log(`Wrote public/sitemap.xml and public/_redirects for ${latestPosts.length} posts.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
