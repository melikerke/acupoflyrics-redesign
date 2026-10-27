import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { songInsights } from '../src/data/songInsights.js';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const slug = 'babymonster-deserve-turkce-ceviri';
const matches = JSON.parse(read('src/data/posts.json')).filter(post => post.slug === slug);
const post = matches[0];
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('BABYMONSTER — DESERVE preserves submitted translation and aligned member sections', () => {
  assert.equal(matches.length, 1);
  assert.equal(post.blocks.length, 28);
  assert.equal(hash(post.blocks.filter(block => !block.original).map(block => block.lines)), '83e9ff23807c8fa1246f44b524202abb60a6b54779fa0ff2ecf8e43df13c3eda');
  assert.equal(hash(post.originalScriptBlocks), '0b873da8f1a6536033aa590f9ebb7aecf8ace78260a4b4285016e0c9da47b789');
  for (let i = 0; i < post.blocks.length; i += 2) {
    assert.equal(post.blocks[i].original, true);
    assert.equal(post.blocks[i + 1].original, false);
    assert.equal(post.blocks[i].label, post.blocks[i + 1].label);
    assert.doesNotMatch(post.blocks[i].lines.join('\n'), /[가-힣]/);
  }
  assert.match(post.blocks[0].lines.join('\n'), /oraenmaniya jal jinaen geoni/);
  for (const label of ['2. Verse: Ruka', '2. Verse: Asa', 'Köprü: Chiquita', 'Köprü: Pharita', 'Köprü: Ahyeon']) {
    assert.ok(post.blocks.some(block => block.label === label));
  }
});

test('BABYMONSTER — DESERVE has fifteen reachable notes and verified media metadata', () => {
  const keys = Object.keys(post.annotations);
  assert.equal(keys.length, 15);
  const lines = post.blocks.filter(block => !block.original).flatMap(block => block.lines);
  const reachable = new Set(lines.map(line => keys.find(key => line.toLocaleLowerCase().includes(key.toLocaleLowerCase()))));
  for (const key of keys) assert.ok(reachable.has(key), key);
  assert.equal(post.spotify.track.id, '7It5Iy4mnJWMhESt7qfipt');
  assert.equal(post.spotify.albumName, 'DESERVE');
  assert.equal(post.spotify.releaseDate, '2026-10-23');
  assert.equal(post.youtubeUrl, 'https://www.youtube.com/watch?v=oC6brLXQe4I');
  assert.ok(post.genres.includes('ballad') && post.moods.includes('Breakup'));
  assert.equal(songInsights[slug].faq.length, 3);
  assert.doesNotMatch(JSON.stringify(post.annotations), /google\.com\/s2|images\.openai\.com|\[image\]|\+1/);
});

test('BABYMONSTER — DESERVE has notes, FAQs, media and catalog links in first HTML', () => {
  const html = read(`dist/${slug}/index.html`).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.equal((html.match(/class="seo-translation-note"/g) || []).length, 15);
  assert.ok(html.includes('https://open.spotify.com/track/7It5Iy4mnJWMhESt7qfipt'));
  assert.ok(html.includes('https://www.youtube.com/watch?v=oC6brLXQe4I'));
  assert.ok(html.includes('Şarkı ne anlatıyor?'));
  assert.ok(html.includes('Melike Erke'));
  assert.ok(read('dist/sitemap-songs.xml').includes(`/${slug}/</loc>`));
  assert.ok(read('dist/artist/babymonster/index.html').includes(slug));
  assert.ok(read('dist/album/babymonster-deserve/index.html').includes(slug));
});
