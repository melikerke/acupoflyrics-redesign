import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ORIGIN } from '../src/lib/paths.js';
import { aboutSchema } from '../src/data/aboutContent.js';

test('About profile identifiers use the canonical origin', () => {
  for (const value of [aboutSchema['@id'], aboutSchema.url, aboutSchema.mainEntity['@id'], aboutSchema.mainEntity.url, aboutSchema.mainEntity.image]) {
    assert.equal(new URL(value).origin, ORIGIN);
  }
});

test('built Spanish archive and translations retain sitemap and reciprocal hreflang', async () => {
  const pages = await readFile(new URL('../dist/sitemap-pages.xml', import.meta.url), 'utf8');
  const songs = await readFile(new URL('../dist/sitemap-songs.xml', import.meta.url), 'utf8');
  const entries = JSON.parse(await readFile(new URL('../src/data/translationIndex.json', import.meta.url), 'utf8'));
  assert.ok(pages.includes(`<loc>${ORIGIN}/es</loc>`));
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    assert.ok(songs.includes(`<loc>${ORIGIN}${entry.path}</loc>`));
    for (const route of [entry.path, entry.sourcePath]) {
      const html = await readFile(new URL(`../dist/${route.replace(/^\//, '').replace(/\/$/, '')}/index.html`, import.meta.url), 'utf8');
      assert.ok(html.includes(`hreflang="es" href="${ORIGIN}${entry.path}"`), route);
      assert.ok(html.includes(`hreflang="tr" href="${ORIGIN}${entry.sourcePath}"`), route);
    }
  }
});
