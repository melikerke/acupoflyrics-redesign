import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SITE = "https://acupoflyrics.com";

const posts = JSON.parse(await readFile(path.join(ROOT, "src/data/posts.json"), "utf8"));
const artistsRaw = JSON.parse(await readFile(path.join(ROOT, "src/data/artists.json"), "utf8"));
const template = await readFile(path.join(DIST, "index.html"), "utf8");

const collectionNames = [
  "Kalp Kırıklığı",
  "Gece Yarısı",
  "Yağmurlu Gün",
  "İyileşme",
  "Gym Playlist",
  "Summer Songs",
  "Sad Girl Playlist",
  "Villain Energy",
  "Taylor Lore",
  "K-pop Essentials",
  "Coffee Shop",
  "Driving",
  "Breakup",
  "First Love",
];
const moodNames = ["Love", "Sad", "Happy", "Healing", "Dark", "Motivation", "Party", "Lonely", "Dreamy", "Night"];
const genreNames = ["Pop", "Rock", "Hip Hop", "Alternative", "K-pop", "R&B", "EDM", "Indie"];

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value = "") {
  return String(value).toLowerCase()
    .replace(/\u0131/g, "i").replace(/\u011f/g, "g").replace(/\u00fc/g, "u")
    .replace(/\u015f/g, "s").replace(/\u00f6/g, "o").replace(/\u00e7/g, "c")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function postPath(postOrSlug) {
  const slug = typeof postOrSlug === "string" ? postOrSlug : postOrSlug?.slug;
  return slug ? `/${slug}/` : "/";
}

function albumNameFor(post) {
  return String(post.spotify?.album?.name || post.spotify?.albumName || post.categories?.[1] || "Tekli").trim();
}

function primaryArtistSlug(post) {
  const exact = artistsRaw.find((a) => a.name.toLowerCase() === String(post.artist || "").toLowerCase());
  return exact?.slug || post.category_slugs?.[0] || slugify(post.artist);
}

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

function routeFile(pathname) {
  if (pathname === "/") return path.join(DIST, "index.html");
  return path.join(DIST, pathname.replace(/^\/+|\/+$/g, ""), "index.html");
}

function cleanHead(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s*<meta\s+name="description"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+(?:name|property)="(?:og:[^"]+|twitter:[^"]+)"[\s\S]*?>/gi, "")
    .replace(/\s*<link\s+rel="canonical"[\s\S]*?>/gi, "")
    .replace(/\s*<script\s+type="application\/ld\+json"[\s\S]*?<\/script>/gi, "");
}

function htmlFor(route) {
  const canonical = `${SITE}${route.path}`;
  const json = route.jsonLd || {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: route.title,
    description: route.description,
    url: canonical,
  };
  const tags = `
    <title>${escapeHtml(route.title)}</title>
    <meta name="description" content="${escapeHtml(route.description)}" />
    ${route.noindex ? '<meta name="robots" content="noindex, nofollow" />' : ""}
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:title" content="${escapeHtml(route.title)}" />
    <meta property="og:description" content="${escapeHtml(route.description)}" />
    <meta property="og:type" content="${escapeHtml(route.type || "website")}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    ${route.image ? `<meta property="og:image" content="${escapeHtml(route.image)}" />` : ""}
    <meta name="twitter:card" content="${route.image ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${escapeHtml(route.title)}" />
    <meta name="twitter:description" content="${escapeHtml(route.description)}" />
    ${route.image ? `<meta name="twitter:image" content="${escapeHtml(route.image)}" />` : ""}
    <script type="application/ld+json">${JSON.stringify(json)}</script>`;
  return cleanHead(template).replace("</head>", `${tags}\n  </head>`);
}

function route(path, title, description, image, extra = {}) {
  return { path, title, description, image, ...extra };
}

