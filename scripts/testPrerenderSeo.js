import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import { completeSeoDescription, normalizeSeoTitle, fitSeoTitle } from "../src/lib/meta.js";
import { MOOD_NAMES, moodsForPost } from "../src/lib/moodClassifier.js";
import { albumCoverage, albumArchiveDescription, artistArchiveSummary } from "../src/lib/catalogRelease.js";
import { moodDescriptions, genreDescriptions } from "../src/lib/collectionDescriptions.js";
import { popGundemiArticles } from "../src/data/popGundemi.js";
import { buildArticleIndex, buildArticleSearchIndex, buildArtistIndex } from "./lib/contentIndexes.js";
import { staticArticleLinks, staticChartsContent } from "./lib/prerenderContent.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const posts = JSON.parse(await readFile(path.join(ROOT, "src/data/posts.json"), "utf8"));
const artists = JSON.parse(await readFile(path.join(ROOT, "src/data/artists.json"), "utf8"));
const scratch = await mkdtemp(path.join(os.tmpdir(), "acl-seo-test-"));
const escapeHtml = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const template = await readFile(path.join(ROOT, "index.html"), "utf8");

function analyticsBootstrap(consent, storageThrows = false) {
  const callbacks = [];
  const inserted = [];
  const window = {
    localStorage: { getItem() { if (storageThrows) throw new Error("Storage unavailable"); return consent; } },
    requestIdleCallback(callback) { callbacks.push(callback); },
    addEventListener(_event, callback) { callbacks.push(callback); },
  };
  const document = {
    readyState: "complete",
    createElement: () => ({}),
    getElementsByTagName: () => [{ parentNode: { insertBefore: (tag) => inserted.push(tag) } }],
  };
  const context = { window, document };
  for (const [, script] of template.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (script.trim()) runInNewContext(script, context);
  }
  return { window, callbacks, inserted };
}

