import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { popGundemiArticles } from "../src/data/popGundemi.js";
import { completeSeoDescription, fitSeoTitle, normalizeSeoTitle, translationMetaDescription, translationMetaTitle } from "../src/lib/meta.js";
import { spotifyImageUrl } from "../src/lib/images.js";
import { languageInfo, languagesFor, translationLabel } from "../src/lib/languages.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SITE = "https://www.acupoflyrics.com";

const posts = JSON.parse(await readFile(path.join(ROOT, "src/data/posts.json"), "utf8"));
const artistsRaw = JSON.parse(await readFile(path.join(ROOT, "src/data/artists.json"), "utf8"));
const template = await readFile(path.join(DIST, "index.html"), "utf8");

function releaseYearFor(post) {
  const raw = post.spotify?.album?.releaseDate || post.spotify?.releaseDate || post.date;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : String(parsed.getFullYear());
}

const collectionYears = [...new Set(posts.map(releaseYearFor).filter((year) => /^\d{4}$/.test(year)))]
  .sort((a, b) => Number(b) - Number(a));
const SONGS_PER_PAGE = 48;
const moodNames = ["Love", "Sad", "Happy", "Healing", "Dark", "Motivation", "Party", "Lonely", "Dreamy", "Night"];
const genreNames = ["Pop", "Rock", "Hip Hop", "Alternative", "K-pop", "R&B", "EDM", "Indie"];
const KPOP_ARTISTS = new Set(["stray kids", "lisa", "jennie", "rosé", "rosie", "twice", "bts", "jin", "jimin", "jungkook", "ateez", "g-dragon", "blackpink", "jisoo", "aespa", "katseye", "itzy", "newjeans", "seventeen", "enhypen", "txt", "ive", "rm", "suga", "j-hope", "v", "zerobaseone", "le sserafim", "babymonster"]);
const RAP_ARTISTS = ["kendrick lamar", "eminem", "doja cat", "nicki minaj", "cardi b", "tyler", "drake", "j. cole", "travis scott", "sza"];
const ROCK_ARTISTS = ["metallica", "linkin park", "evanescence", "bring me the horizon", "maneskin", "thirty seconds to mars", "radiohead", "nirvana"];
const RB_ARTISTS = ["sza", "the weeknd", "frank ocean", "brent faiyaz", "ariana grande"];

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

function albumArtistFor(post) {
  return String(
    post.spotify?.albumArtist
      || post.spotify?.album?.artist
      || post.spotify?.artistName
      || post.spotify?.artist?.name
      || post.artist
      || "",
  ).trim();
}

function albumSlugForPost(post) {
  return slugify(`${albumArtistFor(post)}-${albumNameFor(post)}`);
}

function primaryArtistSlug(post) {
  const exact = preferredArtistByName.get(String(post.artist || "").trim().toLowerCase());
  return exact?.slug || post.category_slugs?.[0] || slugify(post.artist);
}

const performerNames = new Set(
  posts.flatMap((post) => String(post.artist || "")
    .split(/\s*,\s*/)
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)),
);
const categorySlugUse = new Map();
for (const post of posts) {
  const credits = new Set(String(post.artist || "").split(/\s*,\s*/).map((name) => name.trim().toLowerCase()));
  for (let index = 0; index < (post.category_slugs || []).length; index += 1) {
    const slug = post.category_slugs[index];
    const name = String(post.categories?.[index] || "").trim().toLowerCase();
    if (!credits.has(name)) continue;
    const key = `${name}::${slug}`;
    categorySlugUse.set(key, (categorySlugUse.get(key) || 0) + 1);
  }
}
const preferredArtistByName = new Map();
for (const artist of artistsRaw) {
  const key = String(artist.name || "").trim().toLowerCase();
  if (!performerNames.has(key)) continue;
  const current = preferredArtistByName.get(key);
  if (!current || (categorySlugUse.get(`${key}::${artist.slug}`) || 0) > (categorySlugUse.get(`${key}::${current.slug}`) || 0)) {
    preferredArtistByName.set(key, artist);
  }
}

function creditedArtists(post) {
  return String(post.artist || "")
    .split(/\s*,\s*/)
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => {
      const key = name.toLowerCase();
      const categoryIndex = (post.categories || []).findIndex(
        (category) => String(category || "").trim().toLowerCase() === key,
      );
      const categorySlug = categoryIndex >= 0 ? post.category_slugs?.[categoryIndex] : null;
      const meta = preferredArtistByName.get(key);
      return {
        slug: meta?.slug || categorySlug || slugify(name),
        name: meta?.name || name,
        image: meta?.image,
      };
    });
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

function lyricLines(post, original) {
  return (post.blocks || [])
    .filter((block) => Boolean(block.original) === original)
    .flatMap((block) => block.lines || [])
    .filter(Boolean);
}

function moodForPost(post) {
  const text = [
    post.song,
    post.artist,
    post.excerpt,
    post.slug,
    ...lyricLines(post, false).slice(0, 8),
  ].join(" ").toLowerCase();
  if (/heart|break|messy|cry|sad|lonely|alone|özlem|ağla|kırık|yara|pişman/.test(text)) return "Sad";
  if (/love|aşk|sevg|kiss|heart|first/.test(text)) return "Love";
  if (/night|gece|moon|dark|shadow|black|midnight/.test(text)) return "Night";
  if (/heal|iyileş|light|hope|dream|wish|peace/.test(text)) return "Healing";
  if (/fire|villain|bad|monster|war|kill|die|danger/.test(text)) return "Dark";
  if (/dance|party|summer|hot|club|rush|energy/.test(text)) return "Party";
  const fallback = ["Dreamy", "Lonely", "Motivation"];
  const hash = [...String(post.slug || "")].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) | 0, 0);
  return fallback[Math.abs(hash) % fallback.length];
}

function staticGenreFor(post) {
  const spotifyGenres = post.spotify?.artistGenres || post.spotify?.artist?.genres || [];
  const joined = spotifyGenres.join(" ").toLowerCase();
  const artist = String(post.artist || "").toLowerCase();
  const includesArtist = (list) => list.some((name) => artist.includes(name));
  if (KPOP_ARTISTS.has(artist) || joined.includes("k-pop")) return "K-pop";
  if (joined.includes("hip hop") || joined.includes("rap") || includesArtist(RAP_ARTISTS)) return "Hip Hop";
  if (joined.includes("r&b") || joined.includes("soul") || includesArtist(RB_ARTISTS)) return "R&B";
  if (joined.includes("rock") || joined.includes("metal") || includesArtist(ROCK_ARTISTS)) return "Rock";
  if (joined.includes("edm") || joined.includes("dance") || joined.includes("electronic")) return "EDM";
  if (joined.includes("alternative")) return "Alternative";
  if (joined.includes("indie")) return "Indie";
  return "Pop";
}

