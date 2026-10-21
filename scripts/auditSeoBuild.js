import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { songLyricsTitleSlugs } from '../src/data/songEditorialSeo.js';
import { translationMetaTitle, isLegacyLyricDescription } from '../src/lib/meta.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = process.env.ACL_SEO_DIST ? path.resolve(process.env.ACL_SEO_DIST) : path.join(ROOT, "dist");
const SITE = "https://www.acupoflyrics.com";
const posts = JSON.parse(await readFile(path.join(ROOT, "src/data/posts.json"), "utf8"));

async function indexFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await indexFiles(target));
    else if (entry.name === "index.html") output.push(target);
  }
  return output;
}

function normalizePath(value) {
  try {
    const url = new URL(value, SITE);
    if (url.origin !== SITE) return null;
    return (url.pathname.replace(/\/+$/, "") || "/").toLowerCase();
  } catch {
    return null;
  }
}

function routePath(file) {
  const relative = path.relative(DIST, path.dirname(file)).split(path.sep).join("/");
  return relative ? `/${relative}` : "/";
}

function firstMatch(html, pattern) {
  return html.match(pattern)?.[1]?.trim() || "";
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const pages = new Map();
for (const file of await indexFiles(DIST)) {
  const html = await readFile(file, "utf8");
  const route = normalizePath(routePath(file));
  const title = decodeHtml(firstMatch(html, /<title>([\s\S]*?)<\/title>/i));
  const description = decodeHtml(firstMatch(html, /<meta\s+name="description"\s+content="([^"]*)"/i));
  const ogTitle = decodeHtml(firstMatch(html, /<meta\s+property="og:title"\s+content="([^"]*)"/i));
  const twitterTitle = decodeHtml(firstMatch(html, /<meta\s+name="twitter:title"\s+content="([^"]*)"/i));
  const ogDescription = decodeHtml(firstMatch(html, /<meta\s+property="og:description"\s+content="([^"]*)"/i));
  const twitterDescription = decodeHtml(firstMatch(html, /<meta\s+name="twitter:description"\s+content="([^"]*)"/i));
  const noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  const links = new Set();
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi)) {
    const linked = normalizePath(match[1]);
    if (linked) links.add(linked);
  }
  const badImages = [...html.matchAll(/<img\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => !/\baria-hidden(?:="true"|\s|>)/i.test(tag))
    .filter((tag) => !/\balt="[^"]+"/i.test(tag));
  pages.set(route, { route, file, title, description, ogTitle, twitterTitle, ogDescription, twitterDescription, noindex, links, badImages });
}

const incoming = new Map([...pages.keys()].map((route) => [route, new Set()]));
const brokenLinks = [];
for (const page of pages.values()) {
  for (const linked of page.links) {
    if (!pages.has(linked)) {
      brokenLinks.push(`${page.route} -> ${linked}`);
      continue;
    }
    incoming.get(linked).add(page.route);
  }
}

let sitemap = await readFile(path.join(DIST, "sitemap.xml"), "utf8");
if (sitemap.includes('<sitemapindex')) {
  const children = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => path.basename(new URL(m[1]).pathname));
  sitemap = (await Promise.all(children.map(file => readFile(path.join(DIST, file), 'utf8')))).join('\n');
}
const indexable = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => normalizePath(match[1])).filter(Boolean));
const orphanRoutes = [...indexable].filter((route) => route !== "/" && (incoming.get(route)?.size || 0) === 0);

const reachable = new Set(["/"]);
const queue = ["/"];
while (queue.length) {
  const current = queue.shift();
  for (const linked of pages.get(current)?.links || []) {
    if (!pages.has(linked) || reachable.has(linked)) continue;
    reachable.add(linked);
    queue.push(linked);
  }
}
const unreachableRoutes = [...indexable].filter((route) => !reachable.has(route));

const songRoutes = new Set(posts.map((post) => normalizePath(`/${post.slug}/`)));
const underlinkedSongs = [...songRoutes].filter((route) => (incoming.get(route)?.size || 0) < 2);
const placeholderPages = [...pages.values()].filter((page) => /%%?[^%\s]+%%?/.test(`${page.title} ${page.description}`));
const missingAltPages = [...pages.values()].filter((page) => page.badImages.length > 0);
// A description has no minimum character quota; short complete sentences are valid.
const missingDescriptions = [...pages.values()].filter((page) => !page.noindex && !page.description);
const longDescriptions = [...pages.values()].filter((page) => !page.noindex && page.description.length > 152);
const longTitlePages = [...pages.values()].filter((page) => !page.noindex && page.title.length > 65);
// Explicit, reported editorial exceptions: retain all artist credits plus "Sözleri".
const creditedTitleExceptions = longTitlePages.filter(page => {
  const post = posts.find(post => `/${post.slug}` === page.route);
  return post && songLyricsTitleSlugs.has(post.slug) && page.title === translationMetaTitle(post) && page.title.length <= 85;
});
const longTitles = longTitlePages.filter(page => !creditedTitleExceptions.includes(page));
if (creditedTitleExceptions.length) console.warn('Tam kredi / Sözleri başlık uzunluğu uyarıları:', creditedTitleExceptions.map(page => `${page.route} (${page.title.length})`).join(', '));
const legacyDescriptions = [...pages.values()].filter(page => !page.noindex && isLegacyLyricDescription(page.description));
const metadataMismatches = [...pages.values()].filter((page) => (
  page.title !== page.ogTitle
  || page.title !== page.twitterTitle
  || page.description !== page.ogDescription
  || page.description !== page.twitterDescription
));

const findings = {
  htmlPages: pages.size,
  indexablePages: indexable.size,
  orphanRoutes: orphanRoutes.length,
  unreachableRoutes: unreachableRoutes.length,
  underlinkedSongs: underlinkedSongs.length,
  brokenInternalLinks: brokenLinks.length,
  placeholderPages: placeholderPages.length,
  missingMeaningfulAltPages: missingAltPages.length,
  missingDescriptions: missingDescriptions.length,
  longDescriptions: longDescriptions.length,
  longTitles: longTitles.length,
  legacyLyricDescriptions: legacyDescriptions.length,
  metadataMismatches: metadataMismatches.length,
};

console.table(findings);
const details = [
  ["Orphan", orphanRoutes],
  ["Ulaşılamayan", unreachableRoutes],
  ["İki linkten az alan şarkı", underlinkedSongs],
  ["Bozuk iç link", brokenLinks],
  ["Placeholder", placeholderPages.map((page) => page.route)],
  ["Anlamlı alt metni eksik", missingAltPages.map((page) => page.route)],
  ["Eksik açıklama", missingDescriptions.map((page) => page.route)],
  ["Uzun açıklama", longDescriptions.map((page) => `${page.route} (${page.description.length})`)],
  ["Uzun başlık", longTitles.map((page) => `${page.route} (${page.title.length})`)],
  ["Sözlerden kesilmiş eski açıklama", legacyDescriptions.map(page => page.route)],
  ["Metadata uyuşmazlığı", metadataMismatches.map((page) => page.route)],
];
for (const [label, items] of details) {
  if (!items.length) continue;
  console.error(`\n${label} (${items.length}):`);
  console.error(items.slice(0, 20).join("\n"));
  if (items.length > 20) console.error(`… ve ${items.length - 20} kayıt daha`);
}

if (Object.entries(findings).some(([key, value]) => key !== "htmlPages" && key !== "indexablePages" && value > 0)) {
  process.exitCode = 1;
}
