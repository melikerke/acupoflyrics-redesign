import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = process.env.ACL_SEO_DIST ? path.resolve(process.env.ACL_SEO_DIST) : path.join(ROOT, "dist");
const manifest = JSON.parse(await readFile(path.join(DIST, ".vite/manifest.json"), "utf8"));

function closure(keys) {
  const visited = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    assert.ok(manifest[key], `Unknown build manifest entry: ${key}`);
    visited.add(key);
    for (const dependency of manifest[key].imports || []) visit(dependency);
  }
  for (const key of keys) visit(key);
  return visited;
}

async function bytesFor(files) {
  const results = await Promise.all([...new Set(files)].map(async (file) => {
    const buffer = await readFile(path.join(DIST, file));
    return { file, bytes: buffer.length, gzipEstimateBytes: gzipSync(buffer).length };
  }));
  return { bytes: results.reduce((sum, item) => sum + item.bytes, 0), gzipEstimateBytes: results.reduce((sum, item) => sum + item.gzipEstimateBytes, 0), files: results };
}

const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
assert.ok(entryKey, "Build entry must exist");
const routes = {
  app: [entryKey],
  home: [entryKey, "src/pages/HomePreview.jsx"],
  song: [entryKey, "src/pages/LyricDetail.jsx"],
  journal: [entryKey, "src/pages/PopGundemiPage.jsx"],
  article: [entryKey, "src/pages/PopGundemiArticlePage.jsx"],
};
const routePayloads = {};
for (const [name, keys] of Object.entries(routes)) {
  const dependencies = closure(keys);
  routePayloads[name] = {
    javascript: await bytesFor([...dependencies].map((key) => manifest[key].file).filter((file) => file.endsWith(".js"))),
    css: await bytesFor([...dependencies].flatMap((key) => manifest[key].css || [])),
  };
}
const homeFiles = new Set(routePayloads.home.javascript.files.map((item) => item.file));
assert.ok(!homeFiles.has(manifest["src/pages/PopGundemiArticlePage.jsx"].file), "Home must not eagerly import complete article bodies");
const html = await readFile(path.join(DIST, "index.html"), "utf8");
assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
assert.doesNotMatch(html, /seo-discovery-search/);
assert.match(html, /<img[^>]+class="seo-home-hero-bg"/);
assert.doesNotMatch(html, /https:\/\/fonts\.(?:googleapis|gstatic)\.com/);
const fontFiles = [...new Set([...html.matchAll(/url\((\/fonts\/[^)]+\.woff2)\)/g)].map((match) => match[1]))];
await Promise.all(fontFiles.map((file) => stat(path.join(DIST, file))));

const assets = await readdir(path.join(DIST, "assets"));
const largestJs = (await bytesFor(assets.filter((file) => file.endsWith(".js")).map((file) => `assets/${file}`))).files
  .sort((a, b) => b.bytes - a.bytes).slice(0, 8);
console.log(JSON.stringify({
  method: "Static build dependency graph. Gzip sizes are local estimates; this is not a network, LCP or Core Web Vitals measurement. Font subsets load on demand and are not included in route totals.",
  routePayloads,
  largestJs,
  localFontSubsets: fontFiles.length,
  checks: "One canonical; original home markup; original decorative hero image; local fonts exist; full article route is excluded from home imports.",
}, null, 2));