function staticLinks(items) {
  return items.map((item) => `
    <li><a href="${escapeHtml(postPath(item))}">${escapeHtml(item.artist)} — ${escapeHtml(item.song)}</a></li>`).join("");
}

function staticDirectoryLinks(items, pathFor, labelFor) {
  return items.map((item) => `
    <li><a href="${escapeHtml(pathFor(item))}">${escapeHtml(labelFor(item))}</a></li>`).join("");
}

function cleanHeroLine(value) {
  return String(value || "")
    .replace(/\s*\((?:mm[-\s]*|oh[-\s]*|ah[-\s]*)+\)\s*$/i, "")
    .trim();
}

function staticHome(items) {
  const post = items[0];
  if (!post) return staticCollectionPage({
    kicker: "acupoflyrics",
    title: "Şarkı Sözleri ve Türkçe Çeviriler",
    description: "Şarkıların hikâyesini, anlamını ve Türkçe çevirisini keşfet.",
    items: [],
  });

  const pair = firstPair(post);
  const translatedLine = cleanHeroLine(pair.tr) || post.song;
  const originalLine = cleanHeroLine(pair.en) || post.song;
  const album = albumNameFor(post);
  const year = releaseYearFor(post);
  const cover = spotifyImageUrl(post.cover || post.image, 640);
  const background = spotifyImageUrl(post.cover || post.image, 300);
  const spotifyUrl = post.spotify?.trackUrl || post.spotify?.track?.url;
  const recent = items.slice(0, 8);

  return `<div class="seo-home-prerender">
    <header class="seo-home-nav">
      <a class="seo-home-logo" href="/">acupoflyrics</a>
      <nav aria-label="Ana navigasyon">
        <a href="/discover">Keşfet</a>
        <a href="/sarkilar">Şarkılar</a>
        <a href="/albumler">Albümler</a>
        <a href="/sanatcilar">Sanatçılar</a>
        <a href="/discover#moods">Mood</a>
        <a href="/listeler">Listeler</a>
        <a href="/pop-gunlugu">Pop Günlüğü</a>
      </nav>
      <a class="seo-home-search" href="/search" aria-label="Ara">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.2-3.2"></path></svg>
        <span>Ara</span><kbd>⌘K</kbd>
      </a>
    </header>
    <main class="seo-home-shell">
      <h1>Şarkı Sözleri ve Türkçe Çeviriler</h1>
      <div class="seo-home-main">
        <section class="seo-home-hero" aria-labelledby="seo-home-featured">
          <img class="seo-home-hero-bg" src="${escapeHtml(background)}" width="300" height="300" fetchpriority="high" decoding="async" alt="" aria-hidden="true" />
          <div class="seo-home-vignette" aria-hidden="true"></div>
          <div class="seo-home-copy">
            <div class="seo-home-kicker"><span>Haftanın Çevirisi</span><i></i></div>
            <blockquote id="seo-home-featured">${escapeHtml(translatedLine)}</blockquote>
            <p class="seo-home-original">“${escapeHtml(originalLine)}”</p>
            <p class="seo-home-meta">${escapeHtml(post.artist)} · ${escapeHtml(album)}${year ? `, ${escapeHtml(year)}` : ""}</p>
            <div class="seo-home-actions">
              <a class="seo-home-primary" href="${escapeHtml(postPath(post))}">Çeviriyi oku <span aria-hidden="true">→</span></a>
              ${spotifyUrl ? `<a class="seo-home-listen" href="${escapeHtml(spotifyUrl)}"><span aria-hidden="true">▶</span> Dinle</a>` : ""}
            </div>
          </div>
          <a class="seo-home-art" href="${escapeHtml(postPath(post))}" aria-label="${escapeHtml(`${post.artist} ${post.song}`)}">
            <img src="${escapeHtml(cover)}" width="640" height="640" fetchpriority="high" decoding="async" alt="${escapeHtml(`${post.artist} - ${post.song}`)}" />
          </a>
          <div class="seo-home-count" aria-hidden="true"><span>1</span><i></i><span>5</span></div>
        </section>
        <section class="seo-home-recent" aria-labelledby="seo-home-recent-title">
          <div><span>Yeni eklenenler</span><h2 id="seo-home-recent-title">Yeni Çeviriler</h2></div>
          <ul>${staticLinks(recent)}</ul>
        </section>
      </div>
    </main>
    <footer class="seo-home-footer"><a href="/hakkimizda">Hakkımızda</a><a href="/iletisim">İletişim</a><a href="/gizlilik">Gizlilik</a></footer>
  </div>`;
}

function staticPage({ kicker, title, description, image, imageAlt, children = "" }) {
  return `<div class="seo-prerender">
    <nav><a href="/">acupoflyrics</a><a href="/discover">Keşfet</a><a href="/sarkilar">Şarkılar</a><a href="/sanatcilar">Sanatçılar</a><a href="/search">Ara</a></nav>
    <main>
      <article>
        ${kicker ? `<p class="seo-kicker">${escapeHtml(kicker)}</p>` : ""}
        <h1>${escapeHtml(title)}</h1>
        ${description ? `<p class="seo-description">${escapeHtml(description)}</p>` : ""}
        ${image ? `<img class="seo-cover" src="${escapeHtml(spotifyImageUrl(image, 300))}" width="300" height="300" fetchpriority="high" decoding="async" alt="${escapeHtml(imageAlt || `${title} kapak görseli`)}" />` : ""}
        ${children}
      </article>
    </main>
    <footer class="seo-footer"><a href="/albumler">Albümler</a><a href="/listeler">Müzik Listeleri</a><a href="/pop-gunlugu">Pop Günlüğü</a><a href="/hakkimizda">Hakkımızda</a><a href="/iletisim">İletişim</a><a href="/gizlilik">Gizlilik</a></footer>
  </div>`;
}