try {
  // A brand name must never select English, and valid short copy stays intact.
  const description = "Çeviri talebi için acupoflyrics ile iletişime geç.";
  assert.equal(completeSeoDescription(description), description);
  assert.equal(completeSeoDescription("Read the story behind this song.", "en"), "Read the story behind this song.");
  assert.match(completeSeoDescription("", "en"), /^Discover/);
  assert.match(completeSeoDescription(""), /^Şarkı/);
  for (const consent of [null, "denied"]) {
    const boot = analyticsBootstrap(consent);
    assert.equal(boot.callbacks.length, 0, "Do not even schedule GTM before consent");
    boot.window.aclLoadAnalytics();
    assert.equal(boot.inserted.length, 0);
    boot.window.__aclAnalyticsConsent = "granted";
    boot.window.aclLoadAnalytics();
    boot.window.aclLoadAnalytics();
    assert.equal(boot.inserted.length, 1, "Acceptance loads GTM once");
  }
  const returning = analyticsBootstrap("granted");
  assert.equal(returning.callbacks.length, 1);
  returning.callbacks[0]();
  assert.equal(returning.inserted.length, 1);
  const revoked = analyticsBootstrap("granted");
  revoked.window.__aclAnalyticsConsent = "denied";
  revoked.callbacks[0]();
  assert.equal(revoked.inserted.length, 0, "Recheck consent after the idle delay");
  assert.equal(analyticsBootstrap(null, true).inserted.length, 0);

  assert.deepEqual(albumCoverage({ tracks: [{ song: "One" }, { song: "Two" }] }), { translated: 2, total: null, missing: null });
  assert.equal(albumCoverage({ totalTracks: 1, tracks: [{ song: "One" }, { song: "Two" }] }).total, null, "Conflicting totals must not imply completion");
  assert.equal(albumCoverage({ totalTracks: 10, tracks: [{ song: "One", spotify: { totalTracks: 12 } }] }).total, null);
  assert.deepEqual(albumCoverage({ totalTracks: 10, tracks: [{ song: "One" }, { song: "One" }] }), { translated: 1, total: 10, missing: 9 });
  assert.match(albumArchiveDescription({ name: "Record", artist: "Artist", tracks: [{ song: "One" }] }), /Bu sayfa arşivde bulunan çevirileri listeler/);

  const articleIndex = buildArticleIndex(popGundemiArticles);
  const articleSearch = buildArticleSearchIndex(popGundemiArticles);
  assert.equal(articleIndex.length, popGundemiArticles.length);
  articleIndex.forEach((entry, index) => {
    const original = popGundemiArticles[index];
    assert.equal(entry.sourceCount, original.sources?.length || 0);
    assert.equal(entry.title, original.title);
    assert.equal(entry.image, original.image);
    assert.equal(entry.sections, undefined);
    assert.equal(entry.sources, undefined);
    for (const section of original.sections || []) {
      for (const paragraph of section.body || []) assert.ok(articleSearch[entry.slug].includes(paragraph));
    }
  });
  assert.ok(JSON.stringify(articleIndex).length < JSON.stringify(popGundemiArticles).length * 0.3, "Cards must not carry complete article bodies");
  const artistIndex = buildArtistIndex(artists, posts);
  const names = new Set(posts.flatMap((post) => post.artist.split(/\s*,\s*/).map((name) => name.trim().toLowerCase())));
  assert.ok(artistIndex.every((artist) => names.has(artist.name.trim().toLowerCase())));
  const chartHtml = staticChartsContent({ lists: [
    { id: "songs", name: "Songs", entries: [{ rank: 1, title: "Same title", artist: "Right artist" }] },
    { id: "billboard-200", name: "Albums", entries: [{ rank: 1, title: "The Album - EP", artist: "Right artist" }] },
  ] }, [
    { slug: "wrong-song", song: "Same title", artist: "Wrong artist" },
    { slug: "right-song", song: "Same title", artist: "Right artist" },
  ], [{ slug: "right-album", name: "The Album", artist: "Right artist" }]);
  assert.ok(chartHtml.includes('href="/right-song/"'));
  assert.ok(chartHtml.includes('href="/album/right-album"'));
  assert.ok(!chartHtml.includes('href="/wrong-song/"'));
  const generated = path.join(scratch, "generated");
  execFileSync(process.execPath, ["scripts/generatePostIndex.js"], {
    cwd: ROOT, env: { ...process.env, ACL_CONTENT_OUTPUT: generated }, stdio: "pipe", timeout: 30000,
  });
  const generatedIndex = JSON.parse(await readFile(path.join(generated, "src/data/postIndex.json"), "utf8"));
  assert.equal(generatedIndex.length, posts.length);
  const lineIndex = JSON.parse(await readFile(path.join(generated, "public/data/search-lines.json"), "utf8"));
  assert.deepEqual(lineIndex.__articles, articleSearch, "Article body search remains available after removing bodies from card bundles");
  assert.ok(posts.every((post) => Array.isArray(lineIndex[post.slug])), "The reserved article map must preserve every song's line search");
  const runtimeFile = path.join(scratch, "runtime.mjs");
  await build({ entryPoints: [path.join(ROOT, "src/lib/content.js")], bundle: true, platform: "node", format: "esm", outfile: runtimeFile,
    plugins: [{ name: "test-generated-index", setup(builder) { builder.onResolve({ filter: /(?:postIndex|artistIndex|popGundemiIndex)\.json$/ }, (args) => ({ path: path.join(generated, "src/data", path.basename(args.path)) })); } }],
  });
  const runtime = await import(pathToFileURL(runtimeFile).href);
  // Keep generated per-song artifacts outside the route-only audit directory.
  await rm(generated, { recursive: true, force: true });

  // Build actual route HTML into an isolated directory; public files stay untouched.
  await writeFile(path.join(scratch, "index.html"), template);
  execFileSync(process.execPath, ["scripts/prerenderSeo.js"], {
    cwd: ROOT, env: { ...process.env, ACL_SEO_DIST: scratch }, stdio: "pipe", timeout: 90000,
  });
  const readRoute = (route) => readFile(path.join(scratch, route, "index.html"), "utf8");
  const albumHtml = await readRoute("albumler");
  const actualAlbumPaths = [...new Set([...albumHtml.matchAll(/href="(\/album\/[^"]+)"/g)].map((match) => match[1]))].sort();
  assert.deepEqual(actualAlbumPaths, runtime.albumIndex.map((album) => `/album/${album.slug}`).sort(), "SSR and app must expose the same entire album path set");
  const decodeHtml = (value) => value.replace(/&quot;/g, '\"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  for (const album of runtime.albumIndex) {
    const html = await readRoute(`album/${album.slug}`);
    assert.equal(decodeHtml(html.match(/<meta name="description" content="([^"]*)"/)[1]), completeSeoDescription(albumArchiveDescription(album)), `${album.slug}: metadata parity`);
    assert.equal(/name="robots" content="noindex/.test(html), album.tracks.length < 2, `${album.slug}: noindex parity`);
    const schema = JSON.parse(html.match(/<script id="apl-structured-data" type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(schema.numTracks, albumCoverage(album).total || undefined, `${album.slug}: factual total track count`);
  }
  for (const meta of runtime.allArtists) {
    const artist = runtime.getArtist(meta.slug);
    if (!artist.count) continue;
    const html = await readRoute(`artist/${artist.slug}`);
    assert.equal(decodeHtml(html.match(/<meta name="description" content="([^"]*)"/)[1]), completeSeoDescription(artistArchiveSummary(artist)), `${artist.slug}: artist archive summary parity`);
  }
  for (const [kind, descriptions, getter, displayName, titleFor] of [
    ["mood", moodDescriptions, runtime.getMood, (name) => name, (name) => `${name} Şarkıları — Mood'a Göre Çeviriler | acupoflyrics`],
    ["genre", genreDescriptions, runtime.getGenre, (name) => name, (name) => `${name} Şarkı Sözleri ve Çevirileri | acupoflyrics`],
  ]) {
    for (const name of Object.keys(descriptions)) {
      const slug = runtime.albumSlugFor(name);
      const collection = getter(slug);
      const html = await readRoute(`${kind}/${slug}`);
      assert.equal(decodeHtml(html.match(/<meta name="description" content="([^"]*)"/)[1]), completeSeoDescription(collection.description), `${kind}/${slug}: description parity`);
      assert.equal(decodeHtml(html.match(/<title>(.*?)<\/title>/)[1]), normalizeSeoTitle(fitSeoTitle([titleFor(name)])), `${kind}/${slug}: title parity`);
      assert.equal(/name="robots" content="noindex/.test(html), !collection.items.length, `${kind}/${slug}: noindex parity`);
      assert.ok(html.includes(`<h1>${escapeHtml(displayName(name))}</h1>`));
      const actual = [...new Set([...html.matchAll(/href="(\/[^"/]+\/)"/g)].map((match) => match[1]))].sort();
      assert.deepEqual(actual, collection.items.map((post) => `/${post.slug}/`).sort(), `${kind}/${slug}: song membership parity`);
      const schema = JSON.parse(html.match(/<script id="apl-structured-data" type="application\/ld\+json">(.*?)<\/script>/s)[1]);
      assert.equal(schema.description, collection.description);
    }
  }
  const beforeRerender = await readRoute("albumler");
  execFileSync(process.execPath, ["scripts/prerenderSeo.js"], { cwd: ROOT, env: { ...process.env, ACL_SEO_DIST: scratch }, stdio: "pipe", timeout: 90000 });
  assert.equal((await readRoute("albumler")).match(/<h1>/g)?.length, 1, "Repeat generation must replace prior route body");
  assert.equal((await readRoute("albumler")).match(/id="seo-prerender-styles"/g)?.length, 1, "Repeat generation must not duplicate styles");
  assert.equal((await readRoute("albumler")).match(/<h1>(.*?)<\/h1>/)[1], beforeRerender.match(/<h1>(.*?)<\/h1>/)[1]);
  const moodsBySlug = new Map(posts.map((post) => [post.slug, moodsForPost(post)]));
  for (const mood of MOOD_NAMES) {
    const html = await readRoute(`mood/${slugify(mood)}`);
    assert.ok(html.includes(`<h1>${escapeHtml(mood)}</h1>`), "Preserve original mood labels and URLs");
    const expected = posts.filter((post) => moodsBySlug.get(post.slug).includes(mood)).map((post) => `/${post.slug}/`).sort();
    const found = [...html.matchAll(/<a\b[^>]*href="(\/[^"/]+\/)"/g)].map((match) => match[1]).sort();
    assert.deepEqual(found, expected, `${mood}: prerender must include the same primary and secondary mood memberships as the app`);
    assert.equal(/name="robots" content="noindex/.test(html), expected.length === 0);
  }
  for (const route of ["hakkimizda", "iletisim", "gizlilik", "listeler"]) {
    const html = await readRoute(route);
    assert.match(html, /<h1[ >]/, `${route} needs a visible heading before JS`);
    assert.match(html, /<p[ >]/, `${route} needs initial content`);
    assert.doesNotMatch(html, /Explore every song/);
  }
  const sitemap = await readFile(path.join(scratch, "sitemap.xml"), "utf8");
  for (const route of ["search", "admin"]) {
    assert.match(await readRoute(route), /name="robots" content="noindex, follow"/);
    assert.ok(!sitemap.includes(`<loc>https://www.acupoflyrics.com/${route}</loc>`));
  }
  for (const article of popGundemiArticles) {
    const html = await readRoute(`pop-gunlugu/${article.slug}`);
    for (const slug of article.relatedTranslations || []) {
      if (posts.some((post) => post.slug === slug)) assert.ok(html.includes(`href="/${escapeHtml(slug)}/"`));
    }
    for (const source of article.sources || []) {
      assert.ok(html.includes(`href="${escapeHtml(new URL(source.url).href)}"`), `${article.slug} missing source link`);
    }
  }
  const untrusted = staticArticleLinks({ sources: [{ name: "<script>bad</script>", url: "javascript:alert(1)" }] }, []);
  assert.ok(!untrusted.includes("javascript:"));
  assert.ok(!untrusted.includes("<script>"));
  execFileSync(process.execPath, ["scripts/auditSeoBuild.js"], {
    cwd: ROOT, env: { ...process.env, ACL_SEO_DIST: scratch }, stdio: "pipe", timeout: 30000,
  });
  console.log(`SEO regressions passed: ${MOOD_NAMES.length} mood collections, ${popGundemiArticles.length} article link sets, support pages, private routes, compact indexes and generated-site link audit.`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
