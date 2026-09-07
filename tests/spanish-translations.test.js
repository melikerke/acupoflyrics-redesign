import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import middleware from "../middleware.js";
import { buildSpanishTranslations, parseSpanishSubmission } from "../scripts/lib/spanishTranslations.js";

const read = (file) => readFile(file, "utf8");
const submitted = await read("src/data/translations/es/submitted-2026-09-07.md");
const posts = JSON.parse(await read("src/data/posts.json"));
const entries = buildSpanishTranslations(submitted, posts);
const origin = "https://www.acupoflyrics.com";
const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const htmlFor = (pathname) => read(`dist/${pathname.replace(/^\/+|\/+$/g, "")}/index.html`);

test("all eight submitted songs preserve accents, credits and repeated sections", async () => {
  assert.deepEqual(entries.map((item) => item.song), ["APT.", "Golden", "Die With a Smile", "BIRDS OF A FEATHER", "Ordinary", "WILDFLOWER", "Who", "like JENNIE"]);
  assert.deepEqual(entries.map((item) => item.lineCount), [77, 40, 50, 39, 44, 34, 42, 50]);
  assert.equal(entries[1].vocals, "Voces: EJAE, Audrey Nuna y REI AMI");
  assert.equal(entries[0].sections[0].lines[2], "¡Que empiece el juego!");
  assert.equal(entries[0].sections.filter((part) => part.label === "Estribillo: ROSÉ").length, 2);
  assert.equal(entries[7].sections.at(-1).lines.at(-1), "Es JENNIE, JENNIE, JENNIE, JENNIE");
  for (const item of entries) {
    const output = JSON.parse(await read(`dist/data/translations/es/${item.slug}.json`));
    assert.deepEqual(output, item, `Published content differs for ${item.song}`);
  }
  assert.throws(() => parseSpanishSubmission("**Song — Artist**\n[Verse]\n[Chorus]\nOne line"), /Empty translation section/);
});

test("Spanish HTML contains every section and lyric line before JavaScript runs", async () => {
  for (const item of entries) {
    const html = await htmlFor(item.path);
    assert.match(html, /<html lang="es">/);
    assert.ok(html.includes(`<h1>${escape(item.song)}</h1>`));
    assert.ok(!html.includes('name="robots" content="noindex'));
    for (const [index, section] of item.sections.entries()) {
      const block = `<section id="seccion-${index + 1}" lang="es"><h3>${escape(section.label)}</h3><p>${section.lines.map(escape).join("<br />")}</p></section>`;
      assert.ok(html.includes(block), `Missing or altered section ${index + 1} of ${item.song}`);
    }
    if (item.vocals) assert.ok(html.includes(escape(item.vocals)));
  }
});

test("Turkish and Spanish URLs have self-canonicals and reciprocal language links", async () => {
  const sitemap = await read("dist/sitemap.xml");
  for (const item of entries) {
    for (const [locale, pathname] of [["tr", item.sourcePath], ["es", item.path]]) {
      const html = await htmlFor(pathname);
      assert.ok(html.includes(`<html lang="${locale}">`));
      assert.ok(html.includes(`<link rel="canonical" href="${origin}${pathname}"`));
      assert.ok(html.includes(`<link rel="alternate" hreflang="tr" href="${origin}${item.sourcePath}"`));
      assert.ok(html.includes(`<link rel="alternate" hreflang="es" href="${origin}${item.path}"`));
      assert.ok(sitemap.includes(`<loc>${origin}${pathname}</loc>`));
    }
    const response = middleware(new Request(`${origin}${item.path}`));
    assert.equal(response.headers.get("location"), null, "Spanish URLs must not redirect to Turkish legacy aliases");
  }
});

test("Spanish hub discovers all eight songs and links back through Turkish pages", async () => {
  const hub = await htmlFor("/es");
  assert.match(hub, /<html lang="es">/);
  for (const item of entries) {
    assert.ok(hub.includes(`href="${item.path}"`));
    assert.ok((await htmlFor(item.path)).includes('href="/es"'));
    assert.ok((await htmlFor(item.sourcePath)).includes(`href="${item.path}" lang="es"`));
  }
});

test("unpublished Spanish URLs return 404 instead of redirecting to Turkish", () => {
  for (const pathname of ["/es/missing-song", "/es/rose-bruno-mars-apt-turkce-ceviri", "/es/album/missing"]) {
    const response = middleware(new Request(`${origin}${pathname}`));
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, follow");
    assert.equal(response.headers.get("location"), null);
  }
});

test("Spanish routes load compact metadata and request only the selected lyrics", async () => {
  for (const entry of ["src/pages/SpanishHome.jsx", "src/pages/SpanishTranslationPage.jsx"]) {
    const result = await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "browser", write: false, metafile: true, loader: { ".css": "empty" }, logLevel: "silent" });
    const paths = Object.keys(result.metafile.inputs);
    assert.ok(!paths.some((path) => /data\/(posts|postIndex|homeIndex)\.json$/.test(path)), "No complete Turkish catalog needed on Spanish routes");
    assert.ok(!paths.some((path) => path.includes("submitted-2026-09-07")), "Full lyrics must remain separate from the JavaScript bundle");
  }
  const index = JSON.parse(await read("src/data/translationIndex.json"));
  assert.ok(index.every((item) => !("sections" in item)));
});