function staticSongCopy(post) {
  const languages = languagesFor(post);
  if (languages.translation === "tr") {
    return {
      kicker: "Şarkı sözleri ve Türkçe çeviri",
      originalHeading: "Orijinal şarkı sözleri",
      translationHeading: "Türkçe çeviri",
    };
  }

  const originalName = languageInfo(languages.original).englishName;
  const translationName = languageInfo(languages.translation).englishName;
  return {
    kicker: `${originalName} lyrics and ${translationName} translation`,
    originalHeading: `Original ${originalName} lyrics`,
    translationHeading: `${translationName} translation`,
  };
}

function staticSong(post, postIndex) {
  const languages = languagesFor(post);
  const copy = staticSongCopy(post);
  const sections = (post.blocks || []).map((block) => {
    const language = block.original ? copy.originalHeading : copy.translationHeading;
    const languageCode = block.original ? languages.original : languages.translation;
    const lines = (block.lines || []).filter(Boolean).map((line) => `<span>${escapeHtml(line)}</span>`).join("<br />");
    return lines ? `<section lang="${escapeHtml(languageCode)}"><h2>${escapeHtml(language)}</h2><p>${lines}</p></section>` : "";
  }).join("");
  const album = albumNameFor(post);
  const artist = creditedArtists(post)[0];
  const artistSlug = artist?.slug || primaryArtistSlug(post);
  const sameArtist = posts
    .filter((candidate) => candidate.slug !== post.slug && creditedArtists(candidate).some((credit) => credit.slug === artistSlug))
    .slice(0, 6);
  const sameArtistSlugs = new Set(sameArtist.map((candidate) => candidate.slug));
  const sharedCategory = posts
    .filter((candidate) => (
      candidate.slug !== post.slug
      && !sameArtistSlugs.has(candidate.slug)
      && candidate.category_slugs?.some((slug) => post.category_slugs?.includes(slug))
    ))
    .slice(0, 4);
  const similar = sharedCategory.length >= 3
    ? sharedCategory
    : [...sharedCategory, ...posts.filter((candidate) => (
        candidate.slug !== post.slug
        && !sameArtistSlugs.has(candidate.slug)
        && !sharedCategory.some((item) => item.slug === candidate.slug)
      ))].slice(0, 4);
  const previous = postIndex > 0 ? posts[postIndex - 1] : null;
  const next = postIndex < posts.length - 1 ? posts[postIndex + 1] : null;
  const artistLink = artist ? `<a href="/artist/${escapeHtml(artist.slug)}">${escapeHtml(artist.name)}</a>` : escapeHtml(post.artist);
  const albumLink = album && album !== "Tekli"
    ? `<a href="/album/${escapeHtml(albumSlugForPost(post))}">${escapeHtml(album)}</a>`
    : "";
  const breadcrumbs = `<nav class="seo-breadcrumbs" aria-label="Breadcrumb">
    <a href="/">Ana sayfa</a><span aria-hidden="true">/</span>
    <a href="/sarkilar">Şarkılar</a><span aria-hidden="true">/</span>
    ${artist ? `<a href="/artist/${escapeHtml(artist.slug)}">${escapeHtml(artist.name)}</a><span aria-hidden="true">/</span>` : ""}
    <span aria-current="page">${escapeHtml(post.song)}</span>
  </nav>`;
  const relatedSections = `${sameArtist.length ? `<section class="seo-related"><h2>Aynı sanatçıdan diğer çeviriler</h2><ul>${staticLinks(sameArtist)}</ul></section>` : ""}
    ${similar.length ? `<section class="seo-related"><h2>Benzer şarkılar</h2><ul>${staticLinks(similar)}</ul></section>` : ""}`;
  const pager = `<nav class="seo-song-pager" aria-label="Şarkılar arasında gezin">
    ${previous ? `<a rel="prev" href="${escapeHtml(postPath(previous))}">← ${escapeHtml(previous.artist)} — ${escapeHtml(previous.song)}</a>` : "<span></span>"}
    ${next ? `<a rel="next" href="${escapeHtml(postPath(next))}">${escapeHtml(next.artist)} — ${escapeHtml(next.song)} →</a>` : ""}
  </nav>`;
  return staticPage({
    kicker: copy.kicker,
    title: `${post.artist} — ${post.song}`,
    description: translationMetaDescription(post),
    image: post.cover,
    imageAlt: `${post.artist} — ${post.song} kapak görseli`,
    children: `${breadcrumbs}<p class="seo-song-meta">Sanatçı: ${artistLink}${albumLink ? ` · Albüm: ${albumLink}` : ""}</p>${sections}${relatedSections}${pager}`,
  });
}

function staticCollectionPage({ kicker, title, description, image, items }) {
  return staticPage({
    kicker,
    title,
    description,
    image,
    imageAlt: `${title} kapak görseli`,
    children: `<h2>Şarkılar</h2><ul>${staticLinks(items)}</ul>`,
  });
}

function staticSongArchivePage(items, page, pageCount) {
  const start = ((page - 1) * SONGS_PER_PAGE) + 1;
  const pagination = Array.from({ length: pageCount }, (_, index) => index + 1)
    .map((number) => `<a${number === page ? ' aria-current="page"' : ""} href="${number === 1 ? "/sarkilar" : `/sarkilar/page/${number}`}">${number}</a>`)
    .join(" ");
  return staticPage({
    kicker: "Şarkı arşivi",
    title: page === 1 ? "Tüm şarkılar" : `Tüm şarkılar · Sayfa ${page}`,
    description: `acupoflyrics arşivindeki şarkı çevirilerinin ${page}. sayfası. Bu sayfada ${start}. kayıttan başlayan ${items.length} şarkı bulunuyor.`,
    image: items[0]?.cover,
    imageAlt: items[0] ? `${items[0].artist} — ${items[0].song} kapak görseli` : "acupoflyrics şarkı arşivi",
    children: `<nav class="seo-breadcrumbs" aria-label="Breadcrumb"><a href="/">Ana sayfa</a><span aria-hidden="true">/</span><a href="/sarkilar">Tüm şarkılar</a>${page > 1 ? `<span aria-hidden="true">/</span><span aria-current="page">Sayfa ${page}</span>` : ""}</nav><h2>Şarkılar</h2><ul>${staticLinks(items)}</ul><nav class="seo-archive-pagination" aria-label="Şarkı arşivi sayfaları">${pagination}</nav>`,
  });
}