const routes = [
  route("/", "acupoflyrics — şarkı sözleri & Türkçe çeviri", "En sevdiğin şarkıların sözleri ve özenli Türkçe çevirileri. Spotify metadata ile zenginleşen premium müzik okuma deneyimi.", posts[0]?.cover),
  route("/discover", "Keşfet — Şarkı Çevirileri | acupoflyrics", `acupoflyrics arşivindeki ${posts.length} Türkçe şarkı çevirisini mood, tür, albüm, sanatçı ve koleksiyonlara göre keşfet.`, posts[0]?.cover),
  route("/search", "Arama | acupoflyrics", "Şarkı, sanatçı, albüm, koleksiyon, tür ya da bir dize ara — hem orijinal sözlerde hem Türkçe çeviride.", posts[0]?.cover),
  route("/listeler", "Müzik Listeleri — Billboard, Circle Chart, Spotify | acupoflyrics", "Dünya genelindeki popüler müzik listelerini takip et; listedeki şarkıların Türkçe çevirilerini arşivde bul.", posts[0]?.cover),
  route("/admin", "Admin — acupoflyrics", "acupoflyrics çeviri ve liste yönetim paneli.", posts[0]?.cover, { noindex: true }),
  route("/albumler", "Albümler — Türkçe Şarkı Çevirileri | acupoflyrics", "Çevirisi bulunan albümler: kapaklar, çıkış yılları ve albümdeki tüm Türkçe çeviriler tek sayfada.", posts[0]?.cover),
  route("/hakkimizda", "Hakkımızda | acupoflyrics", "acupoflyrics, 2020'den beri şarkı sözlerinin hikâyesini ve anlamını Türkçeye taşıyan bağımsız bir çeviri arşividir.", posts[0]?.cover),
  route("/iletisim", "İletişim | acupoflyrics", "Çeviri talebi, düzeltme önerisi ya da iş birliği için acupoflyrics ile iletişime geç.", posts[0]?.cover),
];

for (const post of posts) {
  const canonicalPath = postPath(post);
  const description = post.seo?.description || post.excerpt || `${post.artist} ${post.song} Türkçe çeviri ve orijinal şarkı sözleri.`;
  routes.push(route(
    canonicalPath,
    post.seo?.title || post.title || `${post.artist} ${post.song} Türkçe Çeviri`,
    description,
    post.cover,
    {
      type: "music.song",
      lastmod: post.date,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: post.song,
        byArtist: { "@type": "MusicGroup", name: post.artist },
        inAlbum: albumNameFor(post) !== "Tekli" ? { "@type": "MusicAlbum", name: albumNameFor(post) } : undefined,
        image: post.cover,
        url: `${SITE}${canonicalPath}`,
        isrcCode: post.spotify?.track?.isrc || post.spotify?.isrc || undefined,
        sameAs: [post.spotify?.track?.url || post.spotify?.trackUrl].filter(Boolean),
      },
    },
  ));
}

const artists = new Map();
for (const post of posts) {
  const slug = primaryArtistSlug(post);
  if (!artists.has(slug)) artists.set(slug, { slug, name: post.artist, cover: post.spotify?.artist?.image || post.cover, count: 0 });
  artists.get(slug).count += 1;
}
for (const artist of artists.values()) {
  routes.push(route(
    `/artist/${artist.slug}`,
    `${artist.name} Türkçe Çevirileri | acupoflyrics`,
    `${artist.name} şarkı sözleri, Türkçe çevirileri, albümleri ve en çok okunan parçaları.`,
    artist.cover,
    { type: "profile" },
  ));
}

const albums = new Map();
for (const post of posts) {
  const name = albumNameFor(post);
  if (!name || name === "Tekli") continue;
  const slug = slugify(`${post.artist}-${name}`);
  if (!albums.has(slug)) albums.set(slug, { slug, name, artist: post.artist, cover: post.spotify?.album?.cover || post.cover, count: 0, releaseDate: post.spotify?.album?.releaseDate || post.spotify?.releaseDate || post.date });
  albums.get(slug).count += 1;
}
for (const album of albums.values()) {
  routes.push(route(
    `/album/${album.slug}`,
    `${album.name} — ${album.artist} Albüm Çevirileri | acupoflyrics`,
    `${album.artist} ${album.name} albümündeki şarkıların Türkçe çevirileri, Spotify metadata ve albüm bağlamıyla.`,
    album.cover,
    { type: "music.album", lastmod: album.releaseDate },
  ));
}

