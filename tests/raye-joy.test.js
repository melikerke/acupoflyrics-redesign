import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { songInsights } from '../src/data/songInsights.js';
import { translationQueue } from '../src/data/editorialFeatures.js';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const slug = 'raye-amma-absolutely-joy-turkce-ceviri';
const matches = JSON.parse(read('src/data/posts.json')).filter(post => post.slug === slug);
const post = matches[0];
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('RAYE, Amma & Absolutely — Joy. preserves submitted lyrics and section pairing', () => {
  assert.equal(matches.length, 1);
  assert.equal(post.blocks.length, 18);
  assert.equal(hash(post.blocks.filter(block => !block.original).map(block => block.lines)), 'adf7d1555543d45f102f23279950e58f97ff3c57038449324227cf881298dd52');
  assert.equal(hash(post.blocks.filter(block => block.original).map(block => block.lines)), '414bd654669be3adf896935882c62b4f7e92811f580911c2604e625e81c88832');
  assert.equal(post.blocks[0].lines.length, 6);
  assert.equal(post.blocks[1].lines.length, 6);
  for (let i = 0; i < post.blocks.length; i += 2) {
    assert.equal(post.blocks[i].original, true);
    assert.equal(post.blocks[i + 1].original, false);
    assert.equal(post.blocks[i].label, post.blocks[i + 1].label);
  }
});

test('RAYE, Amma & Absolutely — Joy. has seventeen reachable notes and all artist credits', () => {
  const keys = Object.keys(post.annotations);
  assert.equal(keys.length, 17);
  const lines = post.blocks.filter(block => !block.original).flatMap(block => block.lines);
  const reachable = new Set(lines.map(line => keys.find(key => line.toLocaleLowerCase().includes(key.toLocaleLowerCase()))));
  for (const key of keys) assert.ok(reachable.has(key), key);
  assert.equal(post.artist, 'RAYE, Amma & Absolutely');
  assert.deepEqual(post.spotify.artists.map(artist => artist.name), ['RAYE', 'Amma', 'Absolutely']);
  assert.equal(post.spotify.track.id, '5CKbUv7zkOdf8X2602qgei');
  assert.equal(post.spotify.albumName, 'THIS MUSIC MAY CONTAIN HOPE.');
  assert.equal(post.spotify.releaseDate, '2026-03-27');
  assert.equal(post.youtubeUrl, 'https://www.youtube.com/watch?v=invZIgVL2wo');
  assert.equal(songInsights[slug].faq.length, 3);
  assert.match(JSON.stringify(post.annotations), /1974/);
  assert.doesNotMatch(JSON.stringify(post.annotations), /google\.com\/s2|images\.openai\.com|\[image\]|\+1/);
  assert.ok(!translationQueue.some(item => /joy\./i.test(JSON.stringify(item))));
});

test('RAYE, Amma & Absolutely — Joy. renders notes, FAQs and individual artist catalog links', () => {
  const html = read(`dist/${slug}/index.html`).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.equal((html.match(/class="seo-translation-note"/g) || []).length, 17);
  assert.ok(html.includes('https://open.spotify.com/track/5CKbUv7zkOdf8X2602qgei'));
  assert.ok(html.includes('https://www.youtube.com/watch?v=invZIgVL2wo'));
  assert.ok(html.includes('Şarkı ne anlatıyor?'));
  assert.ok(html.includes('Melike Erke'));
  assert.ok(read('dist/sitemap-songs.xml').includes(`/${slug}/</loc>`));
  for (const artist of ['raye', 'amma', 'absolutely']) {
    assert.ok(read(`dist/artist/${artist}/index.html`).includes(slug));
  }
  assert.ok(read('dist/album/raye-this-music-may-contain-hope/index.html').includes(slug));
});