function staticArticle(article) {
  const sections = (article.sections || []).map((section) => `
    <section><h2>${escapeHtml(section.heading)}</h2>${(section.body || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</section>`).join("");
  return staticPage({
    kicker: article.kicker,
    title: article.title,
    description: article.dek || article.excerpt,
    image: article.image,
    imageAlt: article.imageAlt || `${article.shortTitle || article.title} görseli`,
    children: `<time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time>${sections}`,
  });
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
    .replace(/\s*<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "");
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
    ${route.noindex ? '<meta name="robots" content="noindex, follow" />' : ""}
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
    <script id="apl-structured-data" type="application/ld+json">${JSON.stringify(json)}</script>
    ${route.breadcrumbs?.length ? `<script id="apl-breadcrumbs" type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: route.breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: `${SITE}${item.path}`,
      })),
    })}</script>` : ""}
    <style id="seo-prerender-styles">
      html,body{margin:0;min-height:100%;background:#071012}.seo-prerender{min-height:100vh;padding:28px;background:#071012;color:#f7f3ec;font:16px/1.65 Inter,system-ui,sans-serif}.seo-prerender>nav,.seo-prerender main{width:min(920px,100%);margin:auto}.seo-prerender>nav{display:flex;flex-wrap:wrap;gap:22px;padding:0 0 32px}.seo-prerender a{color:inherit}.seo-prerender article{display:flow-root}.seo-prerender h1{max-width:18ch;margin:0 0 18px;font:400 clamp(38px,7vw,72px)/1.02 Fraunces,Georgia,serif}.seo-prerender h2{margin-top:34px;font:400 25px/1.2 Fraunces,Georgia,serif}.seo-kicker{color:#ef8dad;text-transform:uppercase;letter-spacing:.12em;font-size:12px}.seo-description{max-width:68ch;color:rgba(247,243,236,.72)}.seo-cover{float:right;width:min(320px,42vw);margin:0 0 26px 32px;border-radius:10px}.seo-prerender section span{color:rgba(247,243,236,.82)}.seo-prerender li{margin:9px 0}.seo-footer,.seo-home-footer{display:flex;flex-wrap:wrap;gap:18px;width:min(920px,100%);margin:52px auto 0;padding:24px 0;border-top:1px solid rgba(255,255,255,.12);font-size:13px}.seo-home-footer{width:min(100% - 56px,1378px);margin-top:0;padding-bottom:32px}.seo-breadcrumbs{display:flex;flex-wrap:wrap;gap:9px;margin:22px 0;color:rgba(247,243,236,.66);font-size:13px}.seo-song-meta{margin:18px 0 28px}.seo-related{clear:both}.seo-song-pager{clear:both;display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,.12)}.seo-song-pager a:last-child{text-align:right}.seo-home-prerender,.seo-home-prerender *{box-sizing:border-box}.seo-home-prerender{--seo-bg:#071012;--seo-bg-soft:#0b1518;--seo-text:#f7f3ec;--seo-muted:rgba(247,243,236,.7);--seo-faint:rgba(247,243,236,.52);--seo-border:rgba(255,255,255,.09);--seo-accent:#d28075;min-height:100vh;overflow:hidden;background:radial-gradient(circle at 55% 2%,rgba(36,22,20,.24),transparent 32%),linear-gradient(180deg,var(--seo-bg),var(--seo-bg-soft));color:var(--seo-text);font-family:Inter,system-ui,sans-serif}.seo-home-prerender a{color:inherit;text-decoration:none}.seo-home-nav{position:relative;z-index:3;display:grid;grid-template-columns:minmax(150px,.6fr) minmax(540px,1.3fr) minmax(190px,.5fr);align-items:center;gap:22px;min-height:84px;width:min(100%,1510px);margin:auto;padding:0 clamp(28px,4.4vw,66px)}.seo-home-logo{font:italic 300 27px/1 Fraunces,Georgia,serif}.seo-home-nav nav{display:flex;align-items:center;justify-content:center;gap:clamp(16px,2.3vw,36px)}.seo-home-nav nav a{font-size:14px;opacity:.86}.seo-home-search{justify-self:end;display:inline-flex;align-items:center;gap:10px;min-height:42px;padding:0 18px;border:1px solid var(--seo-border);border-radius:999px;background:rgba(22,30,35,.66);color:var(--seo-muted);font-size:14px}.seo-home-search kbd{color:var(--seo-faint);font:12px Inter,system-ui,sans-serif}.seo-home-shell{display:grid;grid-template-columns:minmax(0,2.18fr) minmax(330px,.82fr);gap:clamp(22px,3vw,38px);width:min(100%,1510px);margin:auto;padding:12px clamp(28px,4.4vw,66px) 42px}.seo-home-shell>h1{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.seo-home-main{min-width:0;padding-right:clamp(22px,3vw,38px);border-right:1px solid var(--seo-border)}.seo-home-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,49%);align-items:center;height:580px;overflow:hidden}.seo-home-hero-bg{position:absolute;inset:-16%;width:132%;height:132%;object-fit:cover;opacity:.48;filter:blur(42px) saturate(1.18);transform:scale(1.05)}.seo-home-vignette{position:absolute;inset:0;background:radial-gradient(circle at 76% 48%,transparent 0,rgba(0,0,0,.08) 28%,rgba(0,0,0,.3) 74%),linear-gradient(90deg,var(--seo-bg) 0%,rgba(7,16,18,.82) 38%,transparent 100%),linear-gradient(180deg,transparent 0%,rgba(7,16,18,.72) 100%)}.seo-home-copy{position:relative;z-index:2;max-width:590px;padding:30px clamp(26px,3vw,44px) 44px}.seo-home-kicker{display:flex;align-items:center;gap:16px;margin-bottom:26px;color:var(--seo-accent);font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase}.seo-home-kicker i{width:34px;height:1px;background:currentColor}.seo-home-copy blockquote{margin:0;color:var(--seo-text);font:300 clamp(50px,5.1vw,76px)/.98 Fraunces,Georgia,serif}.seo-home-original{margin:22px 0 0;color:var(--seo-muted);font-size:clamp(19px,1.8vw,24px);font-weight:300;line-height:1.35}.seo-home-meta{margin:14px 0 0;color:var(--seo-muted);font-size:17px}.seo-home-actions{display:flex;align-items:center;gap:22px;margin-top:42px}.seo-home-primary,.seo-home-listen{display:inline-flex;align-items:center;gap:10px;min-height:52px}.seo-home-primary{padding:0 28px;border-radius:999px;background:var(--seo-accent);color:#fff!important;font-size:14px;font-weight:600;box-shadow:0 18px 34px rgba(0,0,0,.24)}.seo-home-listen{font-size:15px}.seo-home-listen span{display:grid;place-items:center;width:38px;height:38px;border:1px solid var(--seo-border);border-radius:50%;background:rgba(22,30,35,.66);font-size:11px}.seo-home-art{position:relative;z-index:2;justify-self:end;width:min(100%,650px);aspect-ratio:1;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:#111a1d;box-shadow:0 32px 78px rgba(0,0,0,.34)}.seo-home-art img{display:block;width:100%;height:100%;object-fit:cover;filter:saturate(1.06) contrast(1.04)}.seo-home-count{position:absolute;z-index:3;right:clamp(18px,2vw,32px);bottom:26px;display:flex;align-items:center;gap:12px;color:var(--seo-faint);font-size:13px}.seo-home-count span:first-child{color:var(--seo-accent)}.seo-home-count i{width:38px;height:1px;background:var(--seo-faint)}.seo-home-recent{content-visibility:auto;contain-intrinsic-block-size:420px;padding:34px 0;border-top:1px solid var(--seo-border)}.seo-home-recent>div>span{color:var(--seo-accent);font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase}.seo-home-recent h2{margin:8px 0 22px;font:300 34px/1.1 Fraunces,Georgia,serif}.seo-home-recent ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px;margin:0;padding:0;list-style:none}.seo-home-recent li{border-top:1px solid var(--seo-border)}.seo-home-recent li a{display:block;padding:13px 0;color:var(--seo-muted);font-size:14px}@media(max-width:1180px){.seo-home-shell{grid-template-columns:minmax(0,1fr)}.seo-home-main{padding-right:0;border-right:0}}@media(max-width:860px){.seo-home-nav{min-height:72px;grid-template-columns:1fr auto;padding:0 18px}.seo-home-nav nav{display:none}.seo-home-search{width:42px;padding:0;justify-content:center}.seo-home-search span,.seo-home-search kbd{display:none}.seo-home-shell{padding:8px 18px 34px}.seo-home-hero{display:flex;flex-direction:column-reverse;align-items:stretch;height:clamp(610px,120vw,640px);gap:14px;padding-bottom:18px}.seo-home-art{width:min(70vw,260px);margin-inline:auto}.seo-home-copy{padding:0 18px 4px}.seo-home-kicker{margin-bottom:16px}.seo-home-copy blockquote{font-size:clamp(38px,10vw,52px)}.seo-home-original{margin-top:14px;font-size:clamp(16px,4vw,19px)}.seo-home-meta{margin-top:8px;font-size:14px}.seo-home-actions{flex-wrap:wrap;margin-top:20px}.seo-home-count{display:none}.seo-home-recent ul{grid-template-columns:1fr}}@media(max-width:620px){.seo-prerender{padding:20px}.seo-cover{float:none;width:100%;margin:8px 0 18px}.seo-song-pager{grid-template-columns:1fr}.seo-song-pager a:last-child{text-align:left}}
    </style>`;
  const withHead = cleanHead(template).replace("</head>", `${tags}\n  </head>`);
  return withHead.replace('<div id="root"></div>', `<div id="root">${route.staticHtml || ""}</div>`);
}

function route(path, title, description, image, extra = {}) {
  const normalizedDescription = completeSeoDescription(description);
  const normalizedTitle = normalizeSeoTitle(title);
  return { path, title: normalizedTitle, description: normalizedDescription, image, ...extra };
}

const routes = [
  route(
    "/",
    "Şarkı Sözleri ve Türkçe Çeviriler | acupoflyrics",
    "Şarkı sözlerini, özenli Türkçe çevirileri, satır açıklamalarını ve müzik gündemini acupoflyrics arşivinde keşfet.",
    posts[0]?.cover,
    {
      staticHtml: staticHome(posts),
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "acupoflyrics",
        url: SITE,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    },
  ),
  route("/discover", "Keşfet — Şarkı Çevirileri | acupoflyrics", `acupoflyrics arşivindeki ${posts.length} şarkı çevirisini mood, tür, albüm, sanatçı ve koleksiyonlara göre keşfet.`, posts[0]?.cover),
  route("/search", "Arama | acupoflyrics", "Şarkı, sanatçı, albüm, koleksiyon, tür ya da bir dize ara — hem orijinal sözlerde hem çevirilerde.", posts[0]?.cover, { noindex: true }),
  route("/listeler", "Müzik Listeleri — Billboard, Circle Chart, Spotify | acupoflyrics", "Dünya genelindeki popüler müzik listelerini takip et; listedeki şarkıların çevirilerini arşivde bul.", posts[0]?.cover),
  route("/admin", "Admin — acupoflyrics", "acupoflyrics çeviri ve liste yönetim paneli.", posts[0]?.cover, { noindex: true }),
  route("/albumler", "Albümler — Şarkı Çevirileri | acupoflyrics", "Çevirisi bulunan albümler: kapaklar, çıkış yılları ve albümdeki tüm çeviriler tek sayfada.", posts[0]?.cover),
  route("/hakkimizda", "Hakkımızda | acupoflyrics", "acupoflyrics, 2020'den beri şarkı sözlerinin hikâyesini ve anlamını diller arasında taşıyan bağımsız bir çeviri arşividir.", posts[0]?.cover),
  route("/iletisim", "İletişim | acupoflyrics", "Çeviri talebi, düzeltme önerisi ya da iş birliği için acupoflyrics ile iletişime geç.", posts[0]?.cover),
  route("/gizlilik", "Gizlilik ve çerezler | acupoflyrics", "acupoflyrics üzerindeki Google Analytics ölçümü, çerez tercihi ve veri kullanımı hakkında bilgi.", posts[0]?.cover),
  route("/pop-gunlugu", "Pop Günlüğü | acupoflyrics", "K-pop ve pop müzik gündeminde konuşulanları kaynaklarıyla, sakin ve anlaşılır notlarla takip et.", popGundemiArticles[0]?.image, {
    staticHtml: staticPage({
      kicker: "Müzik gündemi",
      title: "Pop Günlüğü",
      description: "K-pop ve pop müzik gündeminde konuşulanları kaynaklarıyla takip et.",
      image: popGundemiArticles[0]?.image,
      children: `<h2>Son yazılar</h2><ul>${popGundemiArticles.map((article) => `<li><a href="/pop-gunlugu/${escapeHtml(article.slug)}">${escapeHtml(article.shortTitle)}</a></li>`).join("")}</ul>`,
    }),
  }),
];

const songArchivePageCount = Math.max(1, Math.ceil(posts.length / SONGS_PER_PAGE));
for (let page = 1; page <= songArchivePageCount; page += 1) {
  const pageItems = posts.slice((page - 1) * SONGS_PER_PAGE, page * SONGS_PER_PAGE);
  const archivePath = page === 1 ? "/sarkilar" : `/sarkilar/page/${page}`;
  routes.push(route(
    archivePath,
    page === 1 ? "Tüm Şarkı Çevirileri | acupoflyrics" : `Şarkı Çevirileri — Sayfa ${page} | acupoflyrics`,
    `acupoflyrics arşivindeki ${posts.length} şarkı çevirisini sayfalı arşivde keşfet. Bu sayfada ${pageItems.length} şarkı bulunuyor.`,
    pageItems[0]?.cover,
    {
      staticHtml: staticSongArchivePage(pageItems, page, songArchivePageCount),
      breadcrumbs: [
        { name: "Ana sayfa", path: "/" },
        { name: "Tüm şarkılar", path: "/sarkilar" },
        ...(page > 1 ? [{ name: `Sayfa ${page}`, path: archivePath }] : []),
      ],
    },
  ));
}

for (const article of popGundemiArticles) {
  const articlePath = `/pop-gunlugu/${article.slug}`;
  const articleUrl = `${SITE}${articlePath}`;
  const articleKeywords = [
    article.artistName,
    article.shortTitle,
    article.kicker,
    "Pop Günlüğü",
    "müzik gündemi",
    "Türkçe çeviri",
  ].filter(Boolean);

  routes.push(route(
    articlePath,
    `${article.shortTitle} | Pop Günlüğü`,
    article.excerpt,
    article.image,
    {
      type: "article",
      lastmod: article.updatedAt || article.date,
      staticHtml: staticArticle(article),
      breadcrumbs: [
        { name: "Ana sayfa", path: "/" },
        { name: "Pop Günlüğü", path: "/pop-gunlugu" },
        { name: article.shortTitle, path: articlePath },
      ],
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Article",
        mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
        headline: article.title,
        alternativeHeadline: article.shortTitle,
        description: article.excerpt,
        url: articleUrl,
        image: [article.image],
        thumbnailUrl: article.image,
        inLanguage: "tr-TR",
        isAccessibleForFree: true,
        articleSection: article.kicker,
        keywords: articleKeywords,
        datePublished: article.date,
        dateModified: article.updatedAt || article.date,
        author: { "@type": "Organization", name: "acupoflyrics", url: SITE },
        publisher: { "@type": "Organization", name: "acupoflyrics", url: SITE },
        about: article.artistName
          ? [{ "@type": "MusicGroup", name: article.artistName }]
          : undefined,
        citation: article.sources?.map((source) => source.url),
      },
    },
  ));
}

for (const [postIndex, post] of posts.entries()) {
  const canonicalPath = postPath(post);
  const description = translationMetaDescription(post);
  const primaryArtist = creditedArtists(post)[0];
  routes.push(route(
    canonicalPath,
    translationMetaTitle(post),
    description,
    post.cover,
    {
      type: "music.song",
      lastmod: post.date,
      staticHtml: staticSong(post, postIndex),
      breadcrumbs: [
        { name: "Ana sayfa", path: "/" },
        ...(primaryArtist ? [{ name: primaryArtist.name, path: `/artist/${primaryArtist.slug}` }] : []),
        { name: post.song, path: canonicalPath },
      ],
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: post.song,
        byArtist: { "@type": "MusicGroup", name: post.artist },
        inAlbum: albumNameFor(post) !== "Tekli" ? { "@type": "MusicAlbum", name: albumNameFor(post) } : undefined,
        image: post.cover,
        url: `${SITE}${canonicalPath}`,
        inLanguage: languagesFor(post).original,
        isrcCode: post.spotify?.track?.isrc || post.spotify?.isrc || undefined,
        sameAs: [post.spotify?.track?.url || post.spotify?.trackUrl].filter(Boolean),
      },
    },
  ));
}

const artists = new Map();
for (const post of posts) {
  for (const credit of creditedArtists(post)) {
    if (!artists.has(credit.slug)) {
      artists.set(credit.slug, {
        slug: credit.slug,
        name: credit.name,
        cover: credit.image || post.spotify?.artist?.image || post.cover,
        count: 0,
        posts: [],
      });
    }
    artists.get(credit.slug).count += 1;
    if (!artists.get(credit.slug).posts.some((item) => item.slug === post.slug)) artists.get(credit.slug).posts.push(post);
  }
}

function collectionTargetMode(items) {
  const targets = [...new Set(items.map((item) => languagesFor(item).translation))];
  if (targets.length === 1 && targets[0] === "en") return "en";
  if (targets.length === 1 && targets[0] === "tr") return "tr";
  return "mixed";
}

for (const artist of artists.values()) {
  const targetMode = collectionTargetMode(artist.posts);
  const translationDirection = targetMode === "en"
    ? "İngilizce Çevirileri"
    : targetMode === "tr" ? "Türkçe Çevirileri" : "Şarkı Çevirileri";
  const title = fitSeoTitle([
    `${artist.name} Şarkı Sözleri ve ${translationDirection} | acupoflyrics`,
    `${artist.name} ${translationDirection} | acupoflyrics`,
    `${artist.name} ${translationDirection}`,
  ]);
  const description = targetMode === "en"
    ? `${artist.name} Turkish lyrics, English translations, albums and most-read songs.`
    : targetMode === "tr"
      ? `${artist.name} şarkı sözleri, Türkçe çevirileri, albümleri ve en çok okunan parçaları.`
      : `${artist.name} şarkı sözleri, farklı dillerdeki çevirileri, albümleri ve en çok okunan parçaları.`;
  routes.push(route(
    `/artist/${artist.slug}`,
    title,
    description,
    artist.cover,
    {
      type: "profile",
      staticHtml: staticCollectionPage({
        kicker: "Sanatçı",
        title: artist.name,
        description,
        image: artist.cover,
        items: artist.posts,
      }),
      breadcrumbs: [
        { name: "Ana sayfa", path: "/" },
        { name: "Keşfet", path: "/discover" },
        { name: artist.name, path: `/artist/${artist.slug}` },
      ],
    },
  ));
}

routes.push(route(
  "/sanatcilar",
  "Tüm Sanatçılar — Şarkı Çeviri Arşivi | acupoflyrics",
  `${artists.size} sanatçıya ait ${posts.length} şarkı çevirisini sanatçı sayfalarından keşfet; albümlere ve tüm şarkılara doğrudan ulaş.`,
  [...artists.values()][0]?.cover,
  {
    staticHtml: staticPage({
      kicker: "Sanatçı arşivi",
      title: "Tüm sanatçılar",
      description: `${artists.size} sanatçı sayfası; her sanatçının tüm çevirileri ve albümleri tek bir dizinde.`,
      image: [...artists.values()][0]?.cover,
      imageAlt: `${[...artists.values()][0]?.name || "acupoflyrics"} sanatçı fotoğrafı`,
      children: `<h2>Sanatçılar</h2><ul>${staticDirectoryLinks(
        [...artists.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr")),
        (artist) => `/artist/${artist.slug}`,
        (artist) => `${artist.name} — ${artist.count} çeviri`,
      )}</ul>`,
    }),
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Sanatçılar", path: "/sanatcilar" },
    ],
  },
));

const albums = new Map();
const legacyAlbumRedirects = new Map();
for (const post of posts) {
  const name = albumNameFor(post);
  if (!name || name === "Tekli") continue;
  const artist = albumArtistFor(post);
  const slug = albumSlugForPost(post);
  const legacySlug = slugify(`${post.artist}-${name}`);
  if (legacySlug && legacySlug !== slug) legacyAlbumRedirects.set(legacySlug, slug);
  if (!albums.has(slug)) albums.set(slug, { slug, name, artist, cover: post.spotify?.album?.cover || post.cover, count: 0, releaseDate: post.spotify?.album?.releaseDate || post.spotify?.releaseDate || post.date, tracks: [] });
  albums.get(slug).count += 1;
  albums.get(slug).tracks.push(post);
}
for (const album of albums.values()) {
  const targetMode = collectionTargetMode(album.tracks);
  const title = fitSeoTitle([
    `${album.name} — ${album.artist} Albüm Çevirileri | acupoflyrics`,
    `${album.name} Albüm Çevirileri | acupoflyrics`,
    `${album.name} Albüm Çevirileri`,
  ]);
  const description = targetMode === "en"
    ? `${album.artist} ${album.name} Turkish lyrics and English translations with Spotify metadata and release context.`
    : targetMode === "tr"
      ? `${album.artist} ${album.name} albümündeki şarkıların Türkçe çevirileri, Spotify metadata ve albüm bağlamıyla.`
      : `${album.artist} ${album.name} albümündeki şarkıların çevirileri, Spotify metadata ve albüm bağlamıyla.`;
  routes.push(route(
    `/album/${album.slug}`,
    title,
    description,
    album.cover,
    {
      type: "music.album",
      lastmod: album.releaseDate,
      noindex: album.count < 2,
      staticHtml: staticCollectionPage({
        kicker: "Albüm",
        title: album.name,
        description,
        image: album.cover,
        items: album.tracks,
      }),
      breadcrumbs: [
        { name: "Ana sayfa", path: "/" },
        { name: "Albümler", path: "/albumler" },
        { name: album.name, path: `/album/${album.slug}` },
      ],
    },
  ));
}

const albumDirectory = [...albums.values()]
  .sort((a, b) => b.count - a.count || new Date(b.releaseDate) - new Date(a.releaseDate));
const albumsRoute = routes.find((item) => item.path === "/albumler");
if (albumsRoute) {
  albumsRoute.staticHtml = staticPage({
    kicker: "Albüm arşivi",
    title: "Albümler",
    description: `${albumDirectory.length} albümde yer alan şarkı çevirilerini kapakları, sanatçıları ve bütün mevcut parçalarıyla keşfet.`,
    image: albumDirectory[0]?.cover,
    imageAlt: albumDirectory[0] ? `${albumDirectory[0].artist} — ${albumDirectory[0].name} albüm kapağı` : "acupoflyrics albüm arşivi",
    children: `<h2>Tüm albümler</h2><ul>${staticDirectoryLinks(
      albumDirectory,
      (album) => `/album/${album.slug}`,
      (album) => `${album.artist} — ${album.name} (${album.count} çeviri)`,
    )}</ul>`,
  });
  albumsRoute.breadcrumbs = [
    { name: "Ana sayfa", path: "/" },
    { name: "Albümler", path: "/albumler" },
  ];
}

const discoverRoute = routes.find((item) => item.path === "/discover");
if (discoverRoute) {
  discoverRoute.staticHtml = staticPage({
    kicker: "Keşfet",
    title: "Şarkı çeviri arşivini keşfet",
    description: `${posts.length} şarkı çevirisini sanatçı, albüm, yıl, tür ve mood arşivleri üzerinden gerçek bağlantılarla keşfet.`,
    image: posts[0]?.cover,
    imageAlt: posts[0] ? `${posts[0].artist} — ${posts[0].song} kapak görseli` : "acupoflyrics keşfet",
    children: `<h2>Ana arşivler</h2><ul>
      <li><a href="/sarkilar">Tüm şarkılar — ${posts.length} çeviri</a></li>
      <li><a href="/sanatcilar">Tüm sanatçılar — ${artists.size} sanatçı</a></li>
      <li><a href="/albumler">Tüm albümler — ${albumDirectory.length} albüm</a></li>
    </ul>
    <h2>Sanatçılar</h2><ul>${staticDirectoryLinks(
      [...artists.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr")),
      (artist) => `/artist/${artist.slug}`,
      (artist) => artist.name,
    )}</ul>
    <h2>Albümler</h2><ul>${staticDirectoryLinks(
      albumDirectory,
      (album) => `/album/${album.slug}`,
      (album) => `${album.artist} — ${album.name}`,
    )}</ul>
    <h2>Yıllar</h2><ul>${collectionYears.map((year) => `<li><a href="/collection/${slugify(`${year} Şarkıları`)}">${year} Şarkıları</a></li>`).join("")}</ul>
    <h2>Mood</h2><ul>${moodNames.map((name) => `<li><a href="/mood/${slugify(name)}">${escapeHtml(name)}</a></li>`).join("")}</ul>
    <h2>Türler</h2><ul>${genreNames.map((name) => `<li><a href="/genre/${slugify(name)}">${escapeHtml(name)}</a></li>`).join("")}</ul>`,
  });
  discoverRoute.breadcrumbs = [
    { name: "Ana sayfa", path: "/" },
    { name: "Keşfet", path: "/discover" },
  ];
}

for (const year of collectionYears) {
  const name = `${year} Şarkıları`;
  const yearPosts = posts.filter((post) => releaseYearFor(post) === year);
  const targetMode = collectionTargetMode(yearPosts);
  const yearTitle = fitSeoTitle([`${name} — Şarkı Çevirileri | acupoflyrics`]);
  const yearDescription = targetMode === "tr"
    ? `${year} yılında yayımlanan ve acupoflyrics arşivinde Türkçeye çevrilen ${yearPosts.length} şarkı.`
    : `${year} yılında yayımlanan ve acupoflyrics arşivinde çevirisi bulunan ${yearPosts.length} şarkı.`;
  routes.push(route(
    `/collection/${slugify(name)}`,
    yearTitle,
    yearDescription,
    yearPosts[0]?.cover,
    {
      staticHtml: staticCollectionPage({
        kicker: "Yıl arşivi",
        title: name,
        description: yearDescription,
        image: yearPosts[0]?.cover,
        items: yearPosts,
      }),
      breadcrumbs: [
        { name: "Ana sayfa", path: "/" },
        { name: name, path: `/collection/${slugify(name)}` },
      ],
    },
  ));
}
for (const name of moodNames) {
  const moodPosts = posts.filter((post) => moodForPost(post) === name);
  const moodPath = `/mood/${slugify(name)}`;
  routes.push(route(moodPath, fitSeoTitle([`${name} Şarkıları — Mood'a Göre Çeviriler | acupoflyrics`]), `${name} hissi taşıyan şarkıların çevirileri.`, moodPosts[0]?.cover, {
    staticHtml: staticCollectionPage({
      kicker: "Mood",
      title: name,
      description: `${name} hissi taşıyan ${moodPosts.length} şarkının çevirisi.`,
      image: moodPosts[0]?.cover,
      items: moodPosts,
    }),
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Keşfet", path: "/discover" },
      { name, path: moodPath },
    ],
  }));
}
for (const name of genreNames) {
  const genrePosts = posts.filter((post) => staticGenreFor(post) === name);
  const genrePath = `/genre/${slugify(name)}`;
  const description = `${name} türündeki ${genrePosts.length} şarkının çevirilerini, sanatçılarını, albümlerini ve satır açıklamalarını acupoflyrics arşivinde keşfet.`;
  routes.push(route(genrePath, fitSeoTitle([`${name} Şarkı Sözleri ve Çevirileri | acupoflyrics`]), description, genrePosts[0]?.cover || posts[0]?.cover, {
    noindex: genrePosts.length === 0,
    staticHtml: staticCollectionPage({
      kicker: "Tür",
      title: name,
      description,
      image: genrePosts[0]?.cover || posts[0]?.cover,
      items: genrePosts,
    }),
    breadcrumbs: [
      { name: "Ana sayfa", path: "/" },
      { name: "Keşfet", path: "/discover" },
      { name, path: genrePath },
    ],
  }));
}

