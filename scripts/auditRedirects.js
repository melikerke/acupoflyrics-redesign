import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import middleware from "../middleware.js";
import { legacyAlbumRedirects } from "../server/legacyAlbumRedirects.js";
import { legacyCategoryPathRedirects } from "../server/legacyCategoryPathRedirects.js";
import { legacyCategoryRedirects } from "../server/legacyCategoryRedirects.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.acupoflyrics.com";
const sitemap = await readFile(path.join(ROOT, "dist/sitemap.xml"), "utf8");
const vercel = JSON.parse(await readFile(path.join(ROOT, "vercel.json"), "utf8"));

function normalizePath(value) {
  const url = new URL(value, SITE);
  return url.pathname.replace(/\/+$/, "") || "/";
}

async function builtRoutes(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await builtRoutes(target));
    else if (entry.name === "index.html") {
      const relative = path.relative(path.join(ROOT, "dist"), path.dirname(target)).split(path.sep).join("/");
      output.push(normalizePath(relative ? `/${relative}` : "/"));
    }
  }
  return output;
}

const canonicalUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
const canonicalRoutes = new Set(canonicalUrls.map(normalizePath));
const validBuiltRoutes = new Set(await builtRoutes(path.join(ROOT, "dist")));
const invalidEntries = [];
const missingTargets = [];
for (const [kind, entries] of [
  ["category", legacyCategoryRedirects],
  ["category-path", legacyCategoryPathRedirects],
  ["album", legacyAlbumRedirects],
]) {
  for (const [source, destination] of Object.entries(entries)) {
    if (!source || !destination || destination === "/artist/") invalidEntries.push(`${kind}: ${source} -> ${destination}`);
    if (!validBuiltRoutes.has(normalizePath(destination))) missingTargets.push(`${kind}: ${source} -> ${destination}`);
  }
}

const hijackedCanonicalRoutes = [];
for (const route of canonicalUrls) {
  const response = await middleware(new Request(`${SITE}${route}`));
  if (response.status >= 300 && response.status < 400) {
    hijackedCanonicalRoutes.push(`${route} -> ${response.headers.get("location")}`);
  }
}

const incorrectHierarchicalRedirects = [];
for (const [source, destination] of Object.entries(legacyCategoryPathRedirects)) {
  const response = await middleware(new Request(`${SITE}${source}/`));
  const actual = response.headers.get("location");
  if (response.status !== 308 || normalizePath(actual) !== normalizePath(destination)) {
    incorrectHierarchicalRedirects.push(`${source} -> ${actual || response.status} (beklenen ${destination})`);
  }
}

const unknownCategoryResponse = await middleware(new Request(`${SITE}/category/bilinmeyen-eski-terim/`));
const aliasesWithExtraHop = (vercel.redirects || []).filter((redirect) => (
  /^\/(?:ceviri|song)\/:slug\/?$/.test(redirect.source)
  && !redirect.destination.endsWith("/")
));

const findings = {
  canonicalRoutes: canonicalRoutes.size,
  flatCategoryRedirects: Object.keys(legacyCategoryRedirects).length,
  hierarchicalCategoryRedirects: Object.keys(legacyCategoryPathRedirects).length,
  legacyAlbumRedirects: Object.keys(legacyAlbumRedirects).length,
  invalidEntries: invalidEntries.length,
  missingTargets: missingTargets.length,
  hijackedCanonicalRoutes: hijackedCanonicalRoutes.length,
  incorrectHierarchicalRedirects: incorrectHierarchicalRedirects.length,
  aliasesWithExtraHop: aliasesWithExtraHop.length,
  unknownCategoryIsGone: unknownCategoryResponse.status === 410,
};
console.table(findings);

for (const [label, items] of [
  ["Geçersiz kayıt", invalidEntries],
  ["Eksik hedef", missingTargets],
  ["Ele geçirilen canonical rota", hijackedCanonicalRoutes],
  ["Yanlış hiyerarşik yönlendirme", incorrectHierarchicalRedirects],
  ["Ek hop üreten alias", aliasesWithExtraHop.map((item) => `${item.source} -> ${item.destination}`)],
]) {
  if (!items.length) continue;
  console.error(`\n${label} (${items.length}):`);
  console.error(items.slice(0, 20).join("\n"));
}

if (
  invalidEntries.length
  || missingTargets.length
  || hijackedCanonicalRoutes.length
  || incorrectHierarchicalRedirects.length
  || aliasesWithExtraHop.length
  || unknownCategoryResponse.status !== 410
) process.exitCode = 1;