for (const name of collectionNames) {
  routes.push(route(`/collection/${slugify(name)}`, `${name} — Şarkı Çevirileri Koleksiyonu | acupoflyrics`, `${name} hissi için seçilmiş Türkçe şarkı çevirileri.`, posts[0]?.cover));
}
for (const name of moodNames) {
  routes.push(route(`/mood/${slugify(name)}`, `${name} Mood Şarkı Çevirileri | acupoflyrics`, `${name} hissi taşıyan şarkıların Türkçe çevirileri.`, posts[0]?.cover));
}
for (const name of genreNames) {
  routes.push(route(`/genre/${slugify(name)}`, `${name} Türkçe Şarkı Çevirileri | acupoflyrics`, `${name} türündeki şarkıların Türkçe çevirileri, sanatçıları ve albümleri.`, posts[0]?.cover));
}

const byPath = new Map(routes.map((r) => [r.path, r]));
for (const routeData of byPath.values()) {
  const file = routeFile(routeData.path);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, htmlFor(routeData), "utf8");
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...byPath.values()].map((r) => `  <url>\n    <loc>${escapeHtml(`${SITE}${r.path}`)}</loc>\n    <lastmod>${new Date(r.lastmod || Date.now()).toISOString()}</lastmod>\n  </url>`).join("\n")}\n</urlset>\n`;

const redirectLines = [
  "/api/* /.netlify/functions/api/:splat 200",
];
for (const post of posts) {
  redirectLines.push(`/ceviri/${post.slug} /${post.slug}/ 301`);
  redirectLines.push(`/ceviri/${post.slug}/ /${post.slug}/ 301`);
  redirectLines.push(`/song/${post.slug} /${post.slug}/ 301`);
  redirectLines.push(`/song/${post.slug}/ /${post.slug}/ 301`);
  if (post.oldUrl) {
    try {
      const oldPath = new URL(post.oldUrl).pathname.replace(/\/?$/, "/");
      if (oldPath !== `/${post.slug}/`) redirectLines.push(`${oldPath} /${post.slug}/ 301`);
    } catch {
      /* oldUrl can be a path in local exports; ignore malformed values. */
    }
  }
}
for (const artist of artists.values()) {
  redirectLines.push(`/sanatci/${artist.slug} /artist/${artist.slug} 301`);
  redirectLines.push(`/sanatci/${artist.slug}/ /artist/${artist.slug} 301`);
}
redirectLines.push(`/home-preview / 301`);
redirectLines.push(`/ceviri-preview / 301`);
redirectLines.push(`/old-home / 301`);
redirectLines.push(`/kesfet /discover 301`);
redirectLines.push(`/muzik-listeleri /listeler 301`);
redirectLines.push(`/muzik-listeleri/ /listeler 301`);
redirectLines.push(`/hakkimizda/ /hakkimizda 301`);
redirectLines.push(`/iletisim/ /iletisim 301`);

const redirects = `${[...new Set(redirectLines)].join("\n")}\n`;

// ---- RSS feed (last 20 translations) — keeps WP-era feed subscribers. ----
function rssEscape(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const feedPosts = [...posts]
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 20);
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>acupoflyrics — Türkçe şarkı çevirileri</title>
    <link>${SITE}/</link>
    <description>Şarkı sözlerinin hikâyesi ve anlamı, özenli Türkçe çevirilerle.</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
${feedPosts.map((post) => `    <item>
      <title>${rssEscape(`${post.artist} - ${post.song} Türkçe Çeviri`)}</title>
      <link>${SITE}${postPath(post)}</link>
      <guid isPermaLink="true">${SITE}${postPath(post)}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${rssEscape(post.excerpt || `${post.artist} ${post.song} Türkçe çeviri ve orijinal sözler.`)}</description>
    </item>`).join("\n")}
  </channel>
</rss>
`;

await writeFile(path.join(DIST, "sitemap.xml"), sitemap, "utf8");
await writeFile(path.join(DIST, "_redirects"), redirects, "utf8");
await writeFile(path.join(DIST, "feed.xml"), feed, "utf8");
await writeFile(path.join(ROOT, "public/sitemap.xml"), sitemap, "utf8");
await writeFile(path.join(ROOT, "public/_redirects"), redirects, "utf8");
await writeFile(path.join(ROOT, "public/feed.xml"), feed, "utf8");

console.log(`Generated static SEO HTML for ${byPath.size} routes.`);
console.log(`Generated sitemap.xml, feed.xml and _redirects with ${redirectLines.length} redirect rules.`);