const byPath = new Map(routes.map((r) => [r.path, r]));
for (const routeData of byPath.values()) {
  const file = routeFile(routeData.path);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, htmlFor(routeData), "utf8");
}

const indexableRoutes = [...byPath.values()].filter((routeData) => !routeData.noindex);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexableRoutes.map((r) => `  <url>\n    <loc>${escapeHtml(`${SITE}${r.path}`)}</loc>${r.lastmod ? `\n    <lastmod>${new Date(r.lastmod).toISOString()}</lastmod>` : ""}\n  </url>`).join("\n")}\n</urlset>\n`;

const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
`;

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
for (const [legacySlug, canonicalSlug] of legacyAlbumRedirects) {
  redirectLines.push(`/album/${legacySlug} /album/${canonicalSlug} 301`);
  redirectLines.push(`/album/${legacySlug}/ /album/${canonicalSlug} 301`);
}
redirectLines.push(`/home-preview / 301`);
redirectLines.push(`/ceviri-preview / 301`);
redirectLines.push(`/old-home / 301`);
redirectLines.push(`/kesfet /discover 301`);
redirectLines.push(`/muzik-listeleri /listeler 301`);
redirectLines.push(`/muzik-listeleri/ /listeler 301`);
redirectLines.push(`/sarkilar/page/1 /sarkilar 301`);
redirectLines.push(`/sarkilar/page/1/ /sarkilar 301`);
redirectLines.push(`/hakkimizda/ /hakkimizda 301`);
redirectLines.push(`/iletisim/ /iletisim 301`);
redirectLines.push(`/gizlilik/ /gizlilik 301`);

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
    <title>acupoflyrics — şarkı çevirileri</title>
    <link>${SITE}/</link>
    <description>Şarkı sözlerinin hikâyesi ve anlamı, özenli çevirilerle.</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
${feedPosts.map((post) => `    <item>
      <title>${rssEscape(`${post.artist} - ${post.song} ${translationLabel(post, languagesFor(post).translation === "tr" ? "tr" : "en")}`)}</title>
      <link>${SITE}${postPath(post)}</link>
      <guid isPermaLink="true">${SITE}${postPath(post)}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${rssEscape(languagesFor(post).translation === "tr" ? (post.excerpt || `${post.artist} ${post.song} Türkçe çeviri ve orijinal sözler.`) : translationMetaDescription(post))}</description>
    </item>`).join("\n")}
  </channel>
</rss>
`;

await writeFile(path.join(DIST, "sitemap.xml"), sitemap, "utf8");
await writeFile(path.join(DIST, "_redirects"), redirects, "utf8");
await writeFile(path.join(DIST, "feed.xml"), feed, "utf8");
await writeFile(path.join(DIST, "robots.txt"), robots, "utf8");
await writeFile(path.join(ROOT, "public/sitemap.xml"), sitemap, "utf8");
await writeFile(path.join(ROOT, "public/_redirects"), redirects, "utf8");
await writeFile(path.join(ROOT, "public/feed.xml"), feed, "utf8");
await writeFile(path.join(ROOT, "public/robots.txt"), robots, "utf8");

console.log(`Generated static SEO HTML for ${byPath.size} routes.`);
console.log(`Generated sitemap.xml with ${indexableRoutes.length} indexable routes.`);
console.log(`Generated robots.txt, feed.xml and _redirects with ${redirectLines.length} redirect rules.`);
